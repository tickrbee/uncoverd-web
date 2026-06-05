#!/usr/bin/env tsx
/**
 * One-shot historical-price backfill. Re-fetches a window of daily EOD bars
 * (default 2 years) for every active stock and upserts close+volume into
 * backend.historical_prices_stocks — refilling holes and re-propagating splits.
 *
 * WHY a local script (not an edge function): the per-symbol fetch+parse over the
 * ~65k-symbol universe blows the Supabase edge worker CPU/resource limit (a
 * batch of even ~1,200 symbols returns 546 WORKER_RESOURCE_LIMIT), and pg_net
 * only dispatches one held connection at a time. Running locally has no such
 * limits and finishes the whole universe in ~20-40 min. The daily
 * refresh-recent-prices cron keeps NEW bars current, so this is mainly a
 * backlog/one-off (re-run if splits need re-propagating).
 *
 * Env auto-loaded from .env.local then .env (name variants accepted).
 *   pnpm backfill:prices
 * Required: Supabase URL + SERVICE-ROLE key + FMP_API_KEY.
 * Knobs (env): BACKFILL_YEARS (2), BACKFILL_CONCURRENCY (14),
 *   BACKFILL_SCOPE (stocks|etfs|all, default stocks), BACKFILL_LIMIT (cap symbols,
 *   for testing), BACKFILL_SINCE (only re-fetch symbols whose max bar < this ISO
 *   date — skips already-current names; unset = all).
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadEnvFiles();

function pickEnv(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const SUPABASE_URL = pickEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "VITE_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"]);
const SUPABASE_KEY = pickEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY"]);
const FMP_KEY = pickEnv(["FMP_API_KEY", "VITE_FMP_API_KEY", "FMP_KEY"]);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase URL or service-role key in .env.local/.env");
  process.exit(1);
}
if (!FMP_KEY) {
  console.error("Missing FMP_API_KEY in .env.local/.env");
  process.exit(1);
}

const YEARS = Math.max(1, Number(process.env.BACKFILL_YEARS ?? 2));
const CONCURRENCY = Math.max(1, Number(process.env.BACKFILL_CONCURRENCY ?? 14));
const SCOPE = (process.env.BACKFILL_SCOPE ?? "stocks").toLowerCase();
const CAP = process.env.BACKFILL_LIMIT ? Number(process.env.BACKFILL_LIMIT) : Infinity;
const SINCE = process.env.BACKFILL_SINCE ?? null;

const FMP_STABLE = "https://financialmodelingprep.com/stable";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: "backend" as "public" },
  auth: { persistSession: false },
});

const fromIso = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - YEARS);
  return d.toISOString().slice(0, 10);
})();
const toIso = new Date().toISOString().slice(0, 10);

async function loadSymbols(): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    let q = sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .gt("price", 0)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (SCOPE === "etfs") q = q.or("is_etf.eq.true,is_fund.eq.true");
    else if (SCOPE === "stocks") q = q.eq("is_etf", false).eq("is_fund", false);
    const { data, error } = await q;
    if (error) throw new Error(`ticker load: ${error.message}`);
    const rows = (data ?? []) as { symbol: string }[];
    for (const r of rows) out.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (out.length >= CAP) break;
  }
  return out.slice(0, Number.isFinite(CAP) ? CAP : undefined);
}

type Bar = { symbol: string; date: string; close: number; volume: number | null };

async function fetchSymbol(sym: string): Promise<Bar[]> {
  const url = `${FMP_STABLE}/historical-price-eod/light?symbol=${encodeURIComponent(sym)}&from=${fromIso}&to=${toIso}&apikey=${FMP_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ date?: string; price?: number; volume?: number }>;
  if (!Array.isArray(rows)) return [];
  const out: Bar[] = [];
  for (const r of rows) {
    if (!r.date || r.price == null) continue;
    out.push({ symbol: sym, date: r.date, close: r.price, volume: r.volume != null ? Math.round(r.volume) : null });
  }
  return out;
}

async function upsert(rows: Bar[]): Promise<number> {
  if (!rows.length) return 0;
  const { error } = await sb.from("historical_prices_stocks").upsert(rows, { onConflict: "symbol,date" });
  if (error) throw new Error(error.message);
  return rows.length;
}

async function main() {
  console.log(`[backfill] loading ${SCOPE} symbols…`);
  const symbols = await loadSymbols();
  console.log(`[backfill] ${symbols.length} symbols · window ${fromIso}..${toIso} · concurrency ${CONCURRENCY}${SINCE ? ` · since<${SINCE}` : ""}`);

  let next = 0;
  let done = 0;
  let bars = 0;
  let failed = 0;
  const started = Date.now();

  async function worker() {
    let buffer: Bar[] = [];
    const flush = async () => {
      if (!buffer.length) return;
      try {
        bars += await upsert(buffer);
      } catch (e) {
        failed++;
        if (failed <= 5) console.error(`[backfill] upsert error: ${String(e)}`);
      }
      buffer = [];
    };
    while (next < symbols.length) {
      const sym = symbols[next++];
      try {
        if (SINCE) {
          const { data } = await sb
            .from("historical_prices_stocks")
            .select("date")
            .eq("symbol", sym)
            .order("date", { ascending: false })
            .limit(1);
          const last = (data?.[0] as { date?: string } | undefined)?.date;
          if (last && last >= SINCE) {
            done++;
            continue;
          }
        }
        const rows = await fetchSymbol(sym);
        buffer.push(...rows);
        if (buffer.length >= 2000) await flush();
      } catch (e) {
        failed++;
        if (failed <= 5) console.error(`[backfill] ${sym}: ${String(e)}`);
      }
      done++;
      if (done % 1000 === 0) {
        const rate = done / ((Date.now() - started) / 1000);
        const eta = Math.round((symbols.length - done) / rate / 60);
        console.log(`[backfill] ${done}/${symbols.length} · ${bars} bars · ${rate.toFixed(0)}/s · ETA ~${eta}m`);
      }
    }
    await flush();
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, () => worker()));

  console.log(`[backfill] DONE · ${done} symbols · ${bars} bars upserted · ${failed} failures · ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

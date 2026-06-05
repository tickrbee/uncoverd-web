// @ts-nocheck
// Supabase Edge Function: backfill-prices
//
// Re-fetches a window of daily EOD bars (default 2 years) for a CONTIGUOUS BATCH
// of active tickers and upserts close+volume into backend.historical_prices_stocks
// — refilling holes and re-propagating split adjustments.
//
// WHY this exists (vs refresh-fmp-data's daily price refresh):
//   - `stage=prices` patches only the LAST 7 DAYS, ordered by SHARE volume, so
//     low-share-volume names fall past the 150s timeout and accumulate holes:
//     high-priced US stocks (e.g. TDG ~$1,300 → few shares traded), ADRs (SBS),
//     and foreign lines (EXA.PA). They went un-refreshed Dec 2025–May 2026.
//   - `refresh-recent-prices` (batch-quote) keeps every symbol's LAST bar current
//     but never backfills the gap behind it.
//
// BATCHING: a whole-universe shard (~2,700 symbols) hits the edge worker
// WORKER_RESOURCE_LIMIT (546). So each invocation processes ONE offset..offset+limit
// slice (symbol-ordered) — loaded with a single range() query (no full-list scan)
// — and a per-minute pg_cron tick advances the offset (backend.backfill_cursor).
//
// Params: ?offset=N&limit=M (default 500) & ?years=Y (2) & ?scope=stocks|etfs|all.
// Idempotent (upsert on symbol,date); only writes close+volume. Inline-await,
// returns 200 — the worker keeps running past the 5s pg_net timeout, but the
// TRIGGER must hold the connection (timeout_milliseconds >= batch runtime) so the
// worker isn't torn down before it writes.

import { createClient } from "npm:@supabase/supabase-js@2";

const FMP_STABLE = "https://financialmodelingprep.com/stable";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "backend" },
});

async function run(offset, limit, scope, years) {
  let q = sb
    .from("tickers")
    .select("symbol")
    .eq("is_actively_trading", true)
    .gt("price", 0)
    .order("symbol", { ascending: true })
    .range(offset, offset + limit - 1);
  if (scope === "etfs") q = q.or("is_etf.eq.true,is_fund.eq.true");
  else if (scope === "stocks") q = q.eq("is_etf", false).eq("is_fund", false);
  const { data, error } = await q;
  if (error) throw new Error(`ticker load: ${error.message}`);
  const subset = (data ?? []).map((r) => r.symbol);

  const CONCURRENCY = 8;
  let next = 0;
  let inserted = 0;
  let processed = 0;
  const errors = [];

  const from = new Date();
  from.setFullYear(from.getFullYear() - years);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = new Date().toISOString().slice(0, 10);

  async function worker() {
    let buffer = [];
    const flush = async () => {
      if (!buffer.length) return;
      const seen = new Set();
      const dedup = [];
      for (const r of buffer) {
        const k = `${r.symbol}|${r.date}`;
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(r);
      }
      buffer = [];
      const { error } = await sb
        .from("historical_prices_stocks")
        .upsert(dedup, { onConflict: "symbol,date" });
      if (error) errors.push(error.message);
      else inserted += dedup.length;
    };
    while (next < subset.length) {
      const sym = subset[next++];
      try {
        const res = await fetch(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${encodeURIComponent(sym)}&from=${fromIso}&to=${toIso}&apikey=${FMP_API_KEY}`,
        );
        processed++;
        if (!res.ok) continue;
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const r of rows) {
          if (!r.date || r.price == null) continue;
          buffer.push({
            symbol: sym,
            date: r.date,
            close: r.price,
            volume: r.volume != null ? Math.round(r.volume) : null,
          });
        }
        if (buffer.length >= 500) await flush();
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
    await flush();
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return { offset, limit, symbols: subset.length, processed, barsUpserted: inserted, errors: errors.slice(0, 3) };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(req.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("limit") ?? "500", 10) || 500));
  const years = Math.max(1, parseInt(url.searchParams.get("years") ?? "2", 10) || 2);
  const scope = url.searchParams.get("scope") ?? "stocks";

  const startedAt = Date.now();
  try {
    const result = await run(offset, limit, scope, years);
    console.log(`[backfill-prices] offset ${offset} (+${limit}) done in ${Date.now() - startedAt}ms`, JSON.stringify(result));
    return new Response(
      JSON.stringify({ ok: true, scope, years, ...result, ms: Date.now() - startedAt }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[backfill-prices] offset ${offset} failed`, String(e));
    return new Response(JSON.stringify({ ok: false, offset, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

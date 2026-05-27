// @ts-nocheck
// Supabase Edge Function: backfill-symbol-details
//
// One-shot backfill for symbols recently added by `refresh-fmp-data`'s
// syncStockList step. Pulls:
//   - /dividends?symbol=X  → backend.dividends (full history)
//   - /ratios?symbol=X     → backend.ratios_annual (last 5 years)
//   - /key-metrics?symbol=X → backend.key_metrics_annual (last 5 years)
//
// Heavy — sharded via `?shards=N&shard=M`. Process only symbols missing
// rows in backend.dividends so re-runs don't redo work.
//
// Deploy: supabase functions deploy backfill-symbol-details --no-verify-jwt
// Invoke: curl -X POST "https://<ref>.supabase.co/functions/v1/backfill-symbol-details?shards=10&shard=0" \
//             -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FMP_STABLE = "https://financialmodelingprep.com/stable";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "backend" },
});

async function fmp<T>(path: string): Promise<T | null> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${FMP_STABLE}${path}${sep}apikey=${FMP_API_KEY}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function shardSlice<T>(arr: T[], shard: number, shards: number): T[] {
  if (shards <= 1) return arr;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) if (i % shards === shard) out.push(arr[i]);
  return out;
}

// Pick symbols that:
//  - are active and not ETFs (ETFs use their own dividend stream)
//  - have no rows in backend.dividends (i.e. never been backfilled)
//  - are listed in US (focus the costliest backfill on the most-visited names)
async function pickCandidates(limit = 50000): Promise<string[]> {
  // Get all symbols active + US + non-ETF
  const all: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .eq("is_etf", false)
      .eq("country", "US")
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) all.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (all.length >= limit) break;
  }

  // Find symbols that ALREADY have dividend rows (anything historical)
  const have = new Set<string>();
  for (let i = 0; i < all.length; i += 500) {
    const slice = all.slice(i, i + 500);
    const { data } = await sb.from("dividends").select("symbol").in("symbol", slice);
    for (const r of (data as { symbol: string }[]) ?? []) have.add(r.symbol);
  }

  return all.filter((s) => !have.has(s));
}

type DividendItem = {
  symbol: string;
  date: string;
  recordDate?: string;
  paymentDate?: string;
  declarationDate?: string;
  dividend: number;
  adjDividend?: number;
  yield?: number;
  frequency?: string;
};

async function backfillSymbol(symbol: string): Promise<{
  symbol: string;
  divs: number;
  ratios: number;
  metrics: number;
}> {
  const out = { symbol, divs: 0, ratios: 0, metrics: 0 };

  // --- 1) Dividend history ---
  try {
    const divs = await fmp<DividendItem[]>(`/dividends?symbol=${encodeURIComponent(symbol)}`);
    if (Array.isArray(divs) && divs.length > 0) {
      // Dedupe by (symbol,date) — FMP can return same date twice
      const dedup = new Map<string, DividendItem>();
      for (const d of divs) {
        if (!d.symbol || !d.date) continue;
        dedup.set(`${d.symbol}|${d.date}`, d);
      }
      const rows = Array.from(dedup.values()).map((d) => ({
        symbol: d.symbol,
        date: d.date,
        record_date: d.recordDate || null,
        payment_date: d.paymentDate || null,
        declaration_date: d.declarationDate || null,
        dividend: d.dividend,
        adj_dividend: d.adjDividend ?? d.dividend,
        yield: d.yield ?? null,
        frequency: d.frequency ?? null,
        timestamp: new Date().toISOString(),
      }));
      // Upsert in chunks of 200
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error } = await sb.from("dividends").upsert(batch, { onConflict: "symbol,date" });
        if (!error) out.divs += batch.length;
      }
    }
  } catch {}

  // --- 2) Ratios annual (last 5 years) ---
  try {
    type Ratio = {
      symbol: string;
      date: string;
      fiscalYear?: string;
      period?: string;
      reportedCurrency?: string;
      priceToEarningsRatio?: number;
      priceToBookRatio?: number;
      dividendPayoutRatio?: number;
      dividendYield?: number;
      dividendYieldPercentage?: number;
      dividendPerShare?: number;
      debtToEquityRatio?: number;
      grossProfitMargin?: number;
      netProfitMargin?: number;
    };
    const ratios = await fmp<Ratio[]>(`/ratios?symbol=${encodeURIComponent(symbol)}&limit=5`);
    if (Array.isArray(ratios) && ratios.length > 0) {
      const rows = ratios
        .filter((r) => r.symbol && r.date)
        .map((r) => ({
          symbol: r.symbol,
          date: r.date,
          fiscal_year: r.fiscalYear ?? null,
          period: r.period ?? null,
          reported_currency: r.reportedCurrency ?? null,
          price_to_earnings_ratio: r.priceToEarningsRatio ?? null,
          price_to_book_ratio: r.priceToBookRatio ?? null,
          dividend_payout_ratio: r.dividendPayoutRatio ?? null,
          dividend_yield: r.dividendYield ?? null,
          dividend_yield_percentage: r.dividendYieldPercentage ?? null,
          dividend_per_share: r.dividendPerShare ?? null,
          debt_to_equity_ratio: r.debtToEquityRatio ?? null,
          gross_profit_margin: r.grossProfitMargin ?? null,
          net_profit_margin: r.netProfitMargin ?? null,
          created_at: new Date().toISOString(),
        }));
      const { error } = await sb.from("ratios_annual").upsert(rows, { onConflict: "symbol,date" });
      if (!error) out.ratios = rows.length;
    }
  } catch {}

  // --- 3) Key metrics annual (last 5 years) ---
  try {
    type KM = {
      symbol: string;
      date: string;
      fiscalYear?: string;
      period?: string;
      marketCap?: number;
      enterpriseValue?: number;
      netDebtToEBITDA?: number;
      returnOnEquity?: number;
      freeCashFlowYield?: number;
    };
    const km = await fmp<KM[]>(`/key-metrics?symbol=${encodeURIComponent(symbol)}&limit=5`);
    if (Array.isArray(km) && km.length > 0) {
      const rows = km
        .filter((r) => r.symbol && r.date)
        .map((r) => ({
          symbol: r.symbol,
          date: r.date,
          fiscal_year: r.fiscalYear ?? null,
          period: r.period ?? null,
          market_cap: r.marketCap ?? null,
          enterprise_value: r.enterpriseValue ?? null,
          net_debt_to_ebitda: r.netDebtToEBITDA ?? null,
          return_on_equity: r.returnOnEquity ?? null,
          free_cash_flow_yield: r.freeCashFlowYield ?? null,
          created_at: new Date().toISOString(),
        }));
      const { error } = await sb.from("key_metrics_annual").upsert(rows, { onConflict: "symbol,date" });
      if (!error) out.metrics = rows.length;
    }
  } catch {}

  return out;
}

serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const url = new URL(req.url);
    const shard = Math.max(0, parseInt(url.searchParams.get("shard") ?? "0", 10) || 0);
    const shards = Math.max(1, parseInt(url.searchParams.get("shards") ?? "1", 10) || 1);
    const max = Math.max(1, parseInt(url.searchParams.get("max") ?? "200", 10) || 200);

    const startedAt = Date.now();
    const candidates = await pickCandidates(20000);
    const subset = shardSlice(candidates, shard, shards).slice(0, max);

    // Concurrency 6 — each symbol does up to 3 FMP calls + 3 upserts
    const CONCURRENCY = 6;
    let next = 0;
    const stats = { divs: 0, ratios: 0, metrics: 0, symbols: 0 };
    async function worker() {
      while (next < subset.length) {
        const idx = next++;
        const sym = subset[idx];
        const r = await backfillSymbol(sym);
        stats.divs += r.divs;
        stats.ratios += r.ratios;
        stats.metrics += r.metrics;
        stats.symbols += 1;
      }
    }
    const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
    await Promise.all(workers);

    return new Response(
      JSON.stringify({
        ok: true,
        ms: Date.now() - startedAt,
        shard,
        shards,
        candidatesTotal: candidates.length,
        processed: subset.length,
        ...stats,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});

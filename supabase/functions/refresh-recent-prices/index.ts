// @ts-nocheck
// Supabase Edge Function: refresh-recent-prices
//
// Appends the last ~10 days of daily EOD bars into backend.historical_prices_stocks
// for active tickers, HIGHEST-VOLUME FIRST so the symbols people actually view
// (AAPL, MSFT, SCHD, VYM, …) are always refreshed within the 150s edge timeout;
// the obscure long tail can lag.
//
// WHY THIS EXISTS: the big `refresh-fmp-data` function has this logic under its
// `stage=prices` branch, but the daily cron only calls it with `stage=all`,
// which runs quotes/dividends/news/etfs and NOT prices — so chart history was
// never on a schedule (live `tickers.price` updated, but `historical_prices_stocks`
// went stale). This standalone job is what the cron schedules, isolated so a
// change here can't break the quote/dividend/news pipeline.
//
// Sharded: ?shard=N&shards=M. Volume-ordering + round-robin sharding means the
// top (shards × ~3000) symbols by volume are covered each run.
//
// Manual: curl -X POST ".../functions/v1/refresh-recent-prices?shards=4&shard=0" \
//            -H "Authorization: Bearer $SERVICE_ROLE_KEY"

import { createClient } from "npm:@supabase/supabase-js@2";

const FMP_STABLE = "https://financialmodelingprep.com/stable";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "backend" },
});

function shardSlice<T>(arr: T[], shard: number, shards: number): T[] {
  if (shards <= 1) return arr;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i % shards === shard) out.push(arr[i]);
  }
  return out;
}

async function refreshRecentPrices(shard: number, shards: number, days: number) {
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      // Most-traded first → the symbols users view are always covered within
      // the timeout. Secondary sort on symbol keeps range() paging stable.
      .order("volume", { ascending: false, nullsFirst: false })
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  type EodRow = { symbol?: string; date: string; price: number; volume?: number };
  const CONCURRENCY = 6;
  let next = 0;
  let inserted = 0;
  let symbolsProcessed = 0;
  const errors: string[] = [];

  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = new Date().toISOString().slice(0, 10);

  async function worker() {
    const buffer: Array<Record<string, unknown>> = [];
    const flush = async () => {
      if (buffer.length === 0) return;
      const batch = buffer.splice(0);
      const { error } = await sb
        .from("historical_prices_stocks")
        .upsert(batch, { onConflict: "symbol,date" });
      if (error) errors.push(error.message);
      else inserted += batch.length;
    };
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const res = await fetch(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${encodeURIComponent(sym)}&from=${fromIso}&to=${toIso}&apikey=${FMP_API_KEY}`,
        );
        symbolsProcessed++;
        if (!res.ok) continue;
        const rows = (await res.json()) as EodRow[];
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

  return {
    pricesInserted: inserted,
    symbolsProcessed,
    shardSize: subset.length,
    totalSymbols: candidates.length,
    errors: errors.slice(0, 3),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const url = new URL(req.url);
    const shard = Math.max(0, parseInt(url.searchParams.get("shard") ?? "0", 10) || 0);
    const shards = Math.max(1, parseInt(url.searchParams.get("shards") ?? "1", 10) || 1);
    const days = Math.max(2, parseInt(url.searchParams.get("days") ?? "10", 10) || 10);

    const startedAt = Date.now();
    const result = await refreshRecentPrices(shard, shards, days);
    return new Response(JSON.stringify({ ok: true, shard, shards, days, ...result, ms: Date.now() - startedAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

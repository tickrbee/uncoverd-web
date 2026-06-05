// @ts-nocheck
// Supabase Edge Function: backfill-prices
//
// Re-fetches a window of daily EOD bars (default 2 years) for active tickers and
// upserts close+volume into backend.historical_prices_stocks — refilling any
// holes and re-propagating split adjustments.
//
// WHY this exists separately from refresh-fmp-data's daily price refresh:
//   - `stage=prices` patches only the LAST 7 DAYS, ordered by SHARE volume, so
//     low-share-volume names fall past the 150s timeout and accumulate holes:
//     high-priced US stocks (e.g. TDG ~$1,300 → few shares traded), ADRs (SBS),
//     and foreign lines (EXA.PA). They went un-refreshed Dec 2025–May 2026.
//   - `refresh-recent-prices` (batch-quote) keeps every symbol's LAST bar current
//     but never backfills the gap behind it.
// This walks every symbol symbol-ordered (fair, not volume-ordered) and refetches
// the whole window, so the buried tail gets its history filled and kept healed.
//
// Sharded for the 150s edge timeout: ?shards=M&shard=N (each shard must finish
// inside 150s, so size shards so ~total/shards <= ~3k symbols at CONCURRENCY=8).
// ?years=N window (default 2), ?scope=stocks|etfs|all (default stocks).
// Idempotent (upsert on symbol,date). Only writes close+volume; leaves any
// existing open/high/low/dividends/change_percent untouched.
//
// Manual: curl -X POST ".../functions/v1/backfill-prices?shards=24&shard=0" \
//            -H "Authorization: Bearer $SERVICE_ROLE_KEY"

import { createClient } from "npm:@supabase/supabase-js@2";

const FMP_STABLE = "https://financialmodelingprep.com/stable";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "backend" },
});

function shardSlice(arr, shard, shards) {
  if (shards <= 1) return arr;
  const out = [];
  for (let i = 0; i < arr.length; i++) if (i % shards === shard) out.push(arr[i]);
  return out;
}

async function run(shard, shards, scope, years) {
  const candidates = [];
  let offset = 0;
  while (true) {
    let q = sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .gt("price", 0)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (scope === "etfs") q = q.or("is_etf.eq.true,is_fund.eq.true");
    else if (scope === "stocks") q = q.eq("is_etf", false).eq("is_fund", false);
    const { data, error } = await q;
    if (error || !data) break;
    for (const r of data) candidates.push(r.symbol);
    if (data.length < 1000) break;
    offset += 1000;
    if (offset > 300000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  // years<=2 is ~250-500 rows/symbol, so 8 concurrent fetches stay well under
  // the worker memory ceiling (we also flush at 500 buffered rows).
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

  return {
    barsUpserted: inserted,
    symbols: subset.length,
    processed,
    total: candidates.length,
    errors: errors.slice(0, 3),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const url = new URL(req.url);
  const shard = Math.max(0, parseInt(url.searchParams.get("shard") ?? "0", 10) || 0);
  const shards = Math.max(1, parseInt(url.searchParams.get("shards") ?? "1", 10) || 1);
  const years = Math.max(1, parseInt(url.searchParams.get("years") ?? "2", 10) || 2);
  const scope = url.searchParams.get("scope") ?? "stocks";

  // Inline await (the pattern proven by refresh-recent-prices / refresh-fmp-data):
  // the work runs ~100-140s, longer than the 5s pg_net trigger timeout, but the
  // edge worker keeps running after the client disconnects and finishes writing.
  // Size shards so each finishes inside the ~150s wall-clock limit.
  const startedAt = Date.now();
  try {
    const result = await run(shard, shards, scope, years);
    console.log(`[backfill-prices] shard ${shard}/${shards} done in ${Date.now() - startedAt}ms`, JSON.stringify(result));
    return new Response(
      JSON.stringify({ ok: true, shard, shards, years, scope, ...result, ms: Date.now() - startedAt }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[backfill-prices] shard ${shard}/${shards} failed`, String(e));
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

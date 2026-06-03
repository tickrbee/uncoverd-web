// @ts-nocheck
// Supabase Edge Function: refresh-recent-prices
//
// Appends a CURRENT daily bar into backend.historical_prices_stocks for EVERY
// active ticker (stocks, ETFs, funds), using FMP /batch-quote — 100 symbols per
// call — so every chart's last point stays current, not just high-volume names.
//
// WHY batch-quote (not per-symbol history): per-symbol /historical-price-eod
// calls are one request each, so within the 150s edge timeout only a few
// thousand symbols get refreshed and the long tail (low-volume names like AIV)
// never updates — its chart sits stale. /batch-quote covers the whole ~80k
// universe in ~30-60s, giving every symbol a fresh bar daily.
//
// Sharded: ?shard=N&shards=M (optional — one shard already covers everything).
// Manual: curl -X POST ".../functions/v1/refresh-recent-prices" \
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

async function run(shard, shards) {
  // Every active ticker — no volume floor, so the long tail is covered too.
  const symbols = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    for (const r of data) symbols.push(r.symbol);
    if (data.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(symbols, shard, shards);

  const chunks = [];
  for (let i = 0; i < subset.length; i += 100) chunks.push(subset.slice(i, i + 100));

  const CONCURRENCY = 10;
  let next = 0;
  let inserted = 0;
  const errors = [];
  const todayIso = new Date().toISOString().slice(0, 10);

  async function worker() {
    while (next < chunks.length) {
      const idx = next++;
      const chunk = chunks[idx];
      try {
        const res = await fetch(`${FMP_STABLE}/batch-quote?symbols=${chunk.join(",")}&apikey=${FMP_API_KEY}`);
        if (!res.ok) continue;
        const quotes = await res.json();
        if (!Array.isArray(quotes) || quotes.length === 0) continue;
        const rows = [];
        const seen = new Set();
        for (const q of quotes) {
          if (!q.symbol || q.price == null) continue;
          // Prefer the quote's own timestamp (the actual trading day); fall back
          // to today's date if FMP doesn't send one.
          let d = todayIso;
          if (q.timestamp) {
            const dt = new Date(q.timestamp * 1000);
            if (!isNaN(dt.getTime())) d = dt.toISOString().slice(0, 10);
          }
          const key = `${q.symbol}|${d}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            symbol: q.symbol,
            date: d,
            close: q.price,
            volume: q.volume != null ? Math.round(q.volume) : null,
          });
        }
        if (rows.length) {
          const { error } = await sb
            .from("historical_prices_stocks")
            .upsert(rows, { onConflict: "symbol,date" });
          if (error) errors.push(error.message);
          else inserted += rows.length;
        }
      } catch (e) {
        errors.push(String(e));
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker());
  await Promise.all(workers);

  return { barsUpserted: inserted, symbols: subset.length, chunks: chunks.length, errors: errors.slice(0, 3) };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const url = new URL(req.url);
    const shard = Math.max(0, parseInt(url.searchParams.get("shard") ?? "0", 10) || 0);
    const shards = Math.max(1, parseInt(url.searchParams.get("shards") ?? "1", 10) || 1);
    const startedAt = Date.now();
    const result = await run(shard, shards);
    return new Response(JSON.stringify({ ok: true, shard, shards, ...result, ms: Date.now() - startedAt }), {
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

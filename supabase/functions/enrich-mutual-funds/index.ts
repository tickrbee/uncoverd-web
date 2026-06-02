// @ts-nocheck
// Supabase Edge Function (Deno) — ONE-OFF backfill for mis-flagged mutual funds.
//
// Mutual funds (5-letter …X symbols like VITSX/VSMPX) were mis-flagged as plain
// stocks in backend.tickers and never enriched. This fetches FMP /etf/info,
// populates the fund fields, and flags is_fund=true. Throttled + 429-retry.
//
// SEPARATE from refresh-fmp-data so it cannot affect the daily cron. The same
// logic also lives in refresh-fmp-data's etf-detail stage (enrichEtfs).
//
// NOTE: the production FMP key only returns /etf/info for a SUBSET of mutual
// funds (~271 of ~4500). The rest come back empty (a plan/coverage limit, not
// rate-limiting) — confirmed via a 5-symbol throttled batch returning 0 hits.
// Re-running won't help until the FMP key covers more funds.
//
// Trigger (sharded): POST /functions/v1/enrich-mutual-funds?shards=12&shard=0..11
import { createClient } from "npm:@supabase/supabase-js@2";

const FMP_STABLE = "https://financialmodelingprep.com/stable";
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "backend" },
  auth: { persistSession: false },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchInfo(sym: string, attempt = 0): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${FMP_STABLE}/etf/info?symbol=${encodeURIComponent(sym)}&apikey=${FMP_API_KEY}`);
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(600 * (attempt + 1));
    return fetchInfo(sym, attempt + 1);
  }
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length ? (data[0] as Record<string, unknown>) : null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const shard = Math.max(0, parseInt(url.searchParams.get("shard") ?? "0", 10) || 0);
  const shards = Math.max(1, parseInt(url.searchParams.get("shards") ?? "1", 10) || 1);

  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .like("symbol", "%X")
      .eq("is_etf", false)
      .eq("is_fund", false)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) if (/^[A-Z]{4}X$/.test(r.symbol)) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 300000) break;
  }
  const subset = candidates.filter((_, i) => i % shards === shard);

  const CONCURRENCY = 3;
  let next = 0;
  let updated = 0;
  let noData = 0;
  const errors: string[] = [];

  async function worker() {
    while (next < subset.length) {
      const sym = subset[next++];
      try {
        const info = await fetchInfo(sym) as {
          description?: string; isin?: string; assetClass?: string; website?: string;
          etfCompany?: string; expenseRatio?: number; assetsUnderManagement?: number;
          avgVolume?: number; inceptionDate?: string; nav?: number; holdingsCount?: number;
        } | null;
        if (!info) { noData++; continue; }
        const { error } = await sb
          .from("tickers")
          .update({
            description: info.description ?? null,
            isin: info.isin ?? null,
            asset_class: info.assetClass ?? null,
            website: info.website ?? null,
            etf_company: info.etfCompany ?? null,
            expense_ratio: info.expenseRatio ?? null,
            aum: info.assetsUnderManagement != null ? Math.round(info.assetsUnderManagement) : null,
            average_volume: info.avgVolume != null ? Math.round(info.avgVolume) : null,
            ipo_date: info.inceptionDate ?? null,
            nav: info.nav ?? null,
            holdings_count: info.holdingsCount ?? null,
            is_fund: true,
            updated_at: new Date().toISOString(),
          })
          .eq("symbol", sym);
        if (!error) updated++;
        else errors.push(`${sym}: ${error.message}`);
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker()));

  return new Response(
    JSON.stringify({ ok: true, shard, shards, candidates: candidates.length, attempted: subset.length, updated, noData, errors: errors.slice(0, 5) }),
    { headers: { "Content-Type": "application/json" } },
  );
});

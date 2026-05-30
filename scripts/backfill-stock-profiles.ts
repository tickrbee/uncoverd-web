#!/usr/bin/env tsx
// One-shot backfill for missing company profile data (sector, industry,
// isin, beta) on the tickers table. Hits FMP's /profile endpoint for
// every active US ticker >$1B with sector=null — typically big non-
// dividend names (NFLX, GOOG, GOOGL, BRK-B, etc.) that the refresh-fmp-data
// pipeline doesn't fully enrich.
//
// Safe to re-run: only touches rows where sector IS NULL.
//
// Run:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... FMP_API_KEY=... \
//     npx tsx scripts/backfill-stock-profiles.ts

import { createClient } from "@supabase/supabase-js";

const FMP = "https://financialmodelingprep.com/stable";
const URL_ = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FMP_KEY = process.env.FMP_API_KEY!;
if (!URL_ || !KEY || !FMP_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / FMP_API_KEY");
  process.exit(1);
}

const sb = createClient(URL_, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "backend" as "public" },
});

type ProfileResponse = Array<{
  symbol: string;
  sector?: string | null;
  industry?: string | null;
  isin?: string | null;
  beta?: number | null;
  country?: string | null;
  exchange?: string | null;
}>;

async function fmpProfile(symbol: string): Promise<ProfileResponse | null> {
  try {
    const res = await fetch(
      `${FMP}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as ProfileResponse;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  // Filter to a specific country to avoid currency-skew in the mkt_cap
  // ordering (Korean ETFs are valued in WON, Indian stocks in INR, so
  // their raw mkt_cap dwarfs USD-valued names like NFLX even though
  // NFLX is much larger by actual USD value).
  const country = process.argv[2] ?? "US";
  const limit = Number(process.argv[3] ?? 500);
  const { data, error } = await sb
    .from("tickers")
    .select("symbol,name,country,mkt_cap")
    .eq("is_actively_trading", true)
    .eq("country", country)
    .gt("mkt_cap", 1_000_000_000)
    .is("sector", null)
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  const candidates = (data as { symbol: string; name: string; mkt_cap: number }[]) ?? [];
  console.log(`Found ${candidates.length} candidates with missing sector.`);

  let updated = 0;
  let skipped = 0;
  let errored = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const profile = await fmpProfile(c.symbol);
    if (!profile || profile.length === 0) {
      skipped++;
      continue;
    }
    const p = profile[0];
    const updates: Record<string, unknown> = {};
    if (p.sector) updates.sector = p.sector;
    if (p.industry) updates.industry = p.industry;
    if (p.isin) updates.isin = p.isin;
    if (p.beta != null) updates.beta = p.beta;
    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }
    const { error: updErr } = await sb
      .from("tickers")
      .update(updates)
      .eq("symbol", c.symbol);
    if (updErr) {
      console.error(`  ${c.symbol}: update failed —`, updErr.message);
      errored++;
    } else {
      updated++;
      console.log(`  ${c.symbol} (${c.name}) → ${p.sector ?? "?"} / ${p.industry ?? "?"}`);
    }
    // FMP free tier rate limit: ~250 req/min. 250ms spacing keeps us safe.
    await new Promise((r) => setTimeout(r, 260));
  }

  console.log("");
  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Errored: ${errored}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

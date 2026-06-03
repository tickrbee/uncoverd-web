import { NextRequest, NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";
import {
  cachedGetStockRatings,
  cachedGetStockExtras,
  cachedNextDividendBySymbols,
} from "@/lib/cached-data";

// Batch premium-data endpoint for the listing tables. The listing pages
// themselves render the FREE (gated) version with no auth read, so they are
// CDN-cacheable; paying users fetch the ratings / extras / upcoming-dividend
// data here, client-side, and the table un-blurs. Premium data never lands in
// the cached HTML (free users get an empty payload), which both enables caching
// and keeps the paywall tight.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 60);

  const empty = { isPremium: false, ratings: {}, extras: {}, upcoming: {} };
  if (symbols.length === 0) return NextResponse.json(empty);

  const { isPremium } = await getPremiumStatus();
  if (!isPremium) return NextResponse.json(empty);

  const [ratings, extras, upcoming] = await Promise.all([
    cachedGetStockRatings(symbols).catch(() => new Map()),
    cachedGetStockExtras(symbols).catch(() => new Map()),
    cachedNextDividendBySymbols(symbols).catch(() => new Map()),
  ]);

  return NextResponse.json(
    {
      isPremium: true,
      ratings: Object.fromEntries(ratings),
      extras: Object.fromEntries(extras),
      upcoming: Object.fromEntries(upcoming),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

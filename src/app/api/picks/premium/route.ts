import { NextRequest, NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";
import {
  buildPickRows,
  buildBestYearRows,
  buildBestSectorRows,
  buildStaggeredRows,
} from "@/lib/picks";
import type { StockRow } from "@/lib/data";
import {
  cachedGetStockRatings,
  cachedGetStockExtras,
  cachedNextDividendBySymbols,
} from "@/lib/cached-data";

// Rows-reveal endpoint for the identity-gated model-portfolio / best-of lists.
// The pages render the SCRUBBED free version (no server auth read → cacheable);
// paying users fetch the REAL rows (+ ratings/extras/upcoming) here, client-side
// (DividendTable revealRowsEndpoint). Real identities never land in cached HTML.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const list = sp.get("list");

  const { isPremium } = await getPremiumStatus();
  if (!isPremium) return NextResponse.json({ isPremium: false });

  let rows: StockRow[] = [];
  try {
    if (list === "pick") {
      const slug = sp.get("slug") ?? "";
      const type = sp.get("type") === "etfs" ? "etfs" : "stocks";
      rows = await buildPickRows(slug, type);
    } else if (list === "best-year") {
      rows = await buildBestYearRows();
    } else if (list === "best-sector") {
      rows = await buildBestSectorRows(sp.get("sector") ?? "");
    } else if (list === "staggered") {
      rows = await buildStaggeredRows(24);
    }
  } catch (e) {
    console.error(e);
  }

  const symbols = rows.map((r) => r.symbol);
  const [ratings, extras, upcoming] = await Promise.all([
    cachedGetStockRatings(symbols).catch(() => new Map()),
    cachedGetStockExtras(symbols).catch(() => new Map()),
    cachedNextDividendBySymbols(symbols).catch(() => new Map()),
  ]);

  return NextResponse.json(
    {
      isPremium: true,
      rows,
      ratings: Object.fromEntries(ratings),
      extras: Object.fromEntries(extras),
      upcoming: Object.fromEntries(upcoming),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

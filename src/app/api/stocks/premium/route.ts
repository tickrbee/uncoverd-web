import { NextRequest, NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";
import { getStockRating, avgRecoveryDays } from "@/lib/data";

// Authenticated premium-data endpoint for the stock page. The stock page itself
// is statically cached (no auth), so premium content (ratings, capture recovery
// days) is fetched here, client-side, only for paying users — it never lands in
// the cached HTML. This both enables caching and tightens the paywall (free
// users can't read the data from page source like they could with the old
// CSS-blur approach).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ isPremium: false }, { status: 400 });
  }

  const { isPremium } = await getPremiumStatus();
  if (!isPremium) {
    // 200 with a flag (not 401) so the client can cleanly render the upsell.
    return NextResponse.json({ isPremium: false });
  }

  const [rating, recoveryDays] = await Promise.all([
    getStockRating(symbol).catch(() => null),
    avgRecoveryDays(symbol, 8).catch(() => null),
  ]);

  return NextResponse.json(
    { isPremium: true, rating, recoveryDays },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";
import { getEtfDetail, historicalPrices, computeEtfRating } from "@/lib/data";

// Authenticated premium-data endpoint for the ETF page. The page is statically
// cached (no auth), so the gated ETF-rating breakdown is fetched here,
// client-side, only for paying users — it never enters the cached HTML.
export const dynamic = "force-dynamic";

function oneYearReturnFrom(prices: { date: string; close: number | null }[]): number | null {
  if (prices.length < 2) return null;
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const yearAgoIdx = sorted.findIndex(
    (p) => new Date(p.date).getTime() >= Date.now() - 365 * 24 * 60 * 60 * 1000,
  );
  const start = yearAgoIdx >= 0 ? sorted[yearAgoIdx] : sorted[0];
  const startClose = start?.close ?? null;
  const latestClose = latest?.close ?? null;
  if (startClose != null && latestClose != null && startClose > 0) {
    return ((latestClose - startClose) / startClose) * 100;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ isPremium: false }, { status: 400 });
  }

  const { isPremium } = await getPremiumStatus();
  if (!isPremium) {
    return NextResponse.json({ isPremium: false });
  }

  const etf = await getEtfDetail(symbol).catch(() => null);
  if (!etf) {
    return NextResponse.json({ isPremium: true, rating: null });
  }
  const prices = await historicalPrices(symbol, 365 * 2).catch(() => []);
  const rating = computeEtfRating(etf, oneYearReturnFrom(prices));

  return NextResponse.json(
    { isPremium: true, rating },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

import { NextResponse } from "next/server";
import { getStock, listStocks, getStockRatings, yieldFromStock } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE = /^[A-Za-z0-9.\-]{1,15}$/;

// Approx S&P 500 sector weights (%), keyed by FMP sector names.
const SP_BENCH: Record<string, number> = {
  Technology: 31, Healthcare: 12, "Financial Services": 13, "Consumer Cyclical": 10,
  "Communication Services": 9, Industrials: 8, "Consumer Defensive": 6, Energy: 4,
  Utilities: 2.5, "Real Estate": 2.4, "Basic Materials": 2.4,
};

// Suggested diversifiers: top-rated names in the sectors where the portfolio is
// most underweight vs the S&P 500, excluding what's already held. v1 uses sector
// gaps + uncoverd ratings (correlation is approximated by "different sector").
export async function POST(req: Request) {
  let symbols: string[] = [];
  try {
    const body = (await req.json()) as { symbols?: unknown };
    if (Array.isArray(body.symbols)) {
      symbols = Array.from(new Set(
        body.symbols.filter((s): s is string => typeof s === "string" && SAFE.test(s)).map((s) => s.toUpperCase()),
      )).slice(0, 25);
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (symbols.length < 1) return NextResponse.json({ suggestions: [] });

  const held = new Set(symbols);
  const stocks = (await Promise.all(symbols.map((s) => getStock(s).catch(() => null)))).filter(Boolean) as any[];
  const n = stocks.length || 1;

  // Equal-weight sector mix of the held book.
  const sectorW: Record<string, number> = {};
  for (const s of stocks) {
    const sec = s.sector || "Unknown";
    sectorW[sec] = (sectorW[sec] ?? 0) + 100 / n;
  }

  // Underweight sectors (gap >= 3pt vs the S&P), biggest gaps first.
  const gaps = Object.entries(SP_BENCH)
    .map(([sec, b]) => ({ sec, gap: Math.round((b - (sectorW[sec] ?? 0)) * 10) / 10 }))
    .filter((g) => g.gap >= 3)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  if (!gaps.length) {
    return NextResponse.json({ suggestions: [], note: "Your sector mix already tracks the S&P 500 closely — no obvious gaps to fill." });
  }

  const suggestions: any[] = [];
  for (const g of gaps) {
    const rows = await listStocks({ sector: g.sec, country: "US", minMarketCap: 3e9, limit: 30 }).catch(() => []);
    const pool = rows.filter((r) => !held.has(r.symbol)).slice(0, 14);
    if (!pool.length) continue;
    const ratings = await getStockRatings(pool.map((r) => r.symbol)).catch(() => new Map());
    const ranked = pool
      .map((r) => ({ r, rating: ratings.get(r.symbol) }))
      .filter((x) => x.rating?.composite_grade && /^[AB]/.test(x.rating.composite_grade))
      .sort((a, b) => (b.rating.composite_total ?? 0) - (a.rating.composite_total ?? 0));
    // Up to 2 per gap sector, max 5 total.
    for (const x of ranked.slice(0, 2)) {
      if (suggestions.length >= 5 || held.has(x.r.symbol)) break;
      held.add(x.r.symbol);
      suggestions.push({
        symbol: x.r.symbol,
        name: x.r.name,
        sector: g.sec,
        type: x.r.is_etf || x.r.is_fund ? "etf" : "stock",
        grade: x.rating.composite_grade,
        yield: yieldFromStock(x.r),
        gap: g.gap,
        reason: `Adds ${g.sec} exposure — you're ${g.gap}pt under the S&P there`,
      });
    }
  }

  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "private, max-age=120" } });
}

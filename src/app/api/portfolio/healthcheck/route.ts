import { NextResponse } from "next/server";
import {
  getStock,
  historicalPrices,
  getCompanyListings,
  getStockRatings,
  getStockExtras,
} from "@/lib/data";
import { computeHealth, type Series, type HoldingMeta } from "@/lib/portfolio-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HOLDINGS = 25;
const SAFE = /^[A-Za-z0-9.\-]{1,15}$/;
const BENCHMARK = "SPY";

export async function POST(req: Request) {
  // Two accepted shapes:
  //   { symbols: ["AAPL", ...] }                         → equal-weighted
  //   { holdings: [{ symbol, weight | shares | value }] } → weighted
  // `weight` is treated as a relative share (normalised server-side); `shares`
  // and `value` are also relative weights here since we don't price quantities.
  let symbols: string[] = [];
  const weightBySymbol = new Map<string, number>();
  try {
    const body = (await req.json()) as {
      symbols?: unknown;
      holdings?: unknown;
    };

    let raw: { symbol: string; weight: number | null }[] = [];
    if (Array.isArray(body.holdings)) {
      raw = body.holdings
        .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
        .map((h) => {
          const symbol = typeof h.symbol === "string" ? h.symbol.toUpperCase() : "";
          const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
          const weight = num(h.weight) ?? num(h.shares) ?? num(h.value);
          return { symbol, weight };
        })
        .filter((h) => SAFE.test(h.symbol));
    } else if (Array.isArray(body.symbols)) {
      raw = body.symbols
        .filter((s): s is string => typeof s === "string" && SAFE.test(s))
        .map((s) => ({ symbol: s.toUpperCase(), weight: null }));
    }

    // De-dupe (keep first weight seen) and cap the list.
    for (const h of raw) {
      if (weightBySymbol.has(h.symbol)) continue;
      if (symbols.length >= MAX_HOLDINGS) break;
      symbols.push(h.symbol);
      weightBySymbol.set(h.symbol, h.weight ?? 0);
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (symbols.length < 1) {
    return NextResponse.json({ error: "Add at least one holding." }, { status: 400 });
  }
  // Only honour weights if at least one was provided; else equal-weight.
  const anyWeights = [...weightBySymbol.values()].some((v) => v > 0);

  // Fetch ~1.5y of daily closes + the ticker meta for each holding in parallel.
  const fetched = await Promise.all(
    symbols.map(async (symbol) => {
      const stock = await getStock(symbol).catch(() => null);
      let prices = await historicalPrices(symbol, 400).catch(() => []);
      let priceSymbol = symbol;
      // Foreign / secondary listings (VONOY, REPYF, RACE vs RACE.MI, …) often
      // carry little or no daily history — which is exactly what starves the
      // correlation / volatility / return stats. When this listing is thin,
      // fall back to the company's PRIMARY (highest-volume) listing for the
      // price series. Returns-based stats are currency-invariant, so mixing
      // the foreign listing's quote with its primary's history is fine.
      if (stock?.name && prices.length < 60) {
        const listings = await getCompanyListings(stock.name, {
          funds: !!(stock.is_etf || stock.is_fund),
        }).catch(() => []);
        const alt = listings.find((l) => l.symbol && l.symbol !== symbol);
        if (alt) {
          const altPrices = await historicalPrices(alt.symbol, 400).catch(() => []);
          if (altPrices.length > prices.length) {
            prices = altPrices;
            priceSymbol = alt.symbol;
          }
        }
      }
      return { symbol, priceSymbol, stock, prices };
    }),
  );

  const valid = fetched.filter((f) => f.stock); // drop unknown tickers
  const missing = fetched.filter((f) => !f.stock).map((f) => f.symbol);
  const resolved = valid.filter((f) => f.priceSymbol !== f.symbol);

  if (valid.length < 1) {
    return NextResponse.json({ error: "None of those symbols were found." }, { status: 404 });
  }

  const series: Series[] = valid.map((f) => ({
    symbol: f.symbol,
    points: f.prices.map((p) => ({ date: p.date, close: Number(p.close) })).filter((p) => p.close > 0),
  }));

  // Ratings + payout ratios for all resolved holdings, plus the benchmark series.
  const validSymbols = valid.map((f) => f.symbol);
  const [ratings, extras, benchPrices] = await Promise.all([
    getStockRatings(validSymbols).catch(() => new Map()),
    getStockExtras(validSymbols).catch(() => new Map()),
    historicalPrices(BENCHMARK, 400).catch(() => []),
  ]);

  const meta: HoldingMeta[] = valid.map((f) => {
    const r = ratings.get(f.symbol);
    const x = extras.get(f.symbol);
    return {
      symbol: f.symbol,
      name: f.stock!.name ?? null,
      sector: f.stock!.sector ?? null,
      dividend_yield: f.stock!.dividend_yield ?? null,
      beta: f.stock!.beta ?? null,
      is_etf: f.stock!.is_etf ?? null,
      payoutRatio: x?.payoutRatio ?? null,
      rating: r
        ? {
            grade: r.composite_grade ?? null,
            score: r.composite_total ?? null,
            value: r.value_score ?? null,
            quality: r.profit_score ?? null,
            growth: r.growth_score ?? null,
            momentum: r.momentum_score ?? null,
          }
        : null,
    };
  });

  const benchmark: Series | null = benchPrices.length
    ? { symbol: BENCHMARK, points: benchPrices.map((p) => ({ date: p.date, close: Number(p.close) })).filter((p) => p.close > 0) }
    : null;

  // Align weights to the holdings that actually resolved (drop missing tickers).
  const weights = anyWeights ? valid.map((f) => weightBySymbol.get(f.symbol) ?? 0) : undefined;

  const result = computeHealth(series, meta, { weights, benchmark });
  if (resolved.length) {
    result.notes.push(
      `Used the primary listing for price history: ${resolved
        .map((f) => `${f.symbol} → ${f.priceSymbol}`)
        .join(", ")}.`,
    );
  }
  if (missing.length) result.notes.push(`Skipped (not found): ${missing.join(", ")}.`);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=120" },
  });
}

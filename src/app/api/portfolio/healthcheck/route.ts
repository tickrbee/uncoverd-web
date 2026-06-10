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

// ---------------------------------------------------------------------------
// REAL crisis replays + same-window "legendary" baskets (deep-history callers
// only). A window's return is computed from a weighted portfolio index built
// on the holdings that actually have data across the window (weights
// renormalised; coverage reported so thin replays are labeled).
// ---------------------------------------------------------------------------
const CRISES = [
  { id: "covid2020", from: "2020-02-19", to: "2020-03-23" },
  { id: "inflation2022", from: "2022-01-03", to: "2022-10-12" },
  { id: "tariff2025", from: "2025-02-19", to: "2025-04-08" },
] as const;

const LEGENDARY_BASKETS: { id: string; parts: [string, number][] }[] = [
  { id: "buffett9010", parts: [["VOO", 0.9], ["BND", 0.1]] },
  { id: "classic6040", parts: [["VOO", 0.6], ["BND", 0.4]] },
  { id: "permanent", parts: [["VTI", 0.25], ["TLT", 0.25], ["GLD", 0.25], ["SGOV", 0.25]] },
  { id: "allweather", parts: [["VTI", 0.3], ["TLT", 0.4], ["IEF", 0.15], ["GLD", 0.08], ["DBC", 0.07]] },
];

type PriceMap = Map<string, { date: string; close: number }[]>;

function windowReturn(prices: PriceMap, parts: [string, number][], from: string, to: string): { ret: number; coverage: number } | null {
  let covered = 0;
  let total = 0;
  let ret = 0;
  for (const [sym, w] of parts) {
    total += w;
    const rows = prices.get(sym);
    if (!rows || rows.length < 2) continue;
    const inWin = rows.filter((r) => r.date >= from && r.date <= to);
    if (inWin.length < 2) continue;
    const first = inWin[0].close;
    const last = inWin[inWin.length - 1].close;
    if (!(first > 0) || !(last > 0)) continue;
    covered += w;
    ret += w * (last / first - 1);
  }
  if (total <= 0 || covered / total < 0.6) return null; // too thin to call "real"
  return { ret: (ret / covered) * 100, coverage: covered / total };
}

// Annualised return / vol / Sharpe / max drawdown for a fixed-weight basket
// over the full available overlap (daily, drift-weights ignored — close enough
// for a reference card).
function basketStats(prices: PriceMap, partsIn: [string, number][]): { ret: number; sharpe: number; maxDD: number; years: number } | null {
  // Tolerate missing members (a recent IPO in the user's basket): keep the
  // covered ≥80% and renormalise, otherwise the figures aren't comparable.
  const totalW = partsIn.reduce((a, [, w]) => a + w, 0);
  const parts = partsIn.filter(([sym]) => (prices.get(sym)?.length ?? 0) > 60);
  const coveredW = parts.reduce((a, [, w]) => a + w, 0);
  if (totalW <= 0 || coveredW / totalW < 0.8 || parts.length < 1) return null;
  const series = parts.map(([sym]) => prices.get(sym)!);

  const common = series
    .map((rows) => new Map(rows.map((r) => [r.date, r.close])))
    .reduce<string[]>((dates, m, i) => (i === 0 ? [...m.keys()] : dates.filter((d) => m.has(d))), [])
    .sort();
  if (common.length < 120) return null;
  const maps = series.map((rows) => new Map(rows.map((r) => [r.date, r.close])));
  const idx: number[] = [];
  for (const d of common) {
    let v = 0;
    parts.forEach(([, w], i) => { v += (w / coveredW) * (maps[i].get(d)! / maps[i].get(common[0])!); });
    idx.push(v);
  }
  const daily: number[] = [];
  for (let i = 1; i < idx.length; i++) daily.push(idx[i] / idx[i - 1] - 1);
  const mean = daily.reduce((a, b) => a + b, 0) / daily.length;
  const sd = Math.sqrt(daily.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, daily.length - 1));
  const annRet = mean * 252 * 100;
  const annVol = sd * Math.sqrt(252) * 100;
  let peak = idx[0];
  let maxDD = 0;
  for (const v of idx) { peak = Math.max(peak, v); maxDD = Math.min(maxDD, v / peak - 1); }
  return {
    ret: +annRet.toFixed(1),
    sharpe: annVol > 0.1 ? +(((annRet - 4.5) / annVol)).toFixed(2) : 0,
    maxDD: +(maxDD * 100).toFixed(1),
    years: +(common.length / 252).toFixed(1),
  };
}

export async function POST(req: Request) {
  // Two accepted shapes:
  //   { symbols: ["AAPL", ...] }                         → equal-weighted
  //   { holdings: [{ symbol, weight | shares | value }] } → weighted
  // `weight` is treated as a relative share (normalised server-side); `shares`
  // and `value` are also relative weights here since we don't price quantities.
  const symbols: string[] = [];
  const weightBySymbol = new Map<string, number>();
  let days = 400;
  try {
    const body = (await req.json()) as {
      symbols?: unknown;
      holdings?: unknown;
      days?: unknown;
    };
    // Deep-history callers (the generator) ask for up to ~10y so crisis
    // windows (2020/2022/2025) can be REPLAYED instead of modelled.
    if (typeof body.days === "number" && Number.isFinite(body.days)) {
      days = Math.min(3800, Math.max(200, Math.round(body.days)));
    }

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
      let prices = await historicalPrices(symbol, days).catch(() => []);
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
          const altPrices = await historicalPrices(alt.symbol, days).catch(() => []);
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
    historicalPrices(BENCHMARK, days).catch(() => []),
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

  // Deep-history extras (generator): REAL crisis replays + the legendary
  // reference baskets measured over the same long window as the portfolio.
  let crises: { id: string; port: number; spy: number; coverage: number }[] | undefined;
  let legendary: { id: string; ret: number; sharpe: number; maxDD: number; years: number }[] | undefined;
  if (days > 600) {
    const legSyms = [...new Set(LEGENDARY_BASKETS.flatMap((b) => b.parts.map((p) => p[0])))];
    const legRows = await Promise.all(legSyms.map((s) => historicalPrices(s, days).catch(() => [])));
    const priceMap: PriceMap = new Map();
    const clean = (rows: { date: string; close: number | string | null }[]) =>
      rows.map((p) => ({ date: p.date, close: Number(p.close) })).filter((p) => p.close > 0);
    legSyms.forEach((s, i) => priceMap.set(s, clean(legRows[i])));
    valid.forEach((f) => priceMap.set(f.symbol, clean(f.prices)));
    priceMap.set(BENCHMARK, clean(benchPrices));

    const wSum = weights ? weights.reduce((a, b) => a + b, 0) : 0;
    const holdParts: [string, number][] = valid.map((f, i) => [
      f.symbol,
      weights && wSum > 0 ? weights[i] / wSum : 1 / valid.length,
    ]);

    crises = [];
    for (const c of CRISES) {
      const pr = windowReturn(priceMap, holdParts, c.from, c.to);
      const sr = windowReturn(priceMap, [[BENCHMARK, 1]], c.from, c.to);
      if (pr && sr) crises.push({ id: c.id, port: +pr.ret.toFixed(1), spy: +sr.ret.toFixed(1), coverage: +pr.coverage.toFixed(2) });
    }
    legendary = [];
    for (const bk of LEGENDARY_BASKETS) {
      const s = basketStats(priceMap, bk.parts);
      if (s) legendary.push({ id: bk.id, ...s });
    }
    const yours = basketStats(priceMap, holdParts);
    if (yours) legendary.push({ id: "yours", ...yours });
  }

  return NextResponse.json({ ...result, crises, legendary }, {
    headers: { "Cache-Control": "private, max-age=120" },
  });
}

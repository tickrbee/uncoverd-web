import { NextResponse } from "next/server";
import {
  listStocks,
  historicalPrices,
  getStockRatings,
  getStockExtras,
  yieldFromStock,
  type StockRow,
} from "@/lib/data";
import { computeHealth, type Series, type HoldingMeta } from "@/lib/portfolio-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const US_EXCH = new Set(["NYSE", "NASDAQ", "AMEX", "NYSE American", "NYSEArca"]);
const isUsTicker = (s: string) => /^[A-Z]{1,5}$/.test(s) || /^[A-Z]{1,4}\.[AB]$/.test(s);

type Risk = "low" | "balanced" | "high";
type Style = "income" | "balanced" | "growth";

// Generate an optimized portfolio from preferences. Candidates are top-rated
// US names matching the answers; weights come from the same mean-variance
// optimizer the Healthcheck uses (min-variance for low risk, max-Sharpe else).
export async function POST(req: Request) {
  let amount = 100000, risk: Risk = "balanced", style: Style = "balanced", count = 10;
  let sectors: string[] = [];
  try {
    const b = (await req.json()) as Record<string, unknown>;
    if (typeof b.amount === "number" && b.amount > 0) amount = Math.min(b.amount, 1e9);
    if (b.risk === "low" || b.risk === "high") risk = b.risk;
    if (b.style === "income" || b.style === "growth") style = b.style;
    if (typeof b.count === "number") count = Math.max(6, Math.min(15, Math.round(b.count)));
    if (Array.isArray(b.sectors)) sectors = b.sectors.filter((s): s is string => typeof s === "string").slice(0, 6);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const minMarketCap = risk === "low" ? 10e9 : risk === "high" ? 1.5e9 : 5e9;
  const minYieldPct = style === "income" ? 2.5 : style === "growth" ? undefined : 1;

  // 1. Candidate pool — top US dividend payers by rating, matching the answers.
  let pool: StockRow[] = [];
  try {
    pool = await listStocks({ country: "US", minMarketCap, minYieldPct, limit: 320, excludeEtfs: true });
  } catch (e) {
    console.error(e);
  }
  const cands = pool.filter((r) => isUsTicker(r.symbol) && US_EXCH.has(r.exchange ?? "") && (sectors.length === 0 || (r.sector && sectors.includes(r.sector))));
  if (cands.length < 4) return NextResponse.json({ error: "Not enough names match those preferences — loosen them a little." }, { status: 422 });

  const ratings = await getStockRatings(cands.map((r) => r.symbol)).catch(() => new Map());
  const ranked = cands
    .map((r) => ({ r, rt: ratings.get(r.symbol) }))
    .filter((x) => x.rt?.composite_grade && /^[AB]/.test(x.rt.composite_grade))
    .sort((a, b) => (b.rt!.composite_total ?? 0) - (a.rt!.composite_total ?? 0));
  if (ranked.length < 4) return NextResponse.json({ error: "Not enough strongly-rated names match those preferences." }, { status: 422 });

  // 2. Diversify: cap names per sector, then fill to `count`.
  const perSectorCap = Math.max(2, Math.ceil(count / 3));
  const chosen: typeof ranked = [];
  const secCount: Record<string, number> = {};
  for (const x of ranked) {
    const sec = x.r.sector || "Other";
    if ((secCount[sec] ?? 0) >= perSectorCap) continue;
    chosen.push(x); secCount[sec] = (secCount[sec] ?? 0) + 1;
    if (chosen.length >= count) break;
  }
  for (const x of ranked) { if (chosen.length >= count) break; if (!chosen.includes(x)) chosen.push(x); }

  // 3. Prices + meta + benchmark.
  const symbols = chosen.map((x) => x.r.symbol);
  const [priceLists, extras, benchPrices] = await Promise.all([
    Promise.all(symbols.map((s) => historicalPrices(s, 400).catch(() => []))),
    getStockExtras(symbols).catch(() => new Map()),
    historicalPrices("SPY", 400).catch(() => []),
  ]);

  const kept = chosen
    .map((x, i) => ({ x, prices: priceLists[i] }))
    .filter((p) => p.prices.length >= 60); // enough history for stats
  if (kept.length < 3) return NextResponse.json({ error: "Could not build a portfolio with enough price history. Try again." }, { status: 422 });

  const series: Series[] = kept.map((p) => ({
    symbol: p.x.r.symbol,
    points: p.prices.map((q) => ({ date: q.date, close: Number(q.close) })).filter((q) => q.close > 0),
  }));
  const meta: HoldingMeta[] = kept.map((p) => {
    const r = p.x.r; const rt = p.x.rt;
    return {
      symbol: r.symbol, name: r.name ?? null, sector: r.sector ?? null,
      dividend_yield: r.dividend_yield ?? yieldFromStock(r), beta: r.beta ?? null, is_etf: r.is_etf ?? null,
      payoutRatio: extras.get(r.symbol)?.payoutRatio ?? null,
      rating: rt ? { grade: rt.composite_grade ?? null, score: rt.composite_total ?? null, value: rt.value_score ?? null, quality: rt.profit_score ?? null, growth: rt.growth_score ?? null, momentum: rt.momentum_score ?? null } : null,
    };
  });
  const benchmark: Series | null = benchPrices.length
    ? { symbol: "SPY", points: benchPrices.map((p) => ({ date: p.date, close: Number(p.close) })).filter((p) => p.close > 0) }
    : null;

  // 4. Optimal weights (min-variance for low risk, max-Sharpe otherwise).
  const base = computeHealth(series, meta, { benchmark });
  const opt = base.optimize;
  if (!opt || !opt.ok) return NextResponse.json({ error: "Optimization failed — try different preferences." }, { status: 422 });
  // Blend the optimal weights toward equal-weight so the book stays diversified.
  // Raw max-Sharpe over ~1y of noisy returns concentrates into 2-3 names and
  // grades poorly; a tilt keeps every holding meaningful while leaning optimal.
  const n = series.length;
  const eq = 1 / n;
  const blend = risk === "low" ? 0.4 : risk === "high" ? 0.65 : 0.45;
  const optW = (risk === "low" ? opt.minVariance : opt.maxSharpe).weights;
  let weights = optW.map((w) => blend * (w ?? eq) + (1 - blend) * eq);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  weights = weights.map((w) => w / wsum);

  // 5. Re-score the diversified book for an accurate grade.
  const scored = computeHealth(series, meta, { weights, benchmark });

  const holdings = series.map((s, i) => {
    const m = meta[i];
    const w = weights[i] ?? 0;
    return {
      symbol: s.symbol,
      name: m.name,
      sector: m.sector,
      grade: m.rating?.grade ?? null,
      weight: Math.round(w * 1000) / 10, // %
      dollars: Math.round(amount * w),
      yield: m.dividend_yield != null ? Math.round(m.dividend_yield * 10) / 10 : null,
    };
  }).filter((h) => h.weight >= 0.5).sort((a, b) => b.weight - a.weight);

  return NextResponse.json({
    amount,
    risk,
    style,
    holdings,
    grade: scored.portfolio.grade,
    score: scored.overall,
    projected: { ret: Math.round((scored.portfolio.annualReturn ?? 0) * 10) / 10, vol: Math.round((scored.portfolio.annualVol ?? 0) * 10) / 10, sharpe: Math.round((scored.risk.sharpe ?? 0) * 100) / 100 },
    yield: scored.portfolio.blendedYield != null ? Math.round(scored.portfolio.blendedYield * 10) / 10 : null,
    picks: holdings.map((h) => ({ symbol: h.symbol, name: h.name, type: "stock", sector: h.sector })),
  });
}

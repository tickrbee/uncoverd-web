import { NextResponse } from "next/server";
import { getStock, historicalPrices, getStockRatings, fxRatesToUSD } from "@/lib/data";
import { covarianceFromReturns, riskParityWeights, optimizePortfolio } from "@/lib/portfolio-optimizer";
import { blPosterior, ratingView, type BlView } from "@/lib/black-litterman";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// v4 "compose": the optimization brain behind Generate.
//   candidates → 10y daily closes → shrunk covariance → Black–Litterman
//   posterior returns (equilibrium prior from USD caps + uncoverd-rating
//   views) → transaction-cost-penalised, long-only constrained weights for
//   four schemes (BL max-Sharpe / min-variance / risk parity / max return).
// The client then re-measures the chosen weights through the healthcheck.
// ============================================================================

const SAFE = /^[A-Za-z0-9.\-]{1,15}$/;
const MAX_SYMBOLS = 28;
const MAX_WEIGHT = 0.12; // long-only per-asset cap
const COV_WINDOW = 600; // trading days for covariance (recent regime)

// Spread+impact estimate (bps, round-trip) by dollar daily volume bucket.
function costBpsOf(dollarAdv: number): number {
  if (dollarAdv > 50e6) return 5;
  if (dollarAdv > 10e6) return 10;
  if (dollarAdv > 3e6) return 20;
  return 35;
}

function capClip(w: number[], cap: number): number[] {
  let out = [...w];
  for (let iter = 0; iter < 40; iter++) {
    const sum = out.reduce((a, b) => a + b, 0) || 1;
    out = out.map((x) => x / sum);
    const over = out.map((x) => x > cap);
    if (!over.some(Boolean)) break;
    let surplus = 0;
    let freeSum = 0;
    out.forEach((x, i) => { if (over[i]) { surplus += x - cap; out[i] = cap; } else freeSum += x; });
    if (freeSum < 1e-9) break;
    out = out.map((x, i) => (over[i] ? x : x + (surplus * x) / freeSum));
  }
  return out;
}

export async function POST(req: Request) {
  let symbols: string[] = [];
  let horizonYears = 10;
  try {
    const body = (await req.json()) as { symbols?: unknown; horizonYears?: unknown };
    if (Array.isArray(body.symbols)) {
      symbols = [...new Set(body.symbols.filter((s): s is string => typeof s === "string" && SAFE.test(s)).map((s) => s.toUpperCase()))].slice(0, MAX_SYMBOLS);
    }
    if (typeof body.horizonYears === "number" && Number.isFinite(body.horizonYears)) {
      horizonYears = Math.min(40, Math.max(1, body.horizonYears));
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (symbols.length < 4) return NextResponse.json({ error: "Need at least 4 candidates." }, { status: 400 });

  const [rows, ratings, fx] = await Promise.all([
    Promise.all(symbols.map(async (s) => ({
      symbol: s,
      stock: await getStock(s).catch(() => null),
      prices: await historicalPrices(s, 3650).catch(() => [] as { date: string; close: number | string | null }[]),
    }))),
    getStockRatings(symbols).catch(() => new Map()),
    fxRatesToUSD().catch(() => new Map<string, number>()),
  ]);

  // Keep candidates with enough history for the covariance.
  const used = rows.filter((r) => r.stock && r.prices.filter((p) => Number(p.close) > 0).length >= 250);
  const dropped = rows.filter((r) => !used.includes(r)).map((r) => r.symbol);
  if (used.length < 4) {
    return NextResponse.json({ ok: false, error: "Too few candidates with usable history.", dropped });
  }

  // Aligned daily simple returns over the common recent window.
  const maps = used.map((r) => new Map(r.prices.filter((p) => Number(p.close) > 0).map((p) => [p.date, Number(p.close)])));
  let common = [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort();
  if (common.length < 120) {
    return NextResponse.json({ ok: false, error: "Too little overlapping history.", dropped });
  }
  common = common.slice(-COV_WINDOW - 1);
  const returns: number[][] = maps.map((m) => {
    const out: number[] = [];
    for (let i = 1; i < common.length; i++) out.push(m.get(common[i])! / m.get(common[i - 1])! - 1);
    return out;
  });

  // USD market caps (equilibrium prior weights) + dollar-ADV costs.
  const toUsd = (v: number | null | undefined, ccy: string | null | undefined) =>
    v == null ? 0 : !ccy || ccy === "USD" ? v : v * (fx.get(ccy) ?? 0);
  const capsUsd = used.map((r) => toUsd(r.stock!.market_cap, r.stock!.currency));
  const costBps = used.map((r) => costBpsOf(((r.stock!.avg_volume ?? r.stock!.volume ?? 0) as number) * toUsd(r.stock!.price, r.stock!.currency)));

  // Views: the uncoverd composite rating, per stock (ETFs ride the prior).
  const views: BlView[] = [];
  used.forEach((r, i) => {
    if (r.stock!.is_etf || r.stock!.is_fund) return;
    const v = ratingView(ratings.get(r.symbol)?.composite_grade);
    if (v) views.push({ index: i, q: v.q, confidence: v.confidence, source: "rating" });
  });

  const S = covarianceFromReturns(returns);
  const bl = blPosterior({ covariance: S, marketCapsUsd: capsUsd, views });
  // Net expected returns: amortise the round-trip implementation cost.
  const muNet = bl.mu.map((m, i) => m - costBps[i] / 1e4 / horizonYears);

  const usedSymbols = used.map((r) => r.symbol);
  const opt = optimizePortfolio(usedSymbols, returns, { mu: muNet, maxWeight: MAX_WEIGHT, riskFreeAnnual: 0.045 });
  const rp = capClip(riskParityWeights(returns), MAX_WEIGHT + 0.03);
  const maxRet = capClip(muNet.map((m) => Math.exp(9 * Math.max(-0.2, m))), MAX_WEIGHT);

  const toMap = (w: number[]) => Object.fromEntries(usedSymbols.map((s, i) => [s, +w[i].toFixed(5)]));
  const implBps = (w: number[]) => +w.reduce((a, x, i) => a + x * costBps[i], 0).toFixed(1);

  return NextResponse.json({
    ok: opt.ok,
    symbols: usedSymbols,
    dropped,
    windowDays: common.length - 1,
    weights: {
      maxSharpe: toMap(opt.maxSharpe.weights),
      minVariance: toMap(opt.minVariance.weights),
      riskParity: toMap(rp),
      maxReturn: toMap(maxRet),
    },
    implementationBps: {
      maxSharpe: implBps(opt.maxSharpe.weights),
      minVariance: implBps(opt.minVariance.weights),
      riskParity: implBps(rp),
      maxReturn: implBps(maxRet),
    },
    mu: Object.fromEntries(usedSymbols.map((s, i) => [s, +(bl.mu[i] * 100).toFixed(2)])),
    prior: Object.fromEntries(usedSymbols.map((s, i) => [s, +(bl.prior[i] * 100).toFixed(2)])),
    views: views.map((v) => ({ symbol: usedSymbols[v.index], q: +(v.q * 100).toFixed(2), confidence: v.confidence, source: v.source })),
  }, { headers: { "Cache-Control": "private, max-age=120" } });
}

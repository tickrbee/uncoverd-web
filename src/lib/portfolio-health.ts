// Pure portfolio-analytics math for the Healthcheck tool. No server deps —
// the API route fetches the data and calls computeHealth(). Supports optional
// per-holding weights (shares/$ value); falls back to equal-weight when none
// are given. ~1y daily returns. The mean-variance optimiser + efficient
// frontier live in portfolio-optimizer.ts and are attached as `optimize`.

import { optimizePortfolio, type OptimizeResult } from "@/lib/portfolio-optimizer";

export type PricePoint = { date: string; close: number };
export type Series = { symbol: string; points: PricePoint[] };

export type Rating = {
  grade: string | null; // A..F composite grade
  score: number | null; // composite 0..25
  value: number | null; // pillar 1..5
  quality: number | null; // profitability pillar 1..5
  growth: number | null; // 1..5
  momentum: number | null; // 1..5
};

export type HoldingMeta = {
  symbol: string;
  name: string | null;
  sector: string | null;
  dividend_yield: number | null;
  beta: number | null;
  is_etf?: boolean | null;
  rating?: Rating | null;
  payoutRatio?: number | null; // 0..1 fraction
};

export type HoldingStat = {
  symbol: string;
  name: string | null;
  sector: string | null;
  weight: number; // 0..1 (equal-weight if no weights supplied)
  annualReturn: number | null; // %
  annualVol: number | null; // %
  dividendYield: number | null; // %
  beta: number | null;
  grade: string | null;
  score: number | null; // composite 0..25
  pillars: { value: number | null; quality: number | null; momentum: number | null };
};

export type RiskMetrics = {
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number | null; // % (negative)
  var1d: number | null; // % (negative) — 1-day 95% historical VaR
};

export type BenchmarkStats = {
  symbol: string;
  beta: number | null; // portfolio beta to benchmark
  r2: number | null; // 0..1
  trackingError: number | null; // % annual
  upCapture: number | null; // %
  downCapture: number | null; // %
  cagr: number | null; // portfolio % annualised
  benchCagr: number | null; // benchmark % annualised
  curve: { i: number; port: number; bench: number }[]; // growth of 100
};

export type Factor = { factor: string; port: number; bench: number }; // 0..100
export type Subscore = { key: string; score: number; note: string };
export type Insight = { severity: "positive" | "warning" | "critical"; title: string; body: string };

export type HealthResult = {
  ok: boolean;
  dataPoints: number;
  overall: number | null; // 0..100
  holdings: HoldingStat[];
  portfolio: {
    annualReturn: number | null; // %
    annualVol: number | null; // %
    blendedYield: number | null; // %
    weightedBeta: number | null;
    avgCorrelation: number | null; // 0..1
    diversificationRatio: number | null; // >1 = diversification benefit
    grade: string; // A–F overall risk-adjusted read
  };
  risk: RiskMetrics;
  benchmark: BenchmarkStats | null;
  factors: Factor[];
  subscores: Subscore[];
  insights: Insight[];
  correlation: { symbols: string[]; matrix: (number | null)[][] };
  sectorWeights: { sector: string; weight: number }[]; // weight 0..1
  optimize: OptimizeResult | null; // mean-variance frontier + suggestions
  notes: string[];
};

const TRADING_DAYS = 252;
const RISK_FREE = 0.045; // annual decimal
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function std(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1));
}
function cov(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a), mb = mean(b);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}
function corr(a: number[], b: number[]): number {
  const sa = std(a), sb = std(b);
  if (!sa || !sb) return 0;
  return Math.max(-1, Math.min(1, cov(a, b) / (sa * sb)));
}
function pct(x: number): number {
  return Math.round(x * 10000) / 100; // ratio → %, 2dp
}
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Align the series on their common trading dates and return daily simple
// returns per symbol (same length, index-aligned) plus the aligned dates.
function alignedReturns(series: Series[]): { returns: number[][]; points: number; dates: string[] } {
  const maps = series.map((s) => {
    const m = new Map<string, number>();
    for (const p of s.points) if (p.close > 0) m.set(p.date, p.close);
    return m;
  });
  let common: string[] | null = null;
  for (const m of maps) {
    const ds = [...m.keys()];
    common = common === null ? ds : common.filter((d) => m.has(d));
  }
  const dates = (common ?? []).sort();
  const returns: number[][] = series.map(() => []);
  for (let i = 1; i < dates.length; i++) {
    for (let s = 0; s < maps.length; s++) {
      const prev = maps[s].get(dates[i - 1])!;
      const cur = maps[s].get(dates[i])!;
      returns[s].push((cur - prev) / prev);
    }
  }
  return { returns, points: Math.max(0, dates.length - 1), dates: dates.slice(1) };
}

function normalizeWeights(weights: number[] | undefined, n: number): number[] {
  if (weights && weights.length === n) {
    const clean = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
    const sum = clean.reduce((a, b) => a + b, 0);
    if (sum > 0) return clean.map((w) => w / sum);
  }
  return new Array(n).fill(1 / n);
}

// Benchmark daily returns aligned to the portfolio's return dates (index-matched
// with the portfolio return array). Missing benchmark dates are dropped from
// BOTH series via the returned `mask`.
function benchmarkReturns(bench: Series, dates: string[]): { br: number[]; mask: boolean[] } {
  const m = new Map<string, number>();
  for (const p of bench.points) if (p.close > 0) m.set(p.date, p.close);
  const br: number[] = [];
  const mask: boolean[] = [];
  // `dates` are the dates of each portfolio return (i.e., dates[t] vs the prior
  // common date). We approximate the benchmark return on the same calendar day.
  let prevDate: string | null = null;
  for (let t = 0; t < dates.length; t++) {
    const d = dates[t];
    const cur = m.get(d);
    // find the closest prior benchmark close
    let pr: number | undefined;
    if (prevDate && m.has(prevDate)) pr = m.get(prevDate);
    if (cur != null && pr != null && pr > 0) { br.push((cur - pr) / pr); mask.push(true); }
    else { br.push(0); mask.push(false); }
    if (cur != null) prevDate = d;
    else if (!prevDate) prevDate = d;
  }
  return { br, mask };
}

export function computeHealth(
  series: Series[],
  meta: HoldingMeta[],
  opts: { weights?: number[]; benchmark?: Series | null } = {},
): HealthResult {
  const { weights, benchmark } = opts;
  const metaBy = new Map(meta.map((m) => [m.symbol, m]));
  const notes: string[] = [];
  const { returns, points, dates } = alignedReturns(series);
  const n = series.length;
  const w = normalizeWeights(weights, n);
  const enough = points >= 30;
  if (!enough) notes.push("Not enough overlapping price history for reliable risk stats — figures may be partial.");

  const holdings: HoldingStat[] = series.map((s, i) => {
    const m = metaBy.get(s.symbol);
    const r = returns[i];
    const hasData = enough && r.length >= 30;
    return {
      symbol: s.symbol,
      name: m?.name ?? null,
      sector: m?.sector ?? null,
      weight: Math.round(w[i] * 1e4) / 1e4,
      annualReturn: hasData ? pct(mean(r) * TRADING_DAYS) : null,
      annualVol: hasData ? pct(std(r) * Math.sqrt(TRADING_DAYS)) : null,
      dividendYield: m?.dividend_yield ?? null,
      beta: m?.beta ?? null,
      grade: m?.rating?.grade ?? null,
      score: m?.rating?.score ?? null,
      pillars: {
        value: m?.rating?.value ?? null,
        quality: m?.rating?.quality ?? null,
        momentum: m?.rating?.momentum ?? null,
      },
    };
  });

  // Correlation matrix + average off-diagonal correlation.
  const matrix: (number | null)[][] = returns.map((a, i) =>
    returns.map((b, j) => (i === j ? 1 : enough ? Math.round(corr(a, b) * 100) / 100 : null)),
  );
  let corrSum = 0, corrCount = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (enough) { corrSum += corr(returns[i], returns[j]); corrCount++; }
  }
  const avgCorrelation = corrCount ? Math.round((corrSum / corrCount) * 100) / 100 : null;

  // Weighted portfolio daily returns.
  let annualReturn: number | null = null;
  let annualVol: number | null = null;
  let diversificationRatio: number | null = null;
  let port: number[] = [];
  if (enough && n > 0 && points > 0) {
    for (let t = 0; t < points; t++) {
      let sum = 0;
      for (let s = 0; s < n; s++) sum += w[s] * (returns[s][t] ?? 0);
      port.push(sum);
    }
    annualReturn = pct(mean(port) * TRADING_DAYS);
    const pVol = std(port) * Math.sqrt(TRADING_DAYS);
    annualVol = pct(pVol);
    const avgHoldingVol = returns.reduce((acc, r, i) => acc + w[i] * std(r) * Math.sqrt(TRADING_DAYS), 0);
    diversificationRatio = pVol > 0 ? Math.round((avgHoldingVol / pVol) * 100) / 100 : null;
  }

  // Advanced risk metrics from the portfolio return series.
  const risk: RiskMetrics = { sharpe: null, sortino: null, maxDrawdown: null, var1d: null };
  if (port.length >= 30) {
    const annRet = mean(port) * TRADING_DAYS;
    const annVol = std(port) * Math.sqrt(TRADING_DAYS);
    risk.sharpe = annVol > 0 ? Math.round(((annRet - RISK_FREE) / annVol) * 100) / 100 : null;
    const downs = port.map((x) => Math.min(0, x));
    const downDev = Math.sqrt(mean(downs.map((x) => x * x))) * Math.sqrt(TRADING_DAYS);
    risk.sortino = downDev > 0 ? Math.round(((annRet - RISK_FREE) / downDev) * 100) / 100 : null;
    let wealth = 1, peak = 1, mdd = 0;
    for (const r of port) { wealth *= 1 + r; peak = Math.max(peak, wealth); mdd = Math.min(mdd, wealth / peak - 1); }
    risk.maxDrawdown = pct(mdd);
    risk.var1d = pct(percentile([...port].sort((a, b) => a - b), 0.05));
  }

  // Blended yield + weighted beta (renormalise over holdings that have the figure).
  const wmean = (pick: (m: HoldingMeta | undefined) => number | null): number | null => {
    let acc = 0, wsum = 0;
    series.forEach((s, i) => {
      const v = pick(metaBy.get(s.symbol));
      if (v != null) { acc += w[i] * v; wsum += w[i]; }
    });
    return wsum > 0 ? acc / wsum : null;
  };
  const blendedYield = round2(wmean((m) => m?.dividend_yield ?? null));
  const weightedBeta = round2(wmean((m) => m?.beta ?? null));

  // Sector concentration (weighted).
  const sectorWeight = new Map<string, number>();
  series.forEach((s, i) => {
    const m = metaBy.get(s.symbol);
    const sec = m?.sector || (m?.is_etf ? "ETF" : "Unknown");
    sectorWeight.set(sec, (sectorWeight.get(sec) ?? 0) + w[i]);
  });
  const sectorWeights = [...sectorWeight.entries()]
    .map(([sector, weight]) => ({ sector, weight: Math.round(weight * 1000) / 1000 }))
    .sort((a, b) => b.weight - a.weight);
  const topSector = sectorWeights[0]?.weight ?? 1;
  const topHolding = Math.max(...w);

  // Benchmark-relative stats.
  let benchStats: BenchmarkStats | null = null;
  if (benchmark && port.length >= 30) {
    const { br, mask } = benchmarkReturns(benchmark, dates);
    const p: number[] = [], b: number[] = [];
    for (let t = 0; t < port.length; t++) if (mask[t]) { p.push(port[t]); b.push(br[t]); }
    if (p.length >= 30) {
      const beta = std(b) > 0 ? cov(p, b) / (std(b) ** 2) : null;
      const r = corr(p, b);
      const te = std(p.map((x, i) => x - b[i])) * Math.sqrt(TRADING_DAYS);
      const upB = b.filter((x) => x > 0), upP = p.filter((_, i) => b[i] > 0);
      const dnB = b.filter((x) => x < 0), dnP = p.filter((_, i) => b[i] < 0);
      const upCap = upB.length && mean(upB) ? (mean(upP) / mean(upB)) * 100 : null;
      const dnCap = dnB.length && mean(dnB) ? (mean(dnP) / mean(dnB)) * 100 : null;
      const years = p.length / TRADING_DAYS;
      const cumP = p.reduce((a, x) => a * (1 + x), 1);
      const cumB = b.reduce((a, x) => a * (1 + x), 1);
      // Growth-of-100 curve (downsampled to <= 120 points for the chart).
      const curve: { i: number; port: number; bench: number }[] = [];
      let wp = 100, wb = 100;
      const stepN = Math.max(1, Math.floor(p.length / 120));
      for (let t = 0; t < p.length; t++) {
        wp *= 1 + p[t]; wb *= 1 + b[t];
        if (t % stepN === 0 || t === p.length - 1) curve.push({ i: t, port: Math.round(wp * 10) / 10, bench: Math.round(wb * 10) / 10 });
      }
      benchStats = {
        symbol: benchmark.symbol,
        beta: beta == null ? null : Math.round(beta * 100) / 100,
        r2: Math.round(r * r * 100) / 100,
        trackingError: pct(te),
        upCapture: upCap == null ? null : Math.round(upCap),
        downCapture: dnCap == null ? null : Math.round(dnCap),
        cagr: years > 0 ? pct(Math.pow(cumP, 1 / years) - 1) : null,
        benchCagr: years > 0 ? pct(Math.pow(cumB, 1 / years) - 1) : null,
        curve,
      };
    }
  }

  // Factor radar (0..100) vs a neutral 50 benchmark baseline. Pillar scores are
  // 1..5 → ((s-1)/4)*100; income from yield; low-vol from inverse volatility.
  const pillarTo100 = (pick: (r: Rating) => number | null): number | null => {
    const v = wmean((m) => (m?.rating ? pick(m.rating) : null));
    return v == null ? null : clamp(((v - 1) / 4) * 100);
  };
  const incomeScore = blendedYield == null ? 0 : clamp((blendedYield / 5) * 100);
  const lowVolScore = annualVol == null ? 50 : clamp(100 - annualVol * 2.2);
  const factors: Factor[] = [
    { factor: "Value", port: Math.round(pillarTo100((r) => r.value) ?? 50), bench: 50 },
    { factor: "Quality", port: Math.round(pillarTo100((r) => r.quality) ?? 50), bench: 50 },
    { factor: "Growth", port: Math.round(pillarTo100((r) => r.growth) ?? 50), bench: 50 },
    { factor: "Momentum", port: Math.round(pillarTo100((r) => r.momentum) ?? 50), bench: 50 },
    { factor: "Income", port: Math.round(incomeScore), bench: 50 },
    { factor: "Low Vol", port: Math.round(lowVolScore), bench: 50 },
  ];

  // Subscores (0..100) + overall.
  const qualityAvg = wmean((m) => (m?.rating?.score != null ? (m.rating.score / 25) * 100 : null));
  const subscores: Subscore[] = [];
  if (enough) {
    const divScore = avgCorrelation == null ? 60 : clamp(100 - avgCorrelation * 90 + (n >= 8 ? 12 : n >= 4 ? 6 : 0));
    const concScore = clamp(100 - topSector * 110 - Math.max(0, topHolding - 0.2) * 90);
    const qScore = qualityAvg == null ? 60 : clamp(qualityAvg);
    const incScore = clamp(incomeScore);
    const raScore = risk.sharpe == null ? 60 : clamp(40 + risk.sharpe * 35);
    subscores.push(
      { key: "Risk-Adjusted Return", score: Math.round(raScore), note: risk.sharpe != null ? `Sharpe ${risk.sharpe}` : "—" },
      { key: "Quality & Fundamentals", score: Math.round(qScore), note: qualityAvg != null ? "From holding ratings" : "Ratings unavailable" },
      { key: "Diversification", score: Math.round(divScore), note: avgCorrelation != null ? `Avg correlation ${avgCorrelation}` : "—" },
      { key: "Concentration", score: Math.round(concScore), note: `Top sector ${Math.round(topSector * 100)}%` },
      { key: "Income", score: Math.round(incScore), note: blendedYield != null ? `Blended yield ${blendedYield}%` : "—" },
    );
  }
  const overall = subscores.length ? Math.round(mean(subscores.map((s) => s.score))) : null;

  // Letter grade from the overall score (falls back to the old heuristic).
  let grade = "—";
  if (overall != null) grade = overall >= 85 ? "A" : overall >= 75 ? "B+" : overall >= 65 ? "B" : overall >= 55 ? "C+" : overall >= 45 ? "C" : overall >= 35 ? "D" : "F";

  // Rule-based insights.
  const insights: Insight[] = [];
  if (enough) {
    if (topSector >= 0.5) insights.push({ severity: topSector >= 0.6 ? "critical" : "warning", title: `Concentrated in ${sectorWeights[0].sector}`, body: `${Math.round(topSector * 100)}% of the book sits in a single sector. A sector-specific drawdown would move much of the portfolio together.` });
    if (avgCorrelation != null && avgCorrelation >= 0.6) insights.push({ severity: avgCorrelation >= 0.75 ? "critical" : "warning", title: "Holdings move together", body: `Average pairwise correlation is ${avgCorrelation}. Your effective diversification is lower than your holding count suggests.` });
    if (weightedBeta != null && weightedBeta >= 1.2) insights.push({ severity: weightedBeta >= 1.4 ? "critical" : "warning", title: "Above-market risk", body: `Weighted beta of ${weightedBeta} means the book amplifies market moves. Expect larger swings than the index in both directions.` });
    if (risk.maxDrawdown != null && risk.maxDrawdown <= -30) insights.push({ severity: "warning", title: "Deep historical drawdown", body: `The book fell ${Math.abs(risk.maxDrawdown)}% peak-to-trough over the window — make sure that's a loss you could hold through.` });
    if (qualityAvg != null && qualityAvg >= 70) insights.push({ severity: "positive", title: "Strong underlying quality", body: "Holdings score well on uncoverd's ratings — the concentration, where present, is at least in higher-quality names." });
    if (blendedYield != null && blendedYield >= 3.5) insights.push({ severity: "positive", title: "Healthy income", body: `Blended forward yield of ${blendedYield}% provides a real income stream on top of price return.` });
    if (risk.sharpe != null && risk.sharpe >= 1) insights.push({ severity: "positive", title: "Good risk-adjusted return", body: `A Sharpe ratio of ${risk.sharpe} means you're being paid well for the volatility you're taking.` });
    if (!insights.length) insights.push({ severity: "positive", title: "Balanced profile", body: "No major concentration, correlation or risk flags stand out in this book." });
  }
  if (n < 2) notes.push("Add at least 2 holdings to see correlation, diversification and the efficient frontier.");

  const optimize = optimizePortfolio(series.map((s) => s.symbol), returns, { weights: w });

  return {
    ok: enough,
    dataPoints: points,
    overall,
    holdings,
    portfolio: { annualReturn, annualVol, blendedYield, weightedBeta, avgCorrelation, diversificationRatio, grade },
    risk,
    benchmark: benchStats,
    factors,
    subscores,
    insights,
    correlation: { symbols: series.map((s) => s.symbol), matrix },
    sectorWeights,
    optimize,
    notes,
  };
}

function round2(x: number | null): number | null {
  return x == null ? null : Math.round(x * 100) / 100;
}

// Pure portfolio-analytics math for the Healthcheck tool. No server deps —
// the API route fetches the data and calls computeHealth(). Equal-weighted
// (the tool takes holdings WITHOUT quantities), ~1y daily returns.

export type PricePoint = { date: string; close: number };
export type Series = { symbol: string; points: PricePoint[] };
export type HoldingMeta = {
  symbol: string;
  name: string | null;
  sector: string | null;
  dividend_yield: number | null;
  beta: number | null;
  is_etf?: boolean | null;
};

export type HoldingStat = {
  symbol: string;
  name: string | null;
  sector: string | null;
  annualReturn: number | null; // %
  annualVol: number | null; // %
  dividendYield: number | null; // %
  beta: number | null;
};

export type HealthResult = {
  ok: boolean;
  dataPoints: number;
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
  correlation: { symbols: string[]; matrix: (number | null)[][] };
  sectorWeights: { sector: string; weight: number }[]; // weight 0..1, equal-weighted
  notes: string[];
};

const TRADING_DAYS = 252;
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

// Align the series on their common trading dates and return daily simple
// returns per symbol (same length, index-aligned).
function alignedReturns(series: Series[]): { returns: number[][]; points: number } {
  const maps = series.map((s) => {
    const m = new Map<string, number>();
    for (const p of s.points) if (p.close > 0) m.set(p.date, p.close);
    return m;
  });
  let common: string[] | null = null;
  for (const m of maps) {
    const dates = [...m.keys()];
    common = common === null ? dates : common.filter((d) => m.has(d));
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
  return { returns, points: Math.max(0, dates.length - 1) };
}

function pct(x: number): number {
  return Math.round(x * 10000) / 100; // ratio → %, 2dp
}

export function computeHealth(series: Series[], meta: HoldingMeta[]): HealthResult {
  const metaBy = new Map(meta.map((m) => [m.symbol, m]));
  const notes: string[] = [];
  const { returns, points } = alignedReturns(series);
  const n = series.length;
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
      annualReturn: hasData ? pct(mean(r) * TRADING_DAYS) : null,
      annualVol: hasData ? pct(std(r) * Math.sqrt(TRADING_DAYS)) : null,
      dividendYield: m?.dividend_yield ?? null,
      beta: m?.beta ?? null,
    };
  });

  // Correlation matrix.
  const matrix: (number | null)[][] = returns.map((a, i) =>
    returns.map((b, j) => (i === j ? 1 : enough ? Math.round(corr(a, b) * 100) / 100 : null)),
  );
  // Average off-diagonal correlation.
  let corrSum = 0, corrCount = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (enough) { corrSum += corr(returns[i], returns[j]); corrCount++; }
  }
  const avgCorrelation = corrCount ? Math.round((corrSum / corrCount) * 100) / 100 : null;

  // Equal-weighted portfolio daily returns (captures correlation in the vol).
  let annualReturn: number | null = null;
  let annualVol: number | null = null;
  let diversificationRatio: number | null = null;
  if (enough && n > 0 && points > 0) {
    const port: number[] = [];
    for (let t = 0; t < points; t++) {
      let sum = 0;
      for (let s = 0; s < n; s++) sum += returns[s][t] ?? 0;
      port.push(sum / n);
    }
    annualReturn = pct(mean(port) * TRADING_DAYS);
    const pVol = std(port) * Math.sqrt(TRADING_DAYS);
    annualVol = pct(pVol);
    const avgHoldingVol = mean(returns.map((r) => std(r) * Math.sqrt(TRADING_DAYS)));
    diversificationRatio = pVol > 0 ? Math.round((avgHoldingVol / pVol) * 100) / 100 : null;
  }

  // Blended yield + weighted beta (equal weight).
  const yields = meta.map((m) => m.dividend_yield).filter((y): y is number => y != null);
  const blendedYield = yields.length ? Math.round((yields.reduce((a, b) => a + b, 0) / n) * 100) / 100 : null;
  const betas = meta.map((m) => m.beta).filter((b): b is number => b != null);
  const weightedBeta = betas.length ? Math.round((betas.reduce((a, b) => a + b, 0) / betas.length) * 100) / 100 : null;

  // Sector concentration (equal weight).
  const sectorCount = new Map<string, number>();
  for (const m of meta) {
    const sec = m.sector || (m.is_etf ? "ETF" : "Unknown");
    sectorCount.set(sec, (sectorCount.get(sec) ?? 0) + 1);
  }
  const sectorWeights = [...sectorCount.entries()]
    .map(([sector, c]) => ({ sector, weight: Math.round((c / n) * 1000) / 1000 }))
    .sort((a, b) => b.weight - a.weight);

  // Simple letter grade: reward diversification + low concentration.
  let grade = "—";
  if (enough && avgCorrelation != null) {
    const topSector = sectorWeights[0]?.weight ?? 1;
    let score = 0;
    score += avgCorrelation < 0.4 ? 2 : avgCorrelation < 0.6 ? 1 : 0; // low correlation
    score += n >= 8 ? 2 : n >= 4 ? 1 : 0; // breadth
    score += topSector <= 0.3 ? 2 : topSector <= 0.5 ? 1 : 0; // not over-concentrated
    grade = score >= 5 ? "A" : score >= 4 ? "B" : score >= 2 ? "C" : score >= 1 ? "D" : "F";
  }
  if (n < 2) notes.push("Add at least 2 holdings to see correlation and diversification.");

  return {
    ok: enough,
    dataPoints: points,
    holdings,
    portfolio: { annualReturn, annualVol, blendedYield, weightedBeta, avgCorrelation, diversificationRatio, grade },
    correlation: { symbols: series.map((s) => s.symbol), matrix },
    sectorWeights,
    notes,
  };
}

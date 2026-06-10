// Black–Litterman posterior expected returns.
//
// Prior: market-equilibrium excess returns reverse-optimised from USD market
// caps (π = δ·Σ·w_mkt). Views: per-asset expected EXCESS returns from the
// uncoverd composite ratings and (optionally) analyst price-target consensus,
// each with its own confidence. Posterior blends prior and views in
// proportion to their certainty — the classic fix for Markowitz's
// garbage-in/garbage-out expected-return problem.
//
// All returns are annualised decimals. Keep this file dependency-light: the
// covariance comes in from portfolio-optimizer's estimator.

export type BlView = {
  index: number; // asset index the view applies to
  q: number; // expected annual EXCESS return (decimal, e.g. 0.02)
  confidence: number; // 0..1 — scales the view's weight vs the prior
  source: string; // "rating" | "analyst" — for the response payload
};

export type BlResult = {
  mu: number[]; // posterior expected TOTAL returns (annual decimals)
  prior: number[]; // equilibrium total returns (annual decimals)
  views: BlView[];
};

const RISK_AVERSION = 2.5; // δ — standard market risk-aversion assumption
const TAU = 0.05; // uncertainty of the prior covariance

function matVec(M: number[][], v: number[]): number[] {
  return M.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}

// Gauss–Jordan inverse with partial pivoting (n is small — ≤ ~30).
function invert(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row.slice(n));
}

export function blPosterior(opts: {
  covariance: number[][]; // annualised Σ (from real returns, ridged)
  marketCapsUsd: number[]; // per asset — drives equilibrium weights
  views: BlView[];
  riskFree?: number; // annual decimal, default 0.045
}): BlResult {
  const { covariance: S, marketCapsUsd, views } = opts;
  const rf = opts.riskFree ?? 0.045;
  const n = S.length;

  // Equilibrium weights from caps (fallback equal where caps are missing).
  const caps = marketCapsUsd.map((c) => (isFinite(c) && c > 0 ? c : 0));
  const capSum = caps.reduce((a, b) => a + b, 0);
  const wMkt = capSum > 0 ? caps.map((c) => (c > 0 ? c / capSum : 0)) : new Array(n).fill(1 / n);
  // Missing-cap assets get the average weight so they still receive a prior.
  const avgW = 1 / n;
  for (let i = 0; i < n; i++) if (wMkt[i] === 0) wMkt[i] = avgW * 0.5;

  // Prior EXCESS returns: π = δ Σ w.
  const pi = matVec(S, wMkt).map((x) => RISK_AVERSION * x);

  if (views.length === 0) {
    return { mu: pi.map((x) => x + rf), prior: pi.map((x) => x + rf), views };
  }

  // P (k×n) picks the assets; Ω is diagonal with variance shrinking as
  // confidence rises: ω_k = (p_k τΣ p_k') · (1 − c)/c.
  const k = views.length;
  const tauS = S.map((row) => row.map((x) => x * TAU));
  const omega: number[] = views.map((v) => {
    const base = Math.max(1e-8, tauS[v.index][v.index]);
    const c = Math.min(0.95, Math.max(0.05, v.confidence));
    return (base * (1 - c)) / c;
  });

  // Posterior: μ = [(τΣ)^-1 + P'Ω^-1P]^-1 [(τΣ)^-1 π + P'Ω^-1 Q]
  const invTauS = invert(tauS);
  if (!invTauS) return { mu: pi.map((x) => x + rf), prior: pi.map((x) => x + rf), views };

  // A = (τΣ)^-1 + P'Ω^-1P — P rows are unit vectors, so P'Ω^-1P is diagonal
  // accumulation at the viewed indices.
  const A = invTauS.map((row) => [...row]);
  const b = matVec(invTauS, pi);
  for (let vIdx = 0; vIdx < k; vIdx++) {
    const v = views[vIdx];
    const wOm = 1 / omega[vIdx];
    A[v.index][v.index] += wOm;
    b[v.index] += wOm * v.q;
  }
  const invA = invert(A);
  if (!invA) return { mu: pi.map((x) => x + rf), prior: pi.map((x) => x + rf), views };
  const muExcess = matVec(invA, b);

  return {
    mu: muExcess.map((x) => x + rf),
    prior: pi.map((x) => x + rf),
    views,
  };
}

// Map an uncoverd composite grade to a view (annual EXCESS return) +
// confidence. Calibrated modestly — views tilt, they don't dominate.
export function ratingView(grade: string | null | undefined): { q: number; confidence: number } | null {
  if (!grade) return null;
  const table: Record<string, [number, number]> = {
    "A+": [0.035, 0.6], A: [0.03, 0.55], "A-": [0.022, 0.5],
    "B+": [0.012, 0.45], B: [0.004, 0.35], "B-": [-0.006, 0.35],
    "C+": [-0.015, 0.4], C: [-0.022, 0.4], "C-": [-0.03, 0.45], D: [-0.04, 0.5],
  };
  const hit = table[grade];
  return hit ? { q: hit[0], confidence: hit[1] } : null;
}

// Mean-variance portfolio optimizer for the Healthcheck "Optimization &
// Efficient Frontier" section. Dependency-free (no external math libs).
//
// It takes index-aligned daily returns per holding (the same matrix the
// Healthcheck already builds in portfolio-health.ts) and produces:
//   - the smooth efficient frontier curve (closed-form Markowitz),
//   - the current portfolio's risk/return point,
//   - a LONG-ONLY minimum-variance and max-Sharpe portfolio (projected
//     gradient — no shorting/leverage, so the suggestions are actionable),
//   - a cloud of random long-only portfolios (the scatter behind the curve),
//   - concrete rebalance suggestions (current weights -> max-Sharpe target).
//
// Units: all internal math is in DECIMAL annual terms (0.12 = 12%). The
// FrontierPoint x/y and the OptimizedPortfolio ret/vol are emitted in PERCENT
// to match the chart. Sharpe is a unitless ratio.

const TRADING_DAYS = 252;

export type FrontierPoint = { x: number; y: number }; // x = annual vol %, y = annual return %

export type OptimizedPortfolio = {
  weights: number[]; // 0..1, sums to 1, index-aligned with `symbols`
  ret: number; // annual return %
  vol: number; // annual volatility %
  sharpe: number; // (ret - rf) / vol, unitless
};

export type RebalanceSuggestion = {
  symbol: string;
  from: number; // current weight %
  to: number; // suggested weight %
  delta: number; // to - from, %
};

export type OptimizeResult = {
  ok: boolean;
  symbols: string[];
  riskFree: number; // annual %, for reference
  expectedReturns: { symbol: string; mu: number }[]; // annual %
  current: OptimizedPortfolio | null;
  minVariance: OptimizedPortfolio;
  maxSharpe: OptimizedPortfolio;
  frontier: FrontierPoint[]; // efficient (upper) branch, smooth
  cloud: FrontierPoint[]; // random long-only portfolios
  suggestions: RebalanceSuggestion[]; // current -> maxSharpe
  notes: string[];
};

/* ----------------------------- linear algebra ----------------------------- */

const dot = (a: number[], b: number[]): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

const matVec = (M: number[][], v: number[]): number[] => M.map((row) => dot(row, v));

const mean = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// Sample covariance of two index-aligned series (n-1 denominator).
function covOf(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

// Gauss-Jordan inverse with partial pivoting. Returns null if singular.
function invert(A: number[][]): number[][] | null {
  const n = A.length;
  // Augment [A | I]
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    // pivot = largest magnitude in this column at/below the diagonal
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
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

/* ----------------------------- estimation ----------------------------- */

// Annualised expected returns (decimal) from daily simple returns, shrunk
// toward the cross-sectional mean. Raw historical means are extremely noisy
// and make the optimiser dump everything into one asset; James–Stein-style
// shrinkage keeps the suggestions sane without needing a forward model.
function expectedReturns(returns: number[][], shrink = 0.5): number[] {
  const raw = returns.map((r) => mean(r) * TRADING_DAYS);
  const grand = mean(raw);
  return raw.map((m) => shrink * grand + (1 - shrink) * m);
}

// Annualised covariance matrix (decimal^2), with a small ridge on the diagonal
// for numerical stability when assets are nearly collinear or history is short.
function covMatrix(returns: number[][]): number[][] {
  const n = returns.length;
  const S = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const c = covOf(returns[i], returns[j]) * TRADING_DAYS;
      S[i][j] = c;
      S[j][i] = c;
    }
  }
  let trace = 0;
  for (let i = 0; i < n; i++) trace += S[i][i];
  const ridge = (trace / Math.max(1, n)) * 1e-6 + 1e-10;
  for (let i = 0; i < n; i++) S[i][i] += ridge;
  return S;
}

/* ----------------------------- portfolio stats ----------------------------- */

function stats(w: number[], mu: number[], S: number[][], rf: number): OptimizedPortfolio {
  const retDec = dot(w, mu);
  const varDec = Math.max(0, dot(w, matVec(S, w)));
  const volDec = Math.sqrt(varDec);
  const sharpe = volDec > 1e-9 ? (retDec - rf) / volDec : 0;
  return {
    weights: w.map((x) => Math.round(x * 1e6) / 1e6),
    ret: Math.round(retDec * 1000) / 10, // -> %
    vol: Math.round(volDec * 1000) / 10, // -> %
    sharpe: Math.round(sharpe * 100) / 100,
  };
}

/* ------------------------- simplex projection (long-only) ------------------------- */

// Euclidean projection of v onto the probability simplex { w >= 0, sum w = 1 }.
// Duchi et al. (2008).
function projectSimplex(v: number[]): number[] {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let cssv = 0;
  let rho = 0;
  let theta = 0;
  for (let i = 0; i < n; i++) {
    cssv += u[i];
    const t = (cssv - 1) / (i + 1);
    if (u[i] - t > 0) {
      rho = i + 1;
      theta = t;
    }
  }
  return v.map((x) => Math.max(0, x - theta));
}

// Optional per-asset cap: clamp to [0, cap] and re-water-fill the surplus a few
// times. Approximate but converges quickly for a single uniform cap.
function projectCapped(v: number[], cap: number): number[] {
  let w = projectSimplex(v);
  if (!(cap > 0 && cap < 1)) return w;
  for (let iter = 0; iter < 50; iter++) {
    const over = w.map((x) => x > cap);
    if (!over.some(Boolean)) break;
    let surplus = 0;
    let freeSum = 0;
    for (let i = 0; i < w.length; i++) {
      if (over[i]) {
        surplus += w[i] - cap;
        w[i] = cap;
      } else {
        freeSum += w[i];
      }
    }
    if (freeSum < 1e-12) break;
    for (let i = 0; i < w.length; i++) if (!over[i]) w[i] += (surplus * w[i]) / freeSum;
  }
  return w;
}

/* ------------------------- long-only optimisers ------------------------- */

// Projected-gradient ascent on the Sharpe ratio, long-only. Multiple restarts
// because the long-only Sharpe surface can be multi-modal.
function maxSharpeLongOnly(
  mu: number[],
  S: number[][],
  rf: number,
  cap: number | undefined,
  seed: number[],
): number[] {
  const n = mu.length;
  const project = (v: number[]) => (cap ? projectCapped(v, cap) : projectSimplex(v));

  const run = (start: number[]): { w: number[]; sharpe: number } => {
    let w = project(start);
    let best = w;
    let bestSharpe = -Infinity;
    let lr = 0.05;
    for (let it = 0; it < 800; it++) {
      const Sw = matVec(S, w);
      const retDec = dot(w, mu);
      const varDec = Math.max(1e-12, dot(w, Sw));
      const vol = Math.sqrt(varDec);
      const sharpe = (retDec - rf) / vol;
      if (sharpe > bestSharpe) {
        bestSharpe = sharpe;
        best = w;
      }
      // d/dw [ (mu·w - rf) / sqrt(w'Sw) ]
      const grad = mu.map((m, i) => m / vol - ((retDec - rf) / (varDec * vol)) * Sw[i]);
      const next = project(w.map((x, i) => x + lr * grad[i]));
      // shrink the step if we overshot
      if (dot(next, mu) - rf < retDec - rf - 1) lr *= 0.7;
      w = next;
      lr *= 0.999;
    }
    return { w: best, sharpe: bestSharpe };
  };

  let best = run(seed);
  const equal = new Array(n).fill(1 / n);
  for (const start of [equal, mu.map((m) => Math.max(0, m)), ...randomStarts(n, 3, seed.length + 17)]) {
    const cand = run(start);
    if (cand.sharpe > best.sharpe) best = cand;
  }
  return best.w;
}

// Projected-gradient descent on portfolio variance, long-only.
function minVarianceLongOnly(S: number[][], cap: number | undefined, n: number): number[] {
  const project = (v: number[]) => (cap ? projectCapped(v, cap) : projectSimplex(v));
  let w = new Array(n).fill(1 / n);
  let lr = 0.1;
  for (let it = 0; it < 1500; it++) {
    const grad = matVec(S, w).map((g) => 2 * g); // d/dw w'Sw
    w = project(w.map((x, i) => x - lr * grad[i]));
    lr *= 0.999;
  }
  return w;
}

/* ----------------------------- frontier + cloud ----------------------------- */

// Smooth efficient frontier (closed form, unconstrained — the standard chart
// curve). variance(r) = (A r^2 - 2 B r + C) / D for the two-fund family.
function frontierCurve(mu: number[], invS: number[][]): FrontierPoint[] | null {
  const n = mu.length;
  const ones = new Array(n).fill(1);
  const invSone = matVec(invS, ones);
  const invSmu = matVec(invS, mu);
  const A = dot(ones, invSone);
  const B = dot(ones, invSmu);
  const C = dot(mu, invSmu);
  const D = A * C - B * B;
  if (Math.abs(A) < 1e-12 || Math.abs(D) < 1e-12) return null;
  const rGmv = B / A; // return of the global min-variance portfolio
  const muMax = Math.max(...mu);
  const top = Math.max(rGmv + 0.02, muMax); // draw the efficient (upper) branch
  const pts: FrontierPoint[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const r = rGmv + ((top - rGmv) * i) / steps;
    const varr = (A * r * r - 2 * B * r + C) / D;
    if (varr > 0) pts.push({ x: Math.round(Math.sqrt(varr) * 1000) / 10, y: Math.round(r * 1000) / 10 });
  }
  return pts;
}

function randomStarts(n: number, count: number, seed: number): number[][] {
  const rnd = mulberry(seed);
  const out: number[][] = [];
  for (let k = 0; k < count; k++) {
    const v = Array.from({ length: n }, () => -Math.log(Math.max(1e-9, rnd())));
    const s = v.reduce((a, b) => a + b, 0);
    out.push(v.map((x) => x / s));
  }
  return out;
}

// Random long-only portfolios for the scatter behind the frontier.
function randomCloud(mu: number[], S: number[][], rf: number, count: number, seed: number): FrontierPoint[] {
  const n = mu.length;
  const rnd = mulberry(seed);
  const pts: FrontierPoint[] = [];
  for (let k = 0; k < count; k++) {
    const v = Array.from({ length: n }, () => -Math.log(Math.max(1e-9, rnd())));
    const sum = v.reduce((a, b) => a + b, 0);
    const w = v.map((x) => x / sum);
    const s = stats(w, mu, S, rf);
    pts.push({ x: s.vol, y: s.ret });
  }
  return pts;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------- public entry ----------------------------- */

export type OptimizeOptions = {
  weights?: number[]; // current weights (will be normalised); defaults to equal
  riskFreeAnnual?: number; // decimal, default 0.045
  maxWeight?: number; // optional long-only per-asset cap (e.g. 0.35)
  minObservations?: number; // default 60 daily points
};

export function optimizePortfolio(
  symbols: string[],
  returns: number[][],
  opts: OptimizeOptions = {},
): OptimizeResult {
  const n = symbols.length;
  const rf = opts.riskFreeAnnual ?? 0.045;
  const minObs = opts.minObservations ?? 60;
  const notes: string[] = [];
  const points = Math.min(...returns.map((r) => r.length), Infinity);

  const empty = (): OptimizedPortfolio => ({ weights: new Array(n).fill(0), ret: 0, vol: 0, sharpe: 0 });

  if (n < 2 || !isFinite(points) || points < minObs) {
    notes.push(`Need at least 2 holdings with ${minObs}+ overlapping price points to optimise.`);
    return {
      ok: false, symbols, riskFree: Math.round(rf * 1000) / 10,
      expectedReturns: symbols.map((s) => ({ symbol: s, mu: 0 })),
      current: null, minVariance: empty(), maxSharpe: empty(),
      frontier: [], cloud: [], suggestions: [], notes,
    };
  }

  const mu = expectedReturns(returns);
  const S = covMatrix(returns);
  const invS = invert(S);
  const cap = opts.maxWeight;

  // Current weights (normalise; default equal-weight).
  let curW: number[] | null = null;
  if (opts.weights && opts.weights.length === n) {
    const sum = opts.weights.reduce((a, b) => a + Math.max(0, b), 0);
    if (sum > 0) curW = opts.weights.map((w) => Math.max(0, w) / sum);
  }
  if (!curW) curW = new Array(n).fill(1 / n);

  const minVar = minVarianceLongOnly(S, cap, n);
  const maxShr = maxSharpeLongOnly(mu, S, rf, cap, minVar);

  const current = stats(curW, mu, S, rf);
  const minVariance = stats(minVar, mu, S, rf);
  const maxSharpe = stats(maxShr, mu, S, rf);

  const frontier = invS ? frontierCurve(mu, invS) ?? [] : [];
  if (!invS) notes.push("Covariance matrix was singular; frontier curve unavailable (holdings may be near-identical).");
  const cloud = randomCloud(mu, S, rf, 140, 1234 + n);

  // Rebalance suggestions: current -> max-Sharpe, biggest moves first, rounded
  // to whole-percent and filtered to material (>= 1pt) changes.
  const suggestions: RebalanceSuggestion[] = symbols
    .map((symbol, i) => {
      const from = Math.round(current.weights[i] * 1000) / 10;
      const to = Math.round(maxSharpe.weights[i] * 1000) / 10;
      return { symbol, from, to, delta: Math.round((to - from) * 10) / 10 };
    })
    .filter((s) => Math.abs(s.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    ok: true, symbols, riskFree: Math.round(rf * 1000) / 10,
    expectedReturns: symbols.map((s, i) => ({ symbol: s, mu: Math.round(mu[i] * 1000) / 10 })),
    current, minVariance, maxSharpe, frontier, cloud, suggestions, notes,
  };
}

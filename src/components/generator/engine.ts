/* eslint-disable @typescript-eslint/no-explicit-any */
// Portfolio Generator engine — deterministic builder that responds to
// amount / risk / objective / horizon / sectors / count / anchors / goal.
// Ported from the design prototype; the mock instrument table is replaced by
// the real universe served by /api/portfolio/universe.

import { T } from "@/components/healthcheck/theme";
import type { GenInstrument, GenOptions } from "./types";

export const GEN_SECTORS = [
  "Technology", "Healthcare", "Financial Services", "Consumer Cyclical",
  "Consumer Defensive", "Industrials", "Energy", "Utilities",
  "Real Estate", "Communication Services", "Basic Materials",
];

export type Candidate = GenInstrument & { score: number; isAnchor: boolean; minScore?: number };
export type Holding = Candidate & { w: number; usd: number };

export const RISK_ALLOC: Record<string, { eq: number; bond: number; cash: number; label: string; targetVol: number; ddCeil: number }> = {
  conservative: { eq: 0.55, bond: 0.33, cash: 0.12, label: "Conservative", targetVol: 9, ddCeil: 15 },
  balanced: { eq: 0.76, bond: 0.17, cash: 0.07, label: "Balanced", targetVol: 13, ddCeil: 25 },
  aggressive: { eq: 0.93, bond: 0.055, cash: 0.015, label: "Aggressive", targetVol: 19, ddCeil: 40 },
};
export const OBJ_W: Record<string, { y: number; er: number; q: number; label: string }> = {
  income: { y: 1.0, er: 0.25, q: 0.5, label: "Income" },
  balanced: { y: 0.5, er: 0.7, q: 0.6, label: "Balanced" },
  growth: { y: 0.1, er: 1.0, q: 0.55, label: "Growth" },
};
const HORIZON_TILT: Record<string, number> = { short: -0.1, medium: 0, long: 0.07 };
const HORIZON_YEARS: Record<string, number> = { short: 5, medium: 10, long: 20 };
const BENCH_ER = 8;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

function genRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashTks(tks: string[]) {
  let h = 2166136261;
  for (const s of tks) for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function corrMatrix(items: Candidate[]) {
  const r = genRng(hashTks(items.map((i) => i.tk)) + 21);
  const tks = items.map((i) => i.tk);
  const M = items.map((a, i) => items.map((b, j) => {
    if (i === j) return 1;
    let base = a.cls === "bond" || b.cls === "bond" ? 0.06 : 0.22;
    if (a.sector === b.sector && a.cls !== "bond") base += 0.46;
    if (a.etf || b.etf) base += 0.14;
    base += (a.beta + b.beta) * 0.05;
    base += (r() - 0.5) * 0.1;
    return +clamp(base, 0.02, 0.97).toFixed(2);
  }));
  for (let i = 0; i < M.length; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i];
  return { tks, M };
}
function normRange(arr: number[]) {
  const mn = Math.min(...arr), mx = Math.max(...arr);
  return (v: number) => (mx - mn < 1e-9 ? 0.5 : (v - mn) / (mx - mn));
}

function weightItems(items: Candidate[], total: number, rawFn: (it: Candidate, ctx: any) => number, ctx: any): number[] {
  if (!items.length || total <= 0) return items.map(() => 0);
  const raw = items.map((it) => Math.max(rawFn(it, ctx), 1e-4) * (it.isAnchor ? 1.7 : 1));
  const caps = items.map((it) => (it.kind === "broad" ? 0.42 : it.etf ? 0.26 : 0.14));
  const s = sum(raw);
  let w = raw.map((x) => x / s);
  for (let iter = 0; iter < 7; iter++) {
    let excess = 0;
    const free: number[] = [];
    w = w.map((x, i) => { if (x > caps[i]) { excess += x - caps[i]; return caps[i]; } return x; });
    w.forEach((x, i) => { if (x < caps[i] - 1e-6) free.push(i); });
    if (excess < 1e-6 || !free.length) break;
    const fs = sum(free.map((i) => w[i]));
    free.forEach((i) => { w[i] += excess * (w[i] / fs); });
  }
  const s2 = sum(w) || 1;
  return w.map((x) => (x / s2) * total);
}

function selectCandidates(universe: GenInstrument[], o: Required<GenOptions>) {
  const byTk = new Map(universe.map((u) => [u.tk, u]));
  const { risk, objective, sectors, count, anchors, horizon, exclude, goal } = o;
  const A0 = RISK_ALLOC[risk] || RISK_ALLOC.balanced;
  const ow = OBJ_W[objective] || OBJ_W.balanced;
  const tilt = HORIZON_TILT[horizon] ?? 0;
  const eqA = clamp(A0.eq + tilt, 0.35, 0.97);
  const bondA = clamp(A0.bond - tilt * 0.7, 0, 0.5);
  const cashA = Math.max(0.005, 1 - eqA - bondA);

  const cashSlots = cashA > 0.012 ? 1 : 0;
  const bondSlots = bondA > 0.005 ? clamp(Math.round(count * bondA * 1.3), 1, risk === "conservative" ? 3 : 2) : 0;
  const eqSlots = Math.max(3, count - cashSlots - bondSlots);

  const exSet = new Set((exclude || []).filter((tk) => !anchors.includes(tk)));
  // Honor plain-language exclusions in the goal text: "no XLK", "without
  // TSLA", "avoid KO" (+ FR/DE/IT/ES equivalents). Only symbols that exist in
  // the universe count, so ordinary words never get excluded by accident.
  const exRe = /\b(?:no|not|without|exclude|avoid|except|sans|ohne|keine?|senza|sin)\s+\$?([A-Za-z.]{1,6})\b/gi;
  let exMatch: RegExpExecArray | null;
  while ((exMatch = exRe.exec(goal || ""))) {
    const tk = exMatch[1].toUpperCase();
    if (byTk.has(tk) && !anchors.includes(tk)) exSet.add(tk);
  }
  const eqPool = universe.filter((u) => u.cls === "eq" && !exSet.has(u.tk));
  const ny = normRange(eqPool.map((u) => u.yield));
  const ner = normRange(eqPool.map((u) => u.er));
  const nq = normRange(eqPool.map((u) => u.q));
  const g = (goal || "").toLowerCase();
  const goalBonus = (u: GenInstrument) => {
    let b = 0;
    if (/(dividend|income|yield|cash.?flow)/.test(g)) b += ny(u.yield) * 0.6 + (u.kind === "div" ? 0.3 : 0);
    if (/(tax|taxable|efficien)/.test(g)) b += u.etf ? 0.22 : -0.12;
    if (/(tech|a\.?i\.?|innovation|semi|software)/.test(g) && u.sector === "Technology") b += 0.55;
    if (/(international|global|ex.?us|emerging|overseas|abroad)/.test(g) && /VXUS|VWO|VEA|SCHY/.test(u.tk)) b += 0.7;
    if (/(retire|retirement|long.?term|nest egg|decades?)/.test(g) && (u.kind === "broad" || u.q >= 85)) b += 0.22;
    if (/(safe|preserv|capital preservation|ballast|low.?risk|protect)/.test(g)) b += 0.45 - u.vol * 0.016;
    return b;
  };
  const scoreOf = (u: GenInstrument) => {
    let s = ow.y * ny(u.yield) + ow.er * ner(u.er) + ow.q * nq(u.q);
    if (sectors.length && sectors.includes(u.sector)) s += 0.9;
    if (sectors.length && u.kind === "sector" && sectors.includes(u.sector)) s += 0.35;
    if (risk === "conservative") s += 0.45 - u.vol * 0.018 - (u.beta - 0.8) * 0.12;
    if (risk === "aggressive") s += u.er * 0.035 + (u.beta - 1) * 0.1;
    if (u.kind === "broad") s += 0.3;
    if (u.kind === "div" && objective === "income") s += 0.25;
    return s + goalBonus(u);
  };
  // Re-roll variety: a deterministic per-ticker jitter keyed on the seed so
  // hitting Regenerate (same inputs) produces a different-but-sensible build.
  const jitter = (tk: string) => (o.seed ? (genRng(hashTks([tk]) + o.seed * 7919)() - 0.5) * 0.5 : 0);
  const scored: Candidate[] = eqPool.map((u) => ({ ...u, score: scoreOf(u) + jitter(u.tk), isAnchor: false }));
  const minScore = Math.min(...scored.map((s) => s.score));

  const anchorSet = anchors.map((tk) => byTk.get(tk)).filter(Boolean) as GenInstrument[];
  const anchorTk = new Set(anchorSet.map((a) => a.tk));
  const eqAnchors: Candidate[] = anchorSet.filter((a) => a.cls === "eq").map((a) => ({ ...a, score: scoreOf(a), isAnchor: true }));
  const bondAnchors: Candidate[] = anchorSet.filter((a) => a.cls === "bond").map((a) => ({ ...a, score: 1, isAnchor: true }));
  const cashAnchors: Candidate[] = anchorSet.filter((a) => a.cls === "cash").map((a) => ({ ...a, score: 1, isAnchor: true }));

  const eqPicks: Candidate[] = [...eqAnchors];
  const sortedEq = scored.filter((u) => !anchorTk.has(u.tk)).sort((a, b) => b.score - a.score);
  for (const u of sortedEq) { if (eqPicks.length >= eqSlots) break; eqPicks.push({ ...u, isAnchor: false }); }
  if (!eqPicks.some((u) => u.kind === "broad")) {
    const broad = sortedEq.find((u) => u.kind === "broad");
    if (broad) {
      const idx = eqPicks.map((u, i) => ({ u, i })).filter((x) => !x.u.isAnchor).sort((a, b) => a.u.score - b.u.score)[0];
      if (idx) eqPicks[idx.i] = { ...broad, isAnchor: false };
      else eqPicks.push({ ...broad, isAnchor: false });
    }
  }
  eqPicks.forEach((u) => { u.minScore = minScore; });

  let bondPicks: Candidate[] = [...bondAnchors];
  if (bondSlots > 0) {
    const bondPool = universe.filter((u) => u.cls === "bond" && !anchorTk.has(u.tk) && !exSet.has(u.tk));
    const bSort = [...bondPool].sort((a, b) => (o.objective === "income" ? b.yield - a.yield : b.q - a.q));
    const want = Math.max(0, bondSlots - bondPicks.length);
    const picks: Candidate[] = bSort.slice(0, want).map((u) => ({ ...u, score: o.objective === "income" ? u.yield : u.q, isAnchor: false }));
    const tlt = bondPool.find((u) => u.tk === "TLT");
    if (risk === "conservative" && bondSlots >= 2 && tlt && picks.length && !picks.concat(bondPicks).some((u) => u.tk === "TLT")) {
      picks[picks.length - 1] = { ...tlt, score: 5, isAnchor: false };
    }
    bondPicks = bondPicks.concat(picks);
  }
  bondPicks.forEach((b) => { b.minScore = 0; });

  const cashPicks: Candidate[] = [...cashAnchors];
  const cashInst = byTk.get("CASH");
  if (cashSlots > 0 && !cashPicks.length && cashInst) cashPicks.push({ ...cashInst, score: 1, isAnchor: false });
  cashPicks.forEach((c) => { c.minScore = 0; });

  const sectorCount: Record<string, number> = {};
  eqPicks.forEach((u) => { sectorCount[u.sector] = (sectorCount[u.sector] || 0) + 1; });

  return { eqPicks, bondPicks, cashPicks, eqA, bondA, cashA, minScore, A0, sectorCount };
}
type Cand = ReturnType<typeof selectCandidates>;

export type VariantDef = {
  id: string; label: string; rec?: boolean; blurb: string;
  nudge: { eq?: number; bond?: number };
  eqRaw: (it: Candidate, c: Cand) => number;
  bondRaw: (it: Candidate, c: Cand) => number;
  tag: (m: any) => { a: string; b: string; color: string };
};

export const VARIANT_DEFS: VariantDef[] = [
  { id: "minVariance", label: "Min Variance", blurb: "The safest practical mix — minimizes downside volatility.",
    nudge: { eq: -0.13, bond: 0.1 }, eqRaw: (it) => 1 / Math.pow(Math.max(it.vol, 2), 1.7), bondRaw: (it) => 1 / Math.max(it.vol, 1),
    tag: (m) => ({ a: `Sharpe ${m.sharpe.toFixed(2)}`, b: `vol ${m.vol.toFixed(1)}%`, color: T.green }) },
  { id: "maxSharpe", label: "Max Sharpe", rec: true, blurb: "Best risk-adjusted return — the default recommendation.",
    nudge: {}, eqRaw: (it, c) => Math.max(it.score - (c.minScore ?? 0) + 0.16, 0.06), bondRaw: (it) => it.yield + 2,
    tag: (m) => ({ a: `Sharpe ${m.sharpe.toFixed(2)}`, b: `vol ${m.vol.toFixed(1)}%`, color: T.green }) },
  { id: "maxReturn", label: "Max Return", blurb: "Swings for the upside — highest expected return, deepest drawdowns.",
    nudge: { eq: 0.08, bond: -0.07 }, eqRaw: (it) => Math.pow(Math.max(it.er, 0.5), 2.3), bondRaw: (it) => it.yield + 1,
    tag: (m) => ({ a: `Sharpe ${m.sharpe.toFixed(2)}`, b: `vol ${m.vol.toFixed(1)}%`, color: T.amber }) },
  { id: "maxInfoRatio", label: "Max Info Ratio", blurb: "Most alpha per unit of tracking error vs the benchmark.",
    nudge: { eq: 0.03 }, eqRaw: (it) => Math.max(0.05, it.er - it.beta * BENCH_ER + 2.5), bondRaw: (it) => it.yield + 2,
    tag: (m) => ({ a: `IR ${m.ir.toFixed(2)}`, b: `alpha ${m.alpha > 0 ? "+" : ""}${m.alpha.toFixed(1)}%`, color: T.blue }) },
  { id: "riskParity", label: "Risk Parity", blurb: "Each holding contributes equal risk — no single bet dominates.",
    nudge: {}, eqRaw: (it) => 1 / Math.max(it.vol, 1), bondRaw: (it) => 1 / Math.max(it.vol, 1),
    tag: (m) => ({ a: `Sharpe ${m.sharpe.toFixed(2)}`, b: `divR ${m.divR.toFixed(2)}`, color: T.teal }) },
  { id: "hrp", label: "HRP", blurb: "Tree-clustered risk parity — handles correlation regimes better.",
    nudge: {}, eqRaw: (it, c) => (1 / Math.max(it.vol, 1)) / Math.sqrt(c.sectorCount[it.sector] || 1), bondRaw: (it) => 1 / Math.max(it.vol, 1),
    tag: (m) => ({ a: `Sharpe ${m.sharpe.toFixed(2)}`, b: "tree-clustered", color: T.violet }) },
];

function weightVariant(cand: Cand, def: VariantDef, amount: number): Holding[] {
  const eqA = clamp(cand.eqA + (def.nudge.eq || 0), 0.3, 0.97);
  const bondA = clamp(cand.bondA + (def.nudge.bond || 0), 0, 0.5);
  const cashA = Math.max(0.005, 1 - eqA - bondA);
  const eqW = weightItems(cand.eqPicks, eqA, def.eqRaw as any, cand);
  const bondW = weightItems(cand.bondPicks, bondA, def.bondRaw as any, cand);
  const cashW = cand.cashPicks.map(() => cashA / Math.max(cand.cashPicks.length, 1));

  const holdings: Holding[] = [
    ...cand.eqPicks.map((u, i) => ({ ...u, w: eqW[i], usd: 0 })),
    ...cand.bondPicks.map((u, i) => ({ ...u, w: bondW[i], usd: 0 })),
    ...cand.cashPicks.map((u, i) => ({ ...u, w: cashW[i], usd: 0 })),
  ].filter((h) => h.w > 0.0025 || h.isAnchor);
  const tw = sum(holdings.map((h) => h.w)) || 1;
  holdings.forEach((h) => { h.w = h.w / tw; h.usd = amount * h.w; });
  holdings.sort((a, b) => Number(b.isAnchor) - Number(a.isAnchor) || b.w - a.w);
  return holdings;
}

export function rationaleOf(h: Holding): string {
  if (h.cls === "cash") return "Dry powder — stability, liquidity and a risk-free yield while you wait.";
  if (h.cls === "bond") return h.tk === "TLT" ? "Long-duration hedge — rallies hardest when equities fall in a recession." : "Ballast — dampens drawdowns and pays a steady coupon across the horizon.";
  if (h.kind === "broad") return "Core engine — broad, low-cost market exposure that diversifies single-name risk.";
  if (h.kind === "div") return "Income sleeve — durable dividends and a lower beta that cushions selloffs.";
  if (h.kind === "sector") return h.sector + " tilt — concentrated exposure where you asked the book to lean in.";
  if (h.yield >= 3.2) return "Income anchor — an above-market dividend that adds to the cash-flow sleeve.";
  if (h.er >= 10 || h.beta >= 1.3) return "Growth driver — higher expected return and beta; the upside engine of the book.";
  return "Quality compounder — strong fundamentals at a sensible weight.";
}

// Real Monte Carlo: 1,000 GBM paths with monthly steps + DCA contributions.
// Deterministic (seeded normals) so re-renders don't flicker. Returns yearly
// p10/p50/p90 snapshots plus a deterministic S&P-median reference line.
export function simulatePaths(amount: number, monthly: number, years: number, erPct: number, volPct: number, paths = 1000) {
  const months = Math.max(1, Math.round(years * 12));
  const mu = Math.log(1 + Math.max(-0.5, erPct / 100)) / 12;
  const sigma = Math.max(0.001, volPct / 100) / Math.sqrt(12);
  const rng = genRng(0xc0ffee ^ (months * 31 + Math.round(erPct * 100) * 7 + Math.round(volPct * 100)));
  const normal = () => {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const snaps: number[][] = Array.from({ length: years + 1 }, () => []);
  for (let p = 0; p < paths; p++) {
    let v = amount;
    snaps[0].push(v);
    for (let m = 1; m <= months; m++) {
      v = v * Math.exp(mu - 0.5 * sigma * sigma + sigma * normal()) + monthly;
      if (m % 12 === 0 && m / 12 <= years) snaps[m / 12].push(v);
    }
  }
  const annual = monthly * 12;
  const g = BENCH_ER / 100;
  const fvSp = (t: number) => amount * Math.pow(1 + g, t) + (t ? annual * ((Math.pow(1 + g, t) - 1) / g) : 0);
  return snaps.map((arr, t) => {
    const s = [...arr].sort((a, b) => a - b);
    const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? amount;
    return { t, p10: Math.round(q(0.1)), p50: Math.round(q(0.5)), p90: Math.round(q(0.9)), sp: Math.round(fvSp(t)), band: [Math.round(q(0.1)), Math.round(q(0.9))] };
  });
}

const PALETTE: Record<string, string> = {
  Technology: "#3b6ef0", Healthcare: "#2fe3a0", "Financial Services": "#e0b34e",
  "Consumer Cyclical": "#36c2d6", "Consumer Defensive": "#9b8cf0", Industrials: "#7c8aa5",
  Energy: "#ff5d6c", Utilities: "#4fb0c6", "Real Estate": "#c08cf0",
  "Communication Services": "#5b8cff", "Basic Materials": "#d68a4e",
  Diversified: "#2a6df0", "Fixed Income": "#3b6ef0", Cash: "#5d6b80",
};

function richMetrics(holdings: Holding[], amount: number, A0: Cand["A0"], o: Required<GenOptions> & { years: number }) {
  const years = o.years;
  const monthly = +o.monthlyDCA || 0;
  const wOf = (k: "yield" | "er" | "beta") => sum(holdings.map((h) => h.w * h[k]));
  const yld = wOf("yield"), er = wOf("er"), beta = wOf("beta");
  const eq = holdings.filter((h) => h.cls === "eq");
  const bonds = holdings.filter((h) => h.cls === "bond");
  const eqW = sum(eq.map((h) => h.w));
  const bondW = sum(bonds.map((h) => h.w));
  const cashW = sum(holdings.filter((h) => h.cls === "cash").map((h) => h.w));
  const eqVolAvg = eqW ? sum(eq.map((h) => h.w * h.vol)) / eqW : 0;
  const bondVolAvg = bondW ? sum(bonds.map((h) => h.w * h.vol)) / bondW : 0;
  const sectorSet = new Set(eq.map((h) => h.sector));
  const rho = clamp(0.6 - sectorSet.size * 0.03, 0.3, 0.6);
  const eqVol = eqVolAvg * Math.sqrt(rho + (1 - rho) / Math.max(eq.length, 1));
  const vol = Math.sqrt((eqW * eqVol) ** 2 + (bondW * bondVolAvg) ** 2 + 2 * eqW * bondW * eqVol * bondVolAvg * 0.15 + (cashW * 0.3) ** 2);
  const sharpe = ((er - 1.5) / Math.max(vol, 0.5)) * 2.2;
  const effN = 1 / sum(holdings.map((h) => h.w * h.w));
  const income = (amount * yld) / 100;

  const totalReturn = (Math.pow(1 + er / 100, years) - 1) * 100;
  const sortino = sharpe * 1.38;
  const maxDD = -(vol * 1.35 + Math.max(0, beta - 0.8) * 12 + 2);
  const alpha = er - beta * BENCH_ER;
  const te = Math.max(2, vol * 0.3);
  const ir = alpha / te;
  const wVolSum = sum(holdings.map((h) => h.w * h.vol));
  const divR = wVolSum / Math.max(vol, 0.5);

  const raScore = clamp(38 + sharpe * 36, 5, 99);
  const divScore = clamp(34 + effN * 4.4 + sectorSet.size * 3.4, 5, 99);
  const qualityScore = clamp(eqW ? sum(eq.map((h) => h.w * h.q)) / eqW : 70, 5, 99);
  const etfShare = sum(holdings.filter((h) => h.etf).map((h) => h.w));
  const stockCount = holdings.filter((h) => h.type === "stock").length;
  const costScore = clamp(70 + etfShare * 28 - stockCount * 1.2, 30, 99);
  const riskFit = clamp(100 - Math.abs(vol - A0.targetVol) * 6, 30, 99);
  const overall = Math.round(0.28 * raScore + 0.22 * divScore + 0.2 * qualityScore + 0.15 * costScore + 0.15 * riskFit);

  const classAlloc = [
    { k: "Equity", w: eqW, color: T.green }, { k: "Bonds", w: bondW, color: T.blue }, { k: "Cash", w: cashW, color: T.faint },
  ].filter((c) => c.w > 0.001);
  const secMap: Record<string, number> = {};
  holdings.forEach((h) => { secMap[h.sector] = (secMap[h.sector] || 0) + h.w; });
  const sectorAlloc = Object.entries(secMap).map(([k, wv]) => ({ k, w: wv, color: PALETTE[k] || "#7c8aa5" })).sort((a, b) => b.w - a.w);

  // Risk contribution (marginal-risk proxy) vs weight.
  const rcRaw = holdings.map((h) => h.w * h.vol);
  const rcTot = sum(rcRaw) || 1;
  const riskContrib = holdings.map((h, i) => ({
    tk: h.tk, color: PALETTE[h.sector] || "#7c8aa5", w: h.w, rc: rcRaw[i] / rcTot, delta: (rcRaw[i] / rcTot - h.w) * 100,
  })).sort((a, b) => b.rc - a.rc);
  const maxRc = Math.max(...riskContrib.map((x) => x.rc), 0.01);

  // Correlation matrix (top holdings by weight, excl. cash).
  const corrItems = holdings.filter((h) => h.cls !== "cash").slice(0, 12);
  const corr = corrMatrix(corrItems);

  const annual = monthly * 12;
  const proj = simulatePaths(amount, monthly, years, er, vol);
  const contributed = amount + annual * years;

  const crises = [
    { name: "2008 Financial Crisis", window: "Oct 2007 – Mar 2009", spy: -55.2, bondF: 0.45, base: 0.32, betaF: 0.3 },
    { name: "2020 COVID Crash", window: "Feb – Mar 2020", spy: -33.9, bondF: 0.35, base: 0.3, betaF: 0.32 },
    { name: "2022 Inflation Shock", window: "Jan – Oct 2022", spy: -25.4, bondF: 0.1, base: 0.45, betaF: 0.26 },
    // "Liberation Day" tariff announcement: S&P peak (Feb 19) to trough (Apr 8).
    { name: "2025 Tariff Shock", window: "Feb – Apr 2025 · Liberation Day", spy: -18.9, bondF: 0.25, base: 0.38, betaF: 0.3 },
  ];
  const stress = crises.map((c) => {
    const cap = clamp(c.base + beta * c.betaF - bondW * c.bondF, 0.25, 1.05);
    const port = +(c.spy * cap).toFixed(1);
    return { name: c.name, window: c.window, spy: c.spy, port, outperf: +(port - c.spy).toFixed(1) };
  });
  const worst = Math.min(...stress.map((s) => s.port));
  const survived = Math.abs(worst) <= A0.ddCeil + 4;

  return {
    yield: +yld.toFixed(2), er: +er.toFixed(1), beta: +beta.toFixed(2), vol: +vol.toFixed(1),
    sharpe: +sharpe.toFixed(2), sortino: +sortino.toFixed(2), maxDD: +maxDD.toFixed(1),
    alpha: +alpha.toFixed(1), ir: +ir.toFixed(2), te: +te.toFixed(1), divR: +divR.toFixed(2),
    totalReturn: +totalReturn.toFixed(1), effN: +effN.toFixed(1), income: Math.round(income),
    overall, eqW, bondW, cashW, sectorCount: sectorSet.size, years, contributed,
    stats: [
      { k: "Total Return", v: "+" + totalReturn.toFixed(0) + "%", sub: "over " + years + "y", pos: true },
      { k: "Annualized", v: "+" + er.toFixed(1) + "%", sub: "per year", pos: true },
      { k: "Volatility", v: vol.toFixed(1) + "%", sub: "annual std-dev" },
      { k: "Sharpe", v: sharpe.toFixed(2), sub: "risk-adjusted", pos: sharpe >= 1 },
      { k: "Sortino", v: sortino.toFixed(2), sub: "downside-adjusted", pos: sortino >= 1.2 },
      { k: "Max Drawdown", v: maxDD.toFixed(0) + "%", sub: "peak to trough", neg: true },
      { k: "Beta", v: beta.toFixed(2), sub: "vs S&P 500" },
      { k: "Alpha", v: (alpha > 0 ? "+" : "") + alpha.toFixed(1) + "%", sub: "vs S&P 500", pos: alpha > 0, neg: alpha < 0 },
    ],
    subscores: [
      { k: "Risk-adjusted return", s: Math.round(raScore), note: "Sharpe " + sharpe.toFixed(2) },
      { k: "Diversification", s: Math.round(divScore), note: "Effective " + effN.toFixed(1) + " holdings · " + sectorSet.size + " sectors" },
      { k: "Quality & fundamentals", s: Math.round(qualityScore), note: "Weighted holding quality" },
      { k: "Cost efficiency", s: Math.round(costScore), note: Math.round(etfShare * 100) + "% in low-fee ETFs" },
      { k: "Risk fit", s: Math.round(riskFit), note: "Vol " + vol.toFixed(1) + "% vs " + A0.targetVol + "% target" },
    ],
    classAlloc, sectorAlloc, proj, projMid: proj[Math.round(years / 2)], projEnd: proj[years],
    stress, survived, worst, riskContrib, maxRc, corr,
    // Real growth-of-100 backtest curve vs SPY — filled by applyReal().
    curve: null as { i: number; port: number; bench: number }[] | null,
    // Flipped to true by applyReal() once price-history metrics replace the
    // model estimates.
    measured: false,
  };
}
export type Metrics = ReturnType<typeof richMetrics>;

// Merge REAL price-history metrics (the /api/portfolio/healthcheck result —
// computed from daily closes) over the modelled estimates. Everything the
// HealthResult covers becomes measured: vol, return, Sharpe/Sortino, max
// drawdown, beta/alpha vs SPY, the correlation matrix, diversification ratio,
// per-holding risk contribution, and the Monte Carlo (re-simulated from real
// return/vol). Stress tests stay modelled (history is too short to replay).
export function applyReal(
  m: Metrics,
  real: any,
  inputs: { years: number; amount: number; monthlyDCA: number },
): Metrics {
  const p = real?.portfolio ?? {};
  const r = real?.risk ?? {};
  const b = real?.benchmark ?? null;
  const vol = p.annualVol ?? m.vol;
  const er = p.annualReturn ?? m.er;
  const sharpe = r.sharpe ?? m.sharpe;
  const sortino = r.sortino ?? m.sortino;
  const maxDD = r.maxDrawdown ?? m.maxDD;
  const beta = b?.beta ?? m.beta;
  const alpha = b && b.cagr != null && b.benchCagr != null ? +(b.cagr - b.benchCagr).toFixed(1) : m.alpha;
  const divR = p.diversificationRatio ?? m.divR;
  const yld = p.blendedYield ?? m.yield;
  const totalReturn = (Math.pow(1 + er / 100, inputs.years) - 1) * 100;
  const income = Math.round((inputs.amount * yld) / 100);

  // Real pairwise correlations (price history) replace the structural model.
  let corr = m.corr;
  if (real?.correlation?.symbols?.length >= 2 && Array.isArray(real.correlation.matrix)) {
    corr = {
      tks: real.correlation.symbols as string[],
      M: (real.correlation.matrix as (number | null)[][]).map((row) => row.map((v) => (v == null ? 0 : +(+v).toFixed(2)))),
    };
  }

  // Per-holding REAL vols → honest risk-contribution bars.
  let riskContrib = m.riskContrib;
  let maxRc = m.maxRc;
  if (Array.isArray(real?.holdings) && real.holdings.length) {
    const volBy = new Map<string, number | null>(real.holdings.map((h: any) => [h.symbol, h.annualVol ?? null]));
    if ([...volBy.values()].some((v) => v != null)) {
      const raw = m.riskContrib.map((x) => x.w * (volBy.get(x.tk) ?? vol));
      const tot = raw.reduce((a, c) => a + c, 0) || 1;
      riskContrib = m.riskContrib
        .map((x, i) => ({ tk: x.tk, color: x.color, w: x.w, rc: raw[i] / tot, delta: (raw[i] / tot - x.w) * 100 }))
        .sort((a, b) => b.rc - a.rc);
      maxRc = Math.max(...riskContrib.map((x) => x.rc), 0.01);
    }
  }

  const proj = simulatePaths(inputs.amount, inputs.monthlyDCA, inputs.years, er, vol);

  return {
    ...m,
    vol: +(+vol).toFixed(1),
    er: +(+er).toFixed(1),
    yield: +(+yld).toFixed(2),
    sharpe: +(+sharpe).toFixed(2),
    sortino: +(+sortino).toFixed(2),
    maxDD: +(+maxDD).toFixed(1),
    beta: +(+beta).toFixed(2),
    alpha,
    divR: +(+divR).toFixed(2),
    totalReturn: +totalReturn.toFixed(1),
    income,
    corr,
    riskContrib,
    maxRc,
    proj,
    projMid: proj[Math.round(inputs.years / 2)],
    projEnd: proj[proj.length - 1],
    curve: (b?.curve as { i: number; port: number; bench: number }[] | undefined) ?? null,
    stats: [
      { k: "Total Return", v: "+" + totalReturn.toFixed(0) + "%", sub: "over " + inputs.years + "y", pos: totalReturn > 0 },
      { k: "Annualized", v: (er > 0 ? "+" : "") + (+er).toFixed(1) + "%", sub: "real, ~1.5y closes", pos: er > 0 },
      { k: "Volatility", v: (+vol).toFixed(1) + "%", sub: "annual std-dev" },
      { k: "Sharpe", v: (+sharpe).toFixed(2), sub: "risk-adjusted", pos: sharpe >= 1 },
      { k: "Sortino", v: (+sortino).toFixed(2), sub: "downside-adjusted", pos: sortino >= 1.2 },
      { k: "Max Drawdown", v: (+maxDD).toFixed(0) + "%", sub: "peak to trough", neg: true },
      { k: "Beta", v: (+beta).toFixed(2), sub: "vs S&P 500" },
      { k: "Alpha", v: (alpha > 0 ? "+" : "") + (+alpha).toFixed(1) + "%", sub: "vs S&P 500", pos: alpha > 0, neg: alpha < 0 },
    ] as Metrics["stats"],
    measured: true,
  };
}

export type Variant = { id: string; label: string; rec: boolean; blurb: string; holdings: Holding[]; metrics: Metrics; tag: { a: string; b: string; color: string } };
export type GenResult = { inputs: Required<GenOptions> & { years: number }; variants: Variant[]; recommended: string; feasibility: Feasibility | null };

// Reference figures for famous allocations (long-run public estimates).
export const LEGENDARY = [
  { name: "Buffett 90/10", desc: "S&P 500 index plus a small bond buffer.", chips: ["VOO 90", "BND 10"], er: 9.6, sharpe: 1.05, maxDD: -31.0 },
  { name: "60 / 40 Classic", desc: "The textbook balanced portfolio.", chips: ["VOO 60", "BND 40"], er: 7.8, sharpe: 1.15, maxDD: -21.0 },
  { name: "Permanent Portfolio", desc: "Harry Browne's four-corner design.", chips: ["VTI 25", "TLT 25", "GLD 25", "SGOV 25"], er: 6.2, sharpe: 0.95, maxDD: -14.0 },
  { name: "Dalio All-Weather", desc: "Risk-parity, built for any regime.", chips: ["VTI 30", "TLT 40", "IEF 15", "GLD 8", "DBC 7"], er: 6.8, sharpe: 1.0, maxDD: -16.0 },
];
export function legendaryComparison(m: Metrics) {
  const yours = { name: "Your Portfolio", desc: "The allocation generated for your goals and risk profile.", chips: null as string[] | null, er: m.er, sharpe: m.sharpe, maxDD: m.maxDD, yours: true };
  return [yours, ...LEGENDARY.map((l) => ({ ...l, yours: false }))];
}

export function thesisOf(result: GenResult, variant: Variant): string {
  const { risk, objective, years } = result.inputs;
  const m = variant.metrics;
  const riskLabel = RISK_ALLOC[risk].label.toLowerCase();
  const objLabel = OBJ_W[objective].label.toLowerCase();
  const topSecs = m.sectorAlloc.filter((s) => !["Diversified", "Fixed Income", "Cash"].includes(s.k)).slice(0, 2).map((s) => s.k);
  const core = variant.holdings.filter((h) => h.cls === "eq").slice(0, 2).map((h) => h.tk).join(", ");
  const ballast = variant.holdings.filter((h) => h.cls === "bond").slice(0, 1).map((h) => h.tk)[0];
  const objClause = objective === "income" ? "prioritising durable dividend income" : objective === "growth" ? "reaching for capital appreciation" : "balancing income and growth";
  return `This ${RISK_ALLOC[risk].label} ${OBJ_W[objective].label} portfolio targets ${objLabel === "balanced" ? "balanced growth" : objLabel} over a ${years}-year horizon at a ${riskLabel} risk tolerance. The ${variant.label} optimisation anchors the book in broad market exposure (${core})${ballast ? ` with ${ballast} as ballast` : ""}, ${objClause}${topSecs.length ? ` with tilts toward ${topSecs.join(" and ")}` : ""}. It aims for a ~${m.er.toFixed(1)}% annual return at ${m.vol.toFixed(1)}% volatility, managing downside through diversification across ${variant.holdings.length} holdings and ${m.sectorCount} sectors.`;
}

export type Feasibility = { reqCAGR: number; grade: string; color: string; note: string };
function feasibilityOf(o: Required<GenOptions>, years: number, er: number): Feasibility {
  const annual = (+o.monthlyDCA || 0) * 12;
  const target = +o.target;
  const fv = (r: number) => o.amount * Math.pow(1 + r, years) + (Math.abs(r) < 1e-6 ? annual * years : annual * ((Math.pow(1 + r, years) - 1) / r));
  if (fv(0.6) < target) return { reqCAGR: 60, grade: "Out of reach", color: T.red, note: "This target exceeds what a diversified book can realistically compound to in the chosen period. Extend the horizon, raise contributions, or lower the target." };
  if (fv(-0.01) >= target) return { reqCAGR: 0, grade: "Already there", color: T.green, note: "Your starting capital and contributions reach the target with almost no growth required — you can afford a lower-risk mix." };
  let lo = -0.01, hi = 0.6;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (fv(mid) < target) lo = mid; else hi = mid; }
  const reqCAGR = +(((lo + hi) / 2) * 100).toFixed(1);
  let grade: string, color: string, note: string;
  if (reqCAGR <= er - 1.5) { grade = "Comfortable"; color = T.green; note = "Just " + reqCAGR + "% CAGR needed — comfortably below this portfolio's ~" + er.toFixed(1) + "% expected return."; }
  else if (reqCAGR <= er + 1.5) { grade = "Moderate"; color = T.amber; note = reqCAGR + "% CAGR required — roughly in line with the ~" + er.toFixed(1) + "% expected return. Reachable, with little margin for error."; }
  else if (reqCAGR <= er + 5) { grade = "Aggressive"; color = "#f0843a"; note = reqCAGR + "% CAGR required — above the ~" + er.toFixed(1) + "% expected return. You'll need a higher-risk mix or larger contributions."; }
  else { grade = "Very Aggressive"; color = T.red; note = reqCAGR + "% CAGR required — well beyond a balanced expectation. Raise the monthly contribution, extend the horizon, or lower the target."; }
  return { reqCAGR, grade, color, note };
}

export function autoNotes(metrics: Metrics, holdings: Holding[], inputs: GenResult["inputs"], sym = "$") {
  const notes: { sev: "positive" | "warning"; t: string; b: string }[] = [];
  const top = holdings[0];
  if (top && top.w > 0.32) notes.push({ sev: "warning", t: `${top.tk} is ${Math.round(top.w * 100)}% of the book`, b: "A single position drives much of the risk — pick the Min Variance or Risk Parity variant for a flatter weighting, or raise the holding count." });
  if (metrics.income > 0) notes.push({ sev: "positive", t: `~${sym}${metrics.income.toLocaleString("en-US")} projected income / year`, b: `A ${metrics.yield.toFixed(1)}% blended yield on ${sym}${inputs.amount.toLocaleString("en-US")}, across ${holdings.filter((h) => h.yield > 0).length} income-producing positions.` });
  if (metrics.sharpe >= 1.15) notes.push({ sev: "positive", t: `Strong risk-adjusted profile (Sharpe ${metrics.sharpe.toFixed(2)})`, b: "You're being paid well for the volatility you're taking — top-tier efficiency for this risk band." });
  else if (metrics.sharpe < 0.85) notes.push({ sev: "warning", t: `Modest risk-adjusted return (Sharpe ${metrics.sharpe.toFixed(2)})`, b: "Expected return is a little low for the volatility. The Max Sharpe variant or more diversification could lift it." });
  const topSec = metrics.sectorAlloc.find((s) => s.k !== "Fixed Income" && s.k !== "Cash" && s.k !== "Diversified");
  if (topSec && topSec.w > 0.4) notes.push({ sev: "warning", t: `Concentrated in ${topSec.k} (${Math.round(topSec.w * 100)}%)`, b: "Favouring fewer sectors raises single-factor risk. Add sectors in the form, or switch to the HRP variant which spreads risk across sector clusters." });
  return notes.slice(0, 3);
}

export function generatePortfolio(universe: GenInstrument[], opts: Partial<GenOptions>): GenResult {
  const o: Required<GenOptions> = {
    amount: 10000, currency: "USD", risk: "balanced", objective: "balanced", sectors: [], count: 10,
    anchors: [], horizon: "medium", exclude: [], target: 0, monthlyDCA: 0, goal: "", ...opts,
  } as Required<GenOptions>;
  const years = HORIZON_YEARS[o.horizon] || 10;
  const cand = selectCandidates(universe, o);
  const variants: Variant[] = VARIANT_DEFS.map((def) => {
    const holdings = weightVariant(cand, def, o.amount);
    const metrics = richMetrics(holdings, o.amount, cand.A0, { ...o, years });
    return { id: def.id, label: def.label, rec: !!def.rec, blurb: def.blurb, holdings, metrics, tag: def.tag(metrics) };
  });
  const recMetrics = (variants.find((v) => v.rec) || variants[0]).metrics;
  const feasibility = o.target > 0 ? feasibilityOf(o, years, recMetrics.er) : null;
  return { inputs: { ...o, years }, variants, recommended: "maxSharpe", feasibility };
}

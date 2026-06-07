/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock sample-portfolio data for the FREE interactive Healthcheck demo. These
// three books (Income / Balanced / Growth) drive every section so a visitor can
// explore the full tool before connecting their own holdings. All figures are
// illustrative. Premium runs the same UI on the user's real holdings.

function mulberry(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function genEquity(seed: number, drift: number, vol: number, n = 36) {
  const r = mulberry(seed); const rb = mulberry(555); const a: any[] = []; let p = 100, b = 100;
  for (let i = 0; i < n; i++) {
    const shock = (r() - 0.5) * vol;
    p *= 1 + (drift + shock) / 100;
    b *= 1 + (0.72 + (rb() - 0.5) * 3.2) / 100;
    a.push({ m: i, port: +p.toFixed(1), bench: +b.toFixed(1) });
  }
  return a;
}
function genMonthly(seed: number, drift: number, vol: number, n = 36) {
  const r = mulberry(seed + 7); const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(+((drift + (r() - 0.5) * vol)).toFixed(1));
  return out;
}
function consistency(monthly: number[]) {
  const pos = monthly.filter((x) => x > 0).length;
  let streak = 0, best = 0;
  monthly.forEach((x) => { if (x > 0) { streak++; best = Math.max(best, streak); } else streak = 0; });
  let win = 0, winPos = 0;
  for (let i = 0; i + 12 <= monthly.length; i++) {
    win++; const cum = monthly.slice(i, i + 12).reduce((s, v) => s + v, 0); if (cum > 0) winPos++;
  }
  const sorted = [...monthly].sort((a, b) => a - b);
  return {
    posRate: Math.round((pos / monthly.length) * 100),
    longestUp: best,
    bestMonth: sorted[sorted.length - 1],
    worstMonth: sorted[0],
    rolling12: win ? Math.round((winPos / win) * 100) : 0,
    avgUp: +(monthly.filter((x) => x > 0).reduce((s, v) => s + v, 0) / Math.max(pos, 1)).toFixed(1),
    avgDown: +(monthly.filter((x) => x < 0).reduce((s, v) => s + v, 0) / Math.max(monthly.length - pos, 1)).toFixed(1),
  };
}
function genFrontier(seed: number, _curX: number, _curY: number, _optY: number, minX: number) {
  const r = mulberry(seed + 13); const cloud: any[] = [];
  for (let i = 0; i < 160; i++) {
    const x = 4 + r() * 22;
    const ceil = 2 + (x - 3) * 0.72 - Math.pow(Math.max(0, x - 11), 1.7) * 0.10;
    const y = ceil - r() * (3 + x * 0.32);
    cloud.push({ x: +x.toFixed(2), y: +Math.max(0.5, y).toFixed(2) });
  }
  const curve: any[] = [];
  for (let x = minX; x <= 24; x += 0.6) {
    const y = 2 + (x - 3) * 0.72 - Math.pow(Math.max(0, x - 11), 1.7) * 0.10;
    curve.push({ x: +x.toFixed(2), y: +y.toFixed(2) });
  }
  return { cloud, curve };
}
function genCorr(holdings: any[], seed: number) {
  const eq = holdings.filter((h) => h.type !== "cash" && h.type !== "bond").slice(0, 9);
  const r = mulberry(seed + 21);
  const tks = eq.map((h) => h.tk);
  const M = eq.map((a, i) => eq.map((b, j) => {
    if (i === j) return 1;
    let base = 0.2;
    if (a.sector === b.sector) base += 0.42;
    if (a.type === "etf" || b.type === "etf") base += 0.16;
    base += (a.beta + b.beta) * 0.06;
    base += (r() - 0.5) * 0.12;
    return +Math.max(0.05, Math.min(0.95, base)).toFixed(2);
  }));
  for (let i = 0; i < M.length; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i];
  return { tks, M };
}

export const PORTFOLIOS: any[] = [
  {
    id: "income", name: "Dividend Income", tagline: "Yield-first, low beta", icon: "coins",
    value: 486200, dayChg: 0.34, dayChgUsd: 1648, ytd: 7.8, divYield: 3.9, annualIncome: 18960,
    overall: 78,
    holdings: [
      { tk: "SCHD", name: "Schwab US Dividend Equity", type: "etf", sector: "Diversified", w: 22, beta: 0.86, vol: 14, rate: "A", rScore: 90, v: 78, q: 88, m: 60, etf: null, yield: 3.6, rc: 18.5, divg: 11.2, payout: 64 },
      { tk: "VYM", name: "Vanguard High Dividend", type: "etf", sector: "Diversified", w: 14, beta: 0.84, vol: 13, rate: "A−", rScore: 87, v: 74, q: 82, m: 58, etf: null, yield: 3.1, rc: 11.0, divg: 6.4, payout: 58 },
      { tk: "JEPI", name: "JPM Equity Premium Inc.", type: "etf", sector: "Diversified", w: 12, beta: 0.62, vol: 11, rate: "B+", rScore: 80, v: 66, q: 72, m: 64, etf: null, yield: 7.4, rc: 7.8, divg: 0, payout: 95 },
      { tk: "O", name: "Realty Income", type: "stock", sector: "Real Estate", w: 9, beta: 0.78, vol: 18, rate: "B+", rScore: 79, v: 70, q: 80, m: 44, etf: 7.1, yield: 5.6, rc: 9.4, divg: 4.3, payout: 76 },
      { tk: "PG", name: "Procter & Gamble", type: "stock", sector: "Cons. Staples", w: 8, beta: 0.45, vol: 16, rate: "A−", rScore: 85, v: 60, q: 90, m: 55, etf: 6.4, yield: 2.5, rc: 6.1, divg: 5.5, payout: 61 },
      { tk: "KO", name: "Coca-Cola", type: "stock", sector: "Cons. Staples", w: 7, beta: 0.55, vol: 15, rate: "B+", rScore: 82, v: 64, q: 86, m: 52, etf: 6.0, yield: 2.9, rc: 5.0, divg: 4.0, payout: 68 },
      { tk: "JNJ", name: "Johnson & Johnson", type: "stock", sector: "Health Care", w: 7, beta: 0.52, vol: 16, rate: "A−", rScore: 84, v: 72, q: 88, m: 48, etf: 6.8, yield: 3.1, rc: 5.4, divg: 5.7, payout: 55 },
      { tk: "VZ", name: "Verizon", type: "stock", sector: "Comm. Services", w: 6, beta: 0.42, vol: 19, rate: "B", rScore: 72, v: 84, q: 70, m: 40, etf: 5.9, yield: 6.3, rc: 5.0, divg: 2.0, payout: 57 },
      { tk: "XOM", name: "Exxon Mobil", type: "stock", sector: "Energy", w: 6, beta: 0.85, vol: 24, rate: "B+", rScore: 77, v: 80, q: 74, m: 58, etf: 6.1, yield: 3.3, rc: 7.7, divg: 2.4, payout: 41 },
      { tk: "SGOV", name: "iShares 0-3mo Treasury", type: "bond", sector: "Fixed Income", w: 6, beta: 0.0, vol: 1, rate: "A", rScore: 95, v: 90, q: 99, m: 50, etf: null, yield: 5.0, rc: 0.4, divg: 0, payout: 100 },
      { tk: "CASH", name: "Cash & Equivalents", type: "cash", sector: "Cash", w: 3, beta: 0.0, vol: 0, rate: "—", rScore: null, v: null, q: null, m: null, etf: null, yield: 4.6, rc: 0, divg: 0, payout: null },
    ],
    subscores: [
      { k: "Income Durability", s: 84, note: "Coverage strong; JEPI yield is return-of-premium" },
      { k: "Dividend Growth", s: 74, note: "Blended 5yr DGR 6.1%" },
      { k: "Quality & Fundamentals", s: 86, note: "Staples + healthcare anchor" },
      { k: "Cost Efficiency", s: 82, note: "Blended fee 0.10%" },
      { k: "Diversification", s: 71, note: "Effective 7.9 of 11" },
      { k: "Concentration", s: 66, note: "SCHD + VYM overlap" },
    ],
    risk: { vol: 11.2, beta: 0.71, sharpe: 1.18, sortino: 1.61, mdd: -14.2, var1d: -1.2, varUsd: -5834, var1m: -5.4, te: 4.1, r2: 0.84 },
    sectors: [
      { name: "Cons. Staples", w: 15, lt: 19.4, bench: 6.1, color: "#36c2d6" },
      { name: "Diversified ETF", w: 48, lt: 0, bench: 0, color: "#2a3a50" },
      { name: "Health Care", w: 7, lt: 13.8, bench: 11.6, color: "#2fe3a0" },
      { name: "Real Estate", w: 9, lt: 9.6, bench: 2.4, color: "#9b8cf0" },
      { name: "Energy", w: 6, lt: 8.2, bench: 3.4, color: "#ff5d6c" },
      { name: "Comm. Services", w: 6, lt: 6.4, bench: 9.1, color: "#3b6ef0" },
      { name: "Financials", w: 0, lt: 11.2, bench: 13.1, color: "#e0b34e" },
      { name: "Fixed Income / Cash", w: 9, lt: 9.0, bench: 0, color: "#5d6b80" },
    ],
    factors: [
      { f: "Income", port: 88, bench: 50 }, { f: "Value", port: 76, bench: 50 }, { f: "Quality", port: 84, bench: 60 },
      { f: "Momentum", port: 44, bench: 52 }, { f: "Low Vol", port: 82, bench: 50 }, { f: "Growth", port: 32, bench: 55 },
    ],
    lookthrough: [
      { tk: "AAPL", direct: 0, eff: 3.1 }, { tk: "MSFT", direct: 0, eff: 2.8 }, { tk: "HD", direct: 0, eff: 2.2 },
      { tk: "AVGO", direct: 0, eff: 1.9 }, { tk: "MRK", direct: 0, eff: 1.7 }, { tk: "PEP", direct: 0, eff: 1.6 },
    ],
    insights: [
      { sev: "positive", title: "Income is durable and well-covered", body: "Blended forward yield of 3.9% generates ~$18.9k/yr. Outside JEPI (whose distribution is return-of-premium, not growing), payout ratios sit at a healthy 55–68% — dividends are unlikely to be cut in a normal recession." },
      { sev: "warning", title: "SCHD + VYM overlap inflates real concentration", body: "Your two largest sleeves (36% combined) share ~190 underlying names and a 0.91 correlation. Effective diversification is 7.9 holdings, not 11 — the book is more concentrated in large-cap value than it looks." },
      { sev: "warning", title: "Dividend growth is below target", body: "Blended 5-year dividend growth rate is 6.1% — only ~3.6% real after inflation. VZ (2.0%) and JEPI (0%) are dragging the compounding engine; the income is high today but growing slowly." },
      { sev: "positive", title: "Low drawdown profile", body: "Portfolio beta of 0.71 and a −14.2% max drawdown vs −24% for the S&P. The staples + treasury sleeve cushions selloffs — this book is built to let you sleep." },
    ],
    actions: [
      "Consolidate VYM into SCHD to cut overlap, or swap VYM for a dividend-growth fund (e.g. DGRO/VIG) to lift the 6.1% DGR.",
      "Cap JEPI at 10% — it boosts headline yield but caps upside and its distribution doesn't grow with inflation.",
      "Add a small international dividend sleeve to lower the 0.84 correlation cluster and broaden income sources.",
    ],
    optimize: {
      income: [
        { from: "VYM 14%", to: "DGRO 14%", why: "Same low cost, +2.4pt higher 5yr dividend growth, lifts real income compounding.", impact: "DGR 6.1% → 8.0%" },
        { from: "Trim JEPI 12% → 8%", to: "Add O +2%, MO +2%", why: "Replaces return-of-premium yield with growing REIT/tobacco income.", impact: "Growing income +$640/yr" },
        { from: "Cash 3%", to: "SGOV 3%", why: "Idle cash earning 4.6% → 5.0% with no added risk.", impact: "+$120/yr carry" },
      ],
      ret: [
        { from: "VZ 6%", to: "AVGO 4% + cash 2%", why: "VZ is a value trap with 2% DGR; AVGO adds growth + a fast-growing dividend.", impact: "Exp. return +0.6pt" },
        { from: "KO 7% → 5%", to: "Add SCHG 2%", why: "Tilt 2pt toward quality growth to offset the heavy value/low-vol stance.", impact: "Sharpe 1.18 → 1.24" },
      ],
    },
    frontierCur: { x: 11.2, y: 8.4 }, frontierOpt: { x: 11.8, y: 10.6 }, frontierMin: { x: 8.1, y: 6.2 },
    frontierIdeas: [
      { label: "+ DGRO / − VYM", x: 11.0, y: 9.3 },
      { label: "+ Intl dividend", x: 10.2, y: 8.9 },
    ],
    seed: 101, drift: 0.86, eqVol: 3.0,
  },
  {
    id: "balanced", name: "Balanced Core", tagline: "Index core + quality", icon: "scale",
    value: 742500, dayChg: 0.61, dayChgUsd: 4512, ytd: 11.2, divYield: 1.9, annualIncome: 14108,
    overall: 84,
    holdings: [
      { tk: "VOO", name: "Vanguard S&P 500", type: "etf", sector: "Diversified", w: 30, beta: 1.0, vol: 16, rate: "A", rScore: 91, v: 60, q: 80, m: 66, etf: null, yield: 1.3, rc: 28, divg: 6.0, payout: 35 },
      { tk: "SCHD", name: "Schwab US Dividend", type: "etf", sector: "Diversified", w: 14, beta: 0.86, vol: 14, rate: "A", rScore: 90, v: 78, q: 88, m: 60, etf: null, yield: 3.6, rc: 11, divg: 11.2, payout: 64 },
      { tk: "QQQ", name: "Invesco QQQ Trust", type: "etf", sector: "Diversified", w: 12, beta: 1.12, vol: 21, rate: "A−", rScore: 87, v: 45, q: 82, m: 80, etf: null, yield: 0.6, rc: 14.5, divg: 9.0, payout: 22 },
      { tk: "MSFT", name: "Microsoft", type: "stock", sector: "Technology", w: 8, beta: 1.05, vol: 26, rate: "A", rScore: 92, v: 58, q: 95, m: 78, etf: 9.1, yield: 0.7, rc: 11.2, divg: 10.1, payout: 25 },
      { tk: "AAPL", name: "Apple", type: "stock", sector: "Technology", w: 7, beta: 1.18, vol: 28, rate: "A−", rScore: 86, v: 49, q: 91, m: 70, etf: 9.6, yield: 0.45, rc: 10.4, divg: 5.2, payout: 15 },
      { tk: "JNJ", name: "Johnson & Johnson", type: "stock", sector: "Health Care", w: 6, beta: 0.52, vol: 16, rate: "A−", rScore: 84, v: 72, q: 88, m: 48, etf: 6.8, yield: 3.1, rc: 4.6, divg: 5.7, payout: 55 },
      { tk: "JPM", name: "JPMorgan Chase", type: "stock", sector: "Financials", w: 6, beta: 1.04, vol: 24, rate: "A−", rScore: 84, v: 71, q: 82, m: 76, etf: 6.9, yield: 2.1, rc: 5.6, divg: 6.0, payout: 28 },
      { tk: "BND", name: "Vanguard Total Bond", type: "bond", sector: "Fixed Income", w: 8, beta: 0.08, vol: 6, rate: "A", rScore: 88, v: 80, q: 90, m: 45, etf: null, yield: 4.3, rc: 1.6, divg: 0, payout: 100 },
      { tk: "SGOV", name: "iShares 0-3mo Treasury", type: "bond", sector: "Fixed Income", w: 6, beta: 0.0, vol: 1, rate: "A", rScore: 95, v: 90, q: 99, m: 50, etf: null, yield: 5.0, rc: 0.3, divg: 0, payout: 100 },
      { tk: "CASH", name: "Cash & Equivalents", type: "cash", sector: "Cash", w: 3, beta: 0.0, vol: 0, rate: "—", rScore: null, v: null, q: null, m: null, etf: null, yield: 4.6, rc: 0, divg: 0, payout: null },
    ],
    subscores: [
      { k: "Risk-Adjusted Return", s: 86, note: "Sharpe 1.41 — top decile" },
      { k: "Quality & Fundamentals", s: 88, note: "Index core + quality tilts" },
      { k: "Cost Efficiency", s: 92, note: "Blended fee 0.05%" },
      { k: "Diversification", s: 82, note: "Effective 10.6 of 10" },
      { k: "Correlation / Overlap", s: 74, note: "Some VOO/QQQ overlap" },
      { k: "Concentration", s: 80, note: "Tech look-through 27%" },
    ],
    risk: { vol: 13.8, beta: 0.92, sharpe: 1.41, sortino: 1.92, mdd: -18.4, var1d: -1.5, varUsd: -11138, var1m: -6.8, te: 3.2, r2: 0.96 },
    sectors: [
      { name: "Technology", w: 15, lt: 27.4, bench: 31.2, color: "#3b6ef0" },
      { name: "Diversified ETF", w: 56, lt: 0, bench: 0, color: "#2a3a50" },
      { name: "Financials", w: 6, lt: 12.1, bench: 13.1, color: "#e0b34e" },
      { name: "Health Care", w: 6, lt: 11.4, bench: 11.6, color: "#2fe3a0" },
      { name: "Comm. Services", w: 0, lt: 8.2, bench: 9.1, color: "#3b6ef0" },
      { name: "Cons. Discretionary", w: 0, lt: 9.0, bench: 10.4, color: "#36c2d6" },
      { name: "Fixed Income / Cash", w: 17, lt: 17.0, bench: 0, color: "#5d6b80" },
      { name: "Other sectors", w: 0, lt: 14.9, bench: 21.2, color: "#9b8cf0" },
    ],
    factors: [
      { f: "Growth", port: 62, bench: 55 }, { f: "Value", port: 56, bench: 50 }, { f: "Quality", port: 80, bench: 60 },
      { f: "Momentum", port: 64, bench: 52 }, { f: "Low Vol", port: 60, bench: 50 }, { f: "Income", port: 58, bench: 50 },
    ],
    lookthrough: [
      { tk: "AAPL", direct: 7.0, eff: 11.8 }, { tk: "MSFT", direct: 8.0, eff: 12.9 }, { tk: "NVDA", direct: 0, eff: 5.1 },
      { tk: "AMZN", direct: 0, eff: 3.4 }, { tk: "GOOGL", direct: 0, eff: 3.0 }, { tk: "META", direct: 0, eff: 2.4 },
    ],
    insights: [
      { sev: "positive", title: "Textbook risk-adjusted profile", body: "Sharpe of 1.41 and Sortino 1.92 put this book in the top decile. The VOO core plus a quality/dividend tilt captures market return while the 14% bond+cash sleeve trims volatility to 13.8%." },
      { sev: "positive", title: "Cost is best-in-class", body: "Blended expense ratio of 0.05% — you keep essentially all of the market's return. Over 20 years that fee gap alone is worth tens of thousands versus a typical advised portfolio." },
      { sev: "warning", title: "Hidden tech via VOO + QQQ", body: "On a look-through basis Technology is 27.4% of the book even though you hold only 15% in direct tech names. AAPL and MSFT each exceed 11% effective weight once ETFs are unwrapped." },
      { sev: "warning", title: "Bond duration is short", body: "BND + SGOV yield well but the SGOV-heavy mix means little duration. If rates fall, this sleeve won't appreciate — fine for income, a missed hedge for an equity drawdown driven by recession." },
    ],
    actions: [
      "Shift 3pt from SGOV into intermediate Treasuries (e.g. IEI) to add duration as a genuine equity hedge.",
      "Keep direct AAPL/MSFT under review — your effective tech weight is already ~27% through the index funds.",
      "This is well-built; the highest-value move is simply to keep contributing and rebalancing annually.",
    ],
    optimize: {
      income: [
        { from: "SGOV 6% → 3%", to: "Add SCHD +3%", why: "Modestly lift yield and dividend growth while keeping quality high.", impact: "Yield 1.9% → 2.3%" },
        { from: "Cash 3%", to: "BND 3%", why: "Capture 4.3% bond yield + duration vs idle cash.", impact: "+$215/yr + hedge" },
      ],
      ret: [
        { from: "BND 8% → 5%", to: "Add VOO +3%", why: "If your horizon is 10yr+, the bond drag costs expected return.", impact: "Exp. return +0.5pt" },
        { from: "Add factor tilt", to: "AVUV 4% (small value)", why: "Adds a lowly-correlated return premium without raising tech exposure.", impact: "Diversification +0.4" },
      ],
    },
    frontierCur: { x: 13.8, y: 11.6 }, frontierOpt: { x: 14.0, y: 12.4 }, frontierMin: { x: 9.4, y: 7.8 },
    frontierIdeas: [
      { label: "+ Small value", x: 14.4, y: 12.9 },
      { label: "+ Duration", x: 12.6, y: 10.9 },
    ],
    seed: 202, drift: 1.05, eqVol: 3.4,
  },
  {
    id: "growth", name: "Growth Tilt", tagline: "Mega-cap & AI heavy", icon: "trending",
    value: 1247890, dayChg: 1.18, dayChgUsd: 14560, ytd: 12.4, divYield: 0.6, annualIncome: 7487,
    overall: 69,
    holdings: [
      { tk: "NVDA", name: "NVIDIA", type: "stock", sector: "Technology", w: 15, beta: 1.72, vol: 42, rate: "A−", rScore: 88, v: 41, q: 86, m: 94, etf: 7.8, yield: 0.03, rc: 22.0, divg: 0, payout: 2 },
      { tk: "MSFT", name: "Microsoft", type: "stock", sector: "Technology", w: 13, beta: 1.05, vol: 26, rate: "A", rScore: 92, v: 58, q: 95, m: 78, etf: 9.1, yield: 0.7, rc: 13.1, divg: 10.1, payout: 25 },
      { tk: "AAPL", name: "Apple", type: "stock", sector: "Technology", w: 12, beta: 1.18, vol: 28, rate: "A−", rScore: 86, v: 49, q: 91, m: 70, etf: 9.6, yield: 0.45, rc: 11.4, divg: 5.2, payout: 15 },
      { tk: "GOOGL", name: "Alphabet", type: "stock", sector: "Comm. Services", w: 9, beta: 1.10, vol: 29, rate: "A−", rScore: 85, v: 64, q: 89, m: 72, etf: 8.4, yield: 0.46, rc: 8.2, divg: 0, payout: 8 },
      { tk: "AMZN", name: "Amazon", type: "stock", sector: "Cons. Discretionary", w: 8, beta: 1.28, vol: 33, rate: "B+", rScore: 79, v: 38, q: 80, m: 81, etf: 8.0, yield: 0, rc: 8.8, divg: 0, payout: 0 },
      { tk: "META", name: "Meta Platforms", type: "stock", sector: "Comm. Services", w: 7, beta: 1.30, vol: 38, rate: "B+", rScore: 81, v: 55, q: 84, m: 88, etf: 8.7, yield: 0.34, rc: 7.9, divg: 0, payout: 9 },
      { tk: "QQQ", name: "Invesco QQQ Trust", type: "etf", sector: "Diversified", w: 14, beta: 1.12, vol: 21, rate: "A−", rScore: 87, v: 45, q: 82, m: 79, etf: null, yield: 0.6, rc: 13.1, divg: 9.0, payout: 22 },
      { tk: "VGT", name: "Vanguard Info Tech", type: "etf", sector: "Technology", w: 10, beta: 1.20, vol: 24, rate: "A−", rScore: 86, v: 48, q: 84, m: 82, etf: null, yield: 0.6, rc: 11.0, divg: 12.0, payout: 18 },
      { tk: "CASH", name: "Cash & Equivalents", type: "cash", sector: "Cash", w: 2, beta: 0.0, vol: 0, rate: "—", rScore: null, v: null, q: null, m: null, etf: null, yield: 4.6, rc: 0, divg: 0, payout: null },
    ],
    subscores: [
      { k: "Risk-Adjusted Return", s: 78, note: "Sharpe 1.32 — strong but concentrated" },
      { k: "Quality & Fundamentals", s: 84, note: "High ROIC mega-caps" },
      { k: "Cost Efficiency", s: 88, note: "Blended fee 0.06%" },
      { k: "Diversification", s: 48, note: "Effective 6.1 of 9" },
      { k: "Correlation / Overlap", s: 42, note: "Tight AI cluster ρ 0.74" },
      { k: "Concentration", s: 38, note: "Tech 68% look-through" },
    ],
    risk: { vol: 24.6, beta: 1.31, sharpe: 1.32, sortino: 1.78, mdd: -31.2, var1d: -2.8, varUsd: -34941, var1m: -11.4, te: 8.2, r2: 0.89 },
    sectors: [
      { name: "Technology", w: 50, lt: 61.8, bench: 31.2, color: "#3b6ef0" },
      { name: "Comm. Services", w: 16, lt: 16.4, bench: 9.1, color: "#9b8cf0" },
      { name: "Cons. Discretionary", w: 8, lt: 9.2, bench: 10.4, color: "#36c2d6" },
      { name: "Diversified ETF", w: 24, lt: 0, bench: 0, color: "#2a3a50" },
      { name: "Health Care", w: 0, lt: 3.1, bench: 11.6, color: "#2fe3a0" },
      { name: "Financials", w: 0, lt: 4.2, bench: 13.1, color: "#e0b34e" },
      { name: "Cash", w: 2, lt: 2.0, bench: 0, color: "#5d6b80" },
      { name: "Other sectors", w: 0, lt: 3.3, bench: 24.6, color: "#ff5d6c" },
    ],
    factors: [
      { f: "Growth", port: 90, bench: 55 }, { f: "Value", port: 34, bench: 50 }, { f: "Quality", port: 82, bench: 60 },
      { f: "Momentum", port: 86, bench: 52 }, { f: "Low Vol", port: 26, bench: 50 }, { f: "Income", port: 18, bench: 50 },
    ],
    lookthrough: [
      { tk: "AAPL", direct: 12.0, eff: 15.1 }, { tk: "MSFT", direct: 13.0, eff: 16.2 }, { tk: "NVDA", direct: 15.0, eff: 18.4 },
      { tk: "GOOGL", direct: 9.0, eff: 10.6 }, { tk: "AMZN", direct: 8.0, eff: 9.4 }, { tk: "META", direct: 7.0, eff: 8.1 },
    ],
    insights: [
      { sev: "critical", title: "Concentration breach — Technology", body: "On a look-through basis Technology is 61.8% of the book versus 31.2% for the S&P — a 30pt active overweight. A single-factor AI drawdown could move two-thirds of the portfolio in tandem." },
      { sev: "critical", title: "Tight mega-cap correlation cluster", body: "NVDA, MSFT, AAPL, GOOGL, META and AMZN average a 0.74 pairwise correlation. Effective diversification is 6.1 holdings, not 9 — your true risk count is far lower than your position count." },
      { sev: "warning", title: "Almost no income or ballast", body: "Forward yield is 0.6% and there is no bond/defensive sleeve. With beta 1.31 and a −31% historical max drawdown, there is nothing in this book to cushion a selloff." },
      { sev: "positive", title: "Quality tilt is genuinely strong", body: "Blended quality score of 84 with a +22 active tilt. High-ROIC names justify part of the growth premium you're paying — this is concentrated, but it's concentrated in great businesses." },
    ],
    actions: [
      "Trim the top-3 tech names by ~6pt combined and rotate into Financials / Health Care to close the 30pt sector gap.",
      "Add an 8–12% bond or low-vol sleeve — the book currently has zero ballast for a drawdown.",
      "Set a 40% look-through cap on any single sector as a standing rule.",
    ],
    optimize: {
      income: [
        { from: "Cash 2%", to: "SCHD 6% (from VGT)", why: "Introduce a dividend anchor; current 0.6% yield is negligible.", impact: "Yield 0.6% → 1.6%" },
        { from: "Trim NVDA 15% → 11%", to: "Add JEPI 4%", why: "Take some AI risk off the table for covered-call income + lower beta.", impact: "+$2.9k/yr income" },
      ],
      ret: [
        { from: "Trim NVDA/AAPL 6pt", to: "Add IWM/AVUV 6%", why: "Cut single-factor AI risk; add a diversifying small-cap return source.", impact: "Sharpe 1.32 → 1.46" },
        { from: "Add BND 8%", to: "from QQQ/VGT", why: "A real ballast sleeve cuts drawdown materially for a small return give-up.", impact: "Max DD −31% → −24%" },
      ],
    },
    frontierCur: { x: 24.6, y: 13.2 }, frontierOpt: { x: 17.2, y: 13.0 }, frontierMin: { x: 11.0, y: 9.0 },
    frontierIdeas: [
      { label: "− AI + small value", x: 19.8, y: 13.4 },
      { label: "+ Bond ballast", x: 17.4, y: 11.8 },
    ],
    seed: 303, drift: 1.30, eqVol: 7.0,
  },
];

function attachSeries(p: any) {
  p.equity = genEquity(p.seed, p.drift, p.eqVol);
  p.monthly = genMonthly(p.seed, p.drift, p.eqVol);
  p.cons = consistency(p.monthly);
  p.corr = genCorr(p.holdings, p.seed);
  p.frontier = genFrontier(p.seed, p.frontierCur.x, p.frontierCur.y, p.frontierOpt.y, p.frontierMin.x);
  const last = p.equity[p.equity.length - 1];
  p.totalRet = +(last.port - 100).toFixed(1);
  p.benchRet = +(last.bench - 100).toFixed(1);
  p.active = +(p.totalRet - p.benchRet).toFixed(1);
  p.vsSp = {
    cagr: +((Math.pow(last.port / 100, 12 / p.equity.length) - 1) * 100).toFixed(1),
    spCagr: +((Math.pow(last.bench / 100, 12 / p.equity.length) - 1) * 100).toFixed(1),
    upCapture: Math.round(80 + p.risk.beta * 18),
    downCapture: Math.round(55 + p.risk.beta * 22),
    corr: +(0.80 + p.risk.beta * 0.06).toFixed(2),
    final10k: Math.round(100 * last.port),
    sp10k: Math.round(100 * last.bench),
  };
  return p;
}
PORTFOLIOS.forEach(attachSeries);

/* ====================== CUSTOM PORTFOLIO BUILDER ======================
   Turns a list of tickers the user picked in the builder into a full portfolio
   object the sections can render — so "Analyze" actually creates *their*
   portfolio. Figures are demo-derived from the holding metadata (not live
   market data yet); the premium path will swap in real prices/ratings. */
const RATE_SCORE: Record<string, number> = { "A+": 96, "A": 91, "A−": 85, "B+": 80, "B": 73, "B−": 67, "C+": 58, "C": 48, "D": 40 };
const SECTOR_BENCH: Record<string, number> = { Technology: 31, Financials: 13, "Health Care": 12, "Cons. Discretionary": 10, "Comm. Services": 9, Industrials: 8, "Cons. Staples": 6, Energy: 4, Utilities: 2.5, "Real Estate": 2.4, Materials: 2.4, Diversified: 0, "Fixed Income": 0, Cash: 0 };
const SECTOR_COLOR: Record<string, string> = { Technology: "#3b6ef0", "Comm. Services": "#9b8cf0", "Cons. Discretionary": "#36c2d6", "Cons. Staples": "#36c2d6", "Health Care": "#2fe3a0", "Real Estate": "#9b8cf0", Energy: "#ff5d6c", Financials: "#e0b34e", Diversified: "#2a3a50", "Fixed Income": "#5d6b80", Cash: "#5d6b80", Industrials: "#36c2d6", Utilities: "#5d6b80", Materials: "#e0b34e" };

function hashSeed(tickers: string[]) { let h = 7; for (const ch of tickers.join(",")) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) || 999; }
const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Rough yield/rating estimates by sector/type when we don't have live figures.
const EST_YIELD: Record<string, number> = { Technology: 0.7, "Comm. Services": 0.8, "Cons. Discretionary": 1.2, "Cons. Staples": 3.0, "Health Care": 2.4, Financials: 2.4, Energy: 4.0, "Real Estate": 4.2, Utilities: 3.6, Industrials: 1.8, Materials: 2.2, Diversified: 1.8 };
const EST_RATE: Record<string, string> = { "Cons. Staples": "B+", "Health Care": "B+", Utilities: "B", Financials: "B", Technology: "B", Energy: "B−", "Real Estate": "B", Diversified: "A−" };

export type Pick = { symbol: string; name: string; type?: string | null; sector?: string | null; is_etf?: boolean | null; is_fund?: boolean | null };

// Build a portfolio object from the holdings the user picked in the search.
// NOTE: figures are MODELLED from sector/type, not live market data — the
// `estimated` flag drives an on-screen banner. The real-data path runs these
// through /api/portfolio/healthcheck (computeHealth + optimizer).
export function buildCustomPortfolio(picks: Pick[], value = 100000, name = "Your portfolio") {
  if (!picks || picks.length < 2) return null;
  const seed = hashSeed(picks.map((p) => p.symbol));
  const rnd = mulberry(seed);
  const n = picks.length;
  const w = 100 / n;

  const holdings = picks.map((pk) => {
    const isEtf = pk.type === "etf" || pk.is_etf || pk.is_fund;
    const type = isEtf ? "etf" : "stock";
    const sector = pk.sector || (isEtf ? "Diversified" : "Unknown");
    const rate = EST_RATE[sector] ?? "B";
    const rScore = RATE_SCORE[rate] ?? 72;
    const beta = isEtf ? (sector === "Technology" ? 1.2 : 0.98) : (sector === "Technology" ? 1.3 : sector === "Energy" ? 0.9 : sector === "Utilities" ? 0.6 : 1.0);
    const vol = isEtf ? (sector === "Technology" ? 24 : 15) : (sector === "Technology" ? 30 : sector === "Utilities" ? 14 : 21);
    const yld = +(EST_YIELD[sector] ?? 1.6).toFixed(1);
    return {
      tk: pk.symbol, name: pk.name, type, sector, w: +w.toFixed(1), beta, vol,
      rate, rScore, v: Math.round(clampN(50 + rnd() * 40, 20, 95)),
      q: Math.round(clampN(rScore - 5 + rnd() * 10, 30, 98)),
      m: Math.round(clampN(45 + rnd() * 45, 25, 95)),
      etf: type === "stock" ? +(6 + rnd() * 4).toFixed(1) : null,
      yield: yld, rc: +(w * (0.55 + beta * 0.55)).toFixed(1),
      divg: +(2 + rnd() * 9).toFixed(1),
      payout: Math.round(30 + rnd() * 55),
    };
  });
  const divYield = +(holdings.reduce((s, h) => s + h.yield, 0) / n).toFixed(1);
  const avgR = holdings.reduce((s, h) => s + h.rScore, 0) / n;
  const avgQ = holdings.filter((h) => h.q != null).reduce((s, h) => s + (h.q || 0), 0) / Math.max(1, holdings.filter((h) => h.q != null).length);
  const topW = Math.max(...holdings.map((h) => h.w));

  // Sector aggregation (no real ETF look-through for custom books yet).
  const secMap = new Map<string, number>();
  holdings.forEach((h) => secMap.set(h.sector, (secMap.get(h.sector) || 0) + h.w));
  const sectors = [...secMap.entries()].map(([name, wt]) => ({ name, w: +wt.toFixed(1), lt: +wt.toFixed(1), bench: SECTOR_BENCH[name] ?? 0, color: SECTOR_COLOR[name] || "#5d6b80" })).sort((a, b) => b.lt - a.lt);
  const topSector = sectors[0]?.lt ?? 0;

  const weightedVol = holdings.reduce((s, h) => s + (h.w / 100) * h.vol, 0);
  const weightedBeta = +(holdings.reduce((s, h) => s + (h.w / 100) * h.beta, 0)).toFixed(2);
  const vol = +(weightedVol * 0.82).toFixed(1); // diversification haircut
  const expRet = +(4 + weightedBeta * 6).toFixed(1);
  const sharpe = +clampN((expRet - 4.5) / Math.max(2, vol), 0.2, 2.2).toFixed(2);

  const sub = (s: number) => Math.round(clampN(s, 8, 99));
  const subscores = [
    { k: "Risk-Adjusted Return", s: sub(40 + sharpe * 35), note: `Sharpe ${sharpe}` },
    { k: "Quality & Fundamentals", s: sub(avgQ), note: "From holding ratings" },
    { k: "Diversification", s: sub(45 + n * 5 - topSector * 0.5), note: `${n} holdings · ${sectors.length} sectors` },
    { k: "Concentration", s: sub(100 - topW * 1.4 - Math.max(0, topSector - 30)), note: `Top sector ${Math.round(topSector)}%` },
    { k: "Income", s: sub(divYield * 18), note: `Blended yield ${divYield}%` },
    { k: "Cost Efficiency", s: sub(82 + rnd() * 10), note: "Blended fee est." },
  ];
  const overall = Math.round(clampN(subscores.reduce((s, x) => s + x.s, 0) / subscores.length, 8, 99));

  const factors = [
    { f: "Income", port: sub(divYield * 18), bench: 50 },
    { f: "Value", port: sub(holdings.reduce((s, h) => s + (h.v || 50), 0) / n), bench: 50 },
    { f: "Quality", port: sub(avgQ), bench: 50 },
    { f: "Momentum", port: sub(holdings.filter((h) => h.m != null).reduce((s, h) => s + (h.m || 0), 0) / Math.max(1, holdings.filter((h) => h.m != null).length)), bench: 52 },
    { f: "Low Vol", port: sub(100 - vol * 2.4), bench: 50 },
    { f: "Growth", port: sub(50 + (weightedBeta - 1) * 60), bench: 55 },
  ];

  const stockHoldings = holdings.filter((h) => h.type === "stock").sort((a, b) => b.w - a.w).slice(0, 6);
  const lookthrough = stockHoldings.map((h) => ({ tk: h.tk, direct: h.w, eff: +(h.w + (h.etf || 0) * 0.0).toFixed(1) }));

  const insights: any[] = [];
  if (topSector >= 45) insights.push({ sev: topSector >= 60 ? "critical" : "warning", title: `Concentrated in ${sectors[0].name}`, body: `${Math.round(topSector)}% of the book sits in ${sectors[0].name}. A sector-specific drawdown would move much of the portfolio together.` });
  if (weightedBeta >= 1.2) insights.push({ sev: weightedBeta >= 1.4 ? "critical" : "warning", title: "Above-market risk", body: `Weighted beta of ${weightedBeta} amplifies market moves — expect larger swings than the index in both directions.` });
  if (avgQ >= 78) insights.push({ sev: "positive", title: "Strong underlying quality", body: `Holdings average a quality score of ${Math.round(avgQ)} — the book is built on well-rated names.` });
  if (divYield >= 3) insights.push({ sev: "positive", title: "Healthy income", body: `Blended forward yield of ${divYield}% on a $100k book is ~$${Math.round(value * divYield / 100).toLocaleString()}/yr.` });
  while (insights.length < 3) insights.push({ sev: "positive", title: "Balanced profile", body: `${n} holdings across ${sectors.length} sectors, weighted beta ${weightedBeta}, blended yield ${divYield}%.` });

  const p: any = {
    id: "custom", name, picks, tagline: "Built by you", icon: "building", isCustom: true, estimated: true,
    value, dayChg: +((rnd() - 0.4) * 1.2).toFixed(2), dayChgUsd: Math.round((rnd() - 0.4) * 1.2 / 100 * value), ytd: +(expRet * 0.7).toFixed(1),
    divYield, annualIncome: Math.round(value * divYield / 100), overall, holdings, subscores,
    risk: { vol, beta: weightedBeta, sharpe, sortino: +(sharpe * 1.32).toFixed(2), mdd: +(-vol * 1.35).toFixed(1), var1d: +(-vol / 14).toFixed(1), varUsd: Math.round(-vol / 14 / 100 * value), var1m: +(-vol / 3.2).toFixed(1), te: +(3 + rnd() * 5).toFixed(1), r2: +(0.78 + rnd() * 0.16).toFixed(2) },
    sectors, factors, lookthrough,
    insights,
    actions: [
      topSector >= 45 ? `Trim ${sectors[0].name} toward the ${Math.round(SECTOR_BENCH[sectors[0].name] || 15)}% benchmark weight to cut concentration.` : "Keep position sizes balanced as you add holdings.",
      divYield < 2 ? "Add an income sleeve (e.g. SCHD/JEPI) if durable yield is a goal." : "Reinvest dividends to compound the income engine.",
      "Rebalance annually and revisit the grade after any large market move.",
    ],
    optimize: {
      income: [{ from: "Lowest-yield sleeve", to: "Dividend-growth ETF", why: "Lift durable income without adding equity risk.", impact: `Yield ${divYield}% → ${(divYield + 0.6).toFixed(1)}%` }],
      ret: [{ from: "Trim top position", to: "Add a diversifier", why: "Cut single-name risk; add a lowly-correlated return source.", impact: `Sharpe ${sharpe} → ${(sharpe + 0.08).toFixed(2)}` }],
    },
    frontierCur: { x: vol, y: expRet }, frontierOpt: { x: +(vol * 0.92).toFixed(1), y: +(expRet + 0.8).toFixed(1) }, frontierMin: { x: +(vol * 0.7).toFixed(1), y: +(expRet * 0.8).toFixed(1) },
    frontierIdeas: [{ label: "+ diversifier", x: +(vol * 0.95).toFixed(1), y: +(expRet + 0.4).toFixed(1) }, { label: "+ bond ballast", x: +(vol * 0.85).toFixed(1), y: +(expRet * 0.9).toFixed(1) }],
    seed, drift: expRet / 12, eqVol: vol / 5,
  };
  return attachSeries(p);
}

/* ====================== LIVE DATA ADAPTER ======================
   Maps the real HealthResult from /api/portfolio/healthcheck (computeHealth +
   optimizer) into the section shape. Ratings, risk, correlation, vs-S&P,
   factors and the frontier are LIVE; consistency and ETF look-through are
   approximated (still need monthly history / the holdings join). */
const r1 = (x: number | null | undefined, d = 0) => (x == null || !isFinite(x) ? d : Math.round(x * 10) / 10);
const r2 = (x: number | null | undefined, d = 0) => (x == null || !isFinite(x) ? d : Math.round(x * 100) / 100);

export function adaptHealthResult(result: any, picks: Pick[], value = 100000, name = "Your portfolio") {
  if (!result || !Array.isArray(result.holdings) || result.holdings.length < 2) return null;
  const typeBy = new Map(picks.map((p) => [p.symbol, (p.type === "etf" || p.is_etf || p.is_fund) ? "etf" : "stock"]));
  const p100 = (v: number | null) => (v == null ? null : Math.round(((v - 1) / 4) * 100)); // pillar 1..5 → 0..100

  const holdings = result.holdings.map((h: any) => ({
    tk: h.symbol, name: h.name ?? h.symbol, type: typeBy.get(h.symbol) || "stock", sector: h.sector || "Unknown",
    w: r1((h.weight ?? 0) * 100), beta: r2(h.beta, 1), vol: r1(h.annualVol, 0),
    rate: h.grade ?? "—", rScore: h.score != null ? Math.round((h.score / 25) * 100) : null,
    v: p100(h.pillars?.value), q: p100(h.pillars?.quality), m: p100(h.pillars?.momentum),
    yield: r2(h.dividendYield, 0), divg: 0, etf: typeBy.get(h.symbol) === "stock" ? 0 : null,
    rc: r1((h.weight ?? 0) * 100 * (0.6 + (h.beta || 1) * 0.5)), payout: null,
  }));

  const port = result.portfolio || {};
  const bench = result.benchmark || {};
  const curve = Array.isArray(bench.curve) ? bench.curve : [];
  const equity = curve.length
    ? curve.map((c: any, i: number) => ({ m: i, port: c.port, bench: c.bench }))
    : [{ m: 0, port: 100, bench: 100 }];
  const last = equity[equity.length - 1];
  const totalRet = r1(last.port - 100);
  const benchRet = r1(last.bench - 100);

  // Approximate monthly returns from the equity curve for the consistency view.
  const monthly: number[] = [];
  if (curve.length > 2) {
    const buckets = Math.min(12, Math.max(3, Math.floor(curve.length / 8)));
    const step = curve.length / buckets;
    for (let b = 0; b < buckets; b++) {
      const a = curve[Math.floor(b * step)]?.port ?? 100;
      const z = curve[Math.min(curve.length - 1, Math.floor((b + 1) * step))]?.port ?? a;
      monthly.push(+(((z - a) / a) * 100).toFixed(1));
    }
  }
  const cons = consistency(monthly.length ? monthly : [0]);

  const sectors = (result.sectorWeights || []).map((s: any) => ({
    name: s.sector, w: r1(s.weight * 100), lt: r1(s.weight * 100), bench: SECTOR_BENCH[s.sector] ?? 0, color: SECTOR_COLOR[s.sector] || "#5d6b80",
  }));

  const risk = {
    vol: r1(port.annualVol), beta: r2(port.weightedBeta, 1), sharpe: r2(result.risk?.sharpe, 0), sortino: r2(result.risk?.sortino, 0),
    mdd: r1(result.risk?.maxDrawdown), var1d: r1(result.risk?.var1d), varUsd: Math.round((result.risk?.var1d ?? 0) / 100 * value),
    var1m: r1((result.risk?.var1d ?? 0) * Math.sqrt(21)), te: r1(bench.trackingError), r2: r2(bench.r2, 0),
  };

  const opt = result.optimize || {};
  const sugg = (opt.suggestions || []).map((s: any) => ({ from: `${s.symbol} ${s.from}%`, to: `${s.to}%`, why: s.delta > 0 ? "Increase toward the max-Sharpe weight." : "Trim toward the max-Sharpe weight.", impact: `${s.delta > 0 ? "+" : ""}${s.delta}pt` }));

  const blended = r2(port.blendedYield, 0);
  const p: any = {
    id: "custom", name, picks, tagline: "Your live analysis", icon: "building", isCustom: true, estimated: false, live: true,
    value, dayChg: 0, dayChgUsd: 0, ytd: totalRet, divYield: blended, annualIncome: Math.round(value * blended / 100),
    overall: result.overall ?? 0,
    holdings,
    subscores: (result.subscores || []).map((s: any) => ({ k: s.key, s: s.score, note: s.note })),
    risk, sectors,
    factors: (result.factors || []).map((f: any) => ({ f: f.factor, port: f.port, bench: f.bench })),
    lookthrough: [],
    insights: (result.insights || []).map((i: any) => ({ sev: i.severity, title: i.title, body: i.body })),
    actions: sugg.length ? sugg.slice(0, 3).map((s: any) => `${s.from} → ${s.to} (${s.impact})`) : ["Rebalance toward the max-Sharpe mix shown in Optimize.", "Reinvest dividends to compound income.", "Revisit after any large market move."],
    optimize: { income: sugg, ret: sugg },
    correlation: result.correlation,
    corr: { tks: result.correlation?.symbols ?? [], M: (result.correlation?.matrix ?? []).map((row: any[]) => row.map((v) => (v == null ? 0 : v))) },
    equity, monthly: monthly.length ? monthly : [0], cons, totalRet, benchRet, active: r1(totalRet - benchRet),
    vsSp: {
      cagr: r1(bench.cagr), spCagr: r1(bench.benchCagr), upCapture: Math.round(bench.upCapture ?? 100), downCapture: Math.round(bench.downCapture ?? 100),
      corr: r2(Math.sqrt(bench.r2 ?? 0), 0), final10k: Math.round(100 * last.port), sp10k: Math.round(100 * last.bench),
    },
    frontier: { cloud: opt.cloud ?? [], curve: opt.frontier ?? [] },
    frontierCur: { x: opt.current?.vol ?? risk.vol, y: opt.current?.ret ?? totalRet },
    frontierOpt: { x: opt.maxSharpe?.vol ?? risk.vol, y: opt.maxSharpe?.ret ?? totalRet },
    frontierMin: { x: opt.minVariance?.vol ?? risk.vol, y: opt.minVariance?.ret ?? totalRet },
    frontierIdeas: [],
  };
  return p;
}

export const UNIVERSE: any[] = [
  { tk: "SCHD", name: "Schwab US Dividend Equity ETF", type: "etf", sector: "Diversified", yield: 3.6, rate: "A" },
  { tk: "VYM", name: "Vanguard High Dividend Yield", type: "etf", sector: "Diversified", yield: 3.1, rate: "A−" },
  { tk: "JEPI", name: "JPMorgan Equity Premium Income", type: "etf", sector: "Diversified", yield: 7.4, rate: "B+" },
  { tk: "JEPQ", name: "JPMorgan Nasdaq Equity Premium", type: "etf", sector: "Diversified", yield: 9.2, rate: "B+" },
  { tk: "DGRO", name: "iShares Core Dividend Growth", type: "etf", sector: "Diversified", yield: 2.3, rate: "A" },
  { tk: "VIG", name: "Vanguard Dividend Appreciation", type: "etf", sector: "Diversified", yield: 1.8, rate: "A" },
  { tk: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", sector: "Diversified", yield: 1.3, rate: "A" },
  { tk: "QQQ", name: "Invesco QQQ Trust", type: "etf", sector: "Diversified", yield: 0.6, rate: "A−" },
  { tk: "VGT", name: "Vanguard Information Technology", type: "etf", sector: "Technology", yield: 0.6, rate: "A−" },
  { tk: "SGOV", name: "iShares 0-3 Month Treasury", type: "bond", sector: "Fixed Income", yield: 5.0, rate: "A" },
  { tk: "BND", name: "Vanguard Total Bond Market", type: "bond", sector: "Fixed Income", yield: 4.3, rate: "A" },
  { tk: "O", name: "Realty Income Corp.", type: "stock", sector: "Real Estate", yield: 5.6, rate: "B+" },
  { tk: "MO", name: "Altria Group", type: "stock", sector: "Cons. Staples", yield: 7.8, rate: "B" },
  { tk: "PG", name: "Procter & Gamble", type: "stock", sector: "Cons. Staples", yield: 2.5, rate: "A−" },
  { tk: "KO", name: "Coca-Cola", type: "stock", sector: "Cons. Staples", yield: 2.9, rate: "B+" },
  { tk: "PEP", name: "PepsiCo", type: "stock", sector: "Cons. Staples", yield: 3.2, rate: "A−" },
  { tk: "JNJ", name: "Johnson & Johnson", type: "stock", sector: "Health Care", yield: 3.1, rate: "A−" },
  { tk: "ABBV", name: "AbbVie", type: "stock", sector: "Health Care", yield: 3.4, rate: "B+" },
  { tk: "VZ", name: "Verizon Communications", type: "stock", sector: "Comm. Services", yield: 6.3, rate: "B" },
  { tk: "XOM", name: "Exxon Mobil", type: "stock", sector: "Energy", yield: 3.3, rate: "B+" },
  { tk: "CVX", name: "Chevron", type: "stock", sector: "Energy", yield: 4.1, rate: "B+" },
  { tk: "JPM", name: "JPMorgan Chase", type: "stock", sector: "Financials", yield: 2.1, rate: "A−" },
  { tk: "AVGO", name: "Broadcom", type: "stock", sector: "Technology", yield: 1.2, rate: "A−" },
  { tk: "MSFT", name: "Microsoft", type: "stock", sector: "Technology", yield: 0.7, rate: "A" },
  { tk: "AAPL", name: "Apple", type: "stock", sector: "Technology", yield: 0.45, rate: "A−" },
  { tk: "NVDA", name: "NVIDIA", type: "stock", sector: "Technology", yield: 0.03, rate: "A−" },
  { tk: "GOOGL", name: "Alphabet", type: "stock", sector: "Comm. Services", yield: 0.46, rate: "A−" },
  { tk: "AMZN", name: "Amazon", type: "stock", sector: "Cons. Discretionary", yield: 0, rate: "B+" },
  { tk: "META", name: "Meta Platforms", type: "stock", sector: "Comm. Services", yield: 0.34, rate: "B+" },
  { tk: "HD", name: "Home Depot", type: "stock", sector: "Cons. Discretionary", yield: 2.4, rate: "A−" },
];

// Pricing reflects the real product: one free tier + a single paid tier at
// $100/year. No Pro tier and no free trial.
export const PRICING: any[] = [
  { id: "free", name: "Free", price: 0, period: "", tagline: "Explore the samples", cta: "Current plan",
    features: ["Health score on our sample portfolios", "Overview, risk & correlation", "3 AI analyst questions / day", "Read-only — sign up to save your holdings"], locked: false },
  { id: "premium", name: "Pro", price: 100, period: "/year", tagline: "For serious DIY investors", cta: "Get Pro", featured: true,
    features: ["Analyze your own holdings, unlimited", "All sections: risk, correlation, frontier", "Up to 10 saved portfolios", "Optimization suggestions", "Unlimited AI analyst", "Monthly consistency & S&P backtest"] },
];

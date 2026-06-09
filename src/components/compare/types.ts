// Shared shape between the /compare server page (data assembly) and the
// client comparison app. Keep free of runtime imports.

export type CompareColumn = {
  symbol: string;
  name: string | null;
  kind: "stock" | "etf" | "missing";
  // Core
  price: number | null;
  changePercent: number | null;
  yieldPct: number | null;
  // Stock/ETF mass
  marketCap: number | null;
  aum: number | null;
  // ETF specifics
  expenseRatio: number | null;
  holdingsCount: number | null;
  topHoldings: { asset: string; name: string | null; weight: number | null }[];
  // Stock specifics
  peRatio: number | null;
  beta: number | null;
  sector: string | null;
  industry: string | null;
  composite: number | null;
  grade: string | null;
  // Rating pillars (1..5) — power the radar dims for stocks.
  pillars: { value: number | null; growth: number | null; profit: number | null; momentum: number | null; health: number | null } | null;
  streakYears: number | null;
  divCagr5y: number | null;
  payoutRatio: number | null;
  netDebtToEbitda: number | null;
  return1y: number | null;
  return3y: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  pctOff52wHigh: number | null;
  profitMargin: number | null;
  revGrowthQoQ: number | null;
};

export type CompareSeries = { symbol: string; points: { date: string; close: number | string | null }[] };

// Pure shared types — safe to import from client components.
// (No server-only code, no DB clients.)

export type StockRow = {
  symbol: string;
  name: string | null;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  beta: number | null;
  volume: number | null;
  avg_volume: number | null;
  industry: string | null;
  sector: string | null;
  country: string | null;
  exchange: string | null;
  currency: string | null;
  annual_dividend: number | null;
  dividend_yield: number | null;
  range: string | null;
  description: string | null;
  ceo: string | null;
  website: string | null;
  image: string | null;
  full_time_employees: number | null;
  ipo_date: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
  isin: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  // ETF-specific fields (null for non-ETFs). Selected via TICKER_COLUMNS so
  // they're available in every listing without a separate fetch.
  expense_ratio?: number | null;
  aum?: number | null;
  holdings_count?: number | null;
  etf_category?: string | null;
  asset_class?: string | null;
  nav?: number | null;
  etf_company?: string | null;
  // Cached average post-ex-dividend price-recovery days from
  // backend.tickers.avg_recovery_days. Powers the Payout view's
  // Days-to-Recover column.
  avg_recovery_days?: number | null;
  // Declared next ex-dividend date (backend.tickers.next_ex_dividend_date).
  // Present = the company has announced its next payout; null/past = the forward
  // dividend shown is our estimate from history. Drives the "Estimated?" column.
  next_ex_dividend_date?: string | null;
};

export type StockRating = {
  symbol: string;
  computed_date: string;
  value_score: number | null;
  growth_score: number | null;
  profit_score: number | null;
  momentum_score: number | null;
  health_score: number | null;
  composite_total: number | null;
  composite_grade: string | null;
  composite_color: string | null;
  cohort_industry: string | null;
};

export type DividendEvent = {
  symbol: string;
  date: string;
  record_date: string | null;
  payment_date: string | null;
  declaration_date: string | null;
  dividend: number;
  adj_dividend: number | null;
  yield: number | null;
  frequency: string | null;
};

export type PayoutChangeEvent = {
  symbol: string;
  name: string | null;
  date: string;
  payment_date: string | null;
  declaration_date: string | null;
  dividend: number;
  previousDividend: number | null;
  pctChange: number | null;
  frequency: string | null;
};

// Per-symbol extras used by Div Growth + Returns column views. All fields are
// optional — we surface what we have.
export type StockExtras = {
  symbol: string;
  consecutiveIncreases?: number | null;
  divCagr1y?: number | null;
  divCagr5y?: number | null;
  payoutRatio?: number | null; // 0-1 fraction
  peRatio?: number | null;
  netDebtToEbitda?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
  pctOff52wHigh?: number | null;
  returnYtd?: number | null;
  return1y?: number | null;
  return3y?: number | null;
  return5y?: number | null;
  return10y?: number | null;
};

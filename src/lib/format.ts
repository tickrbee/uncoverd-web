// Pure formatting helpers — safe to import from client components.

// US open-end mutual funds use a 5-letter symbol ending in X (WFEMX, VSMPX,
// VITSX, VFIAX…). Many are mis-flagged as common stocks in the data, so we
// detect them by symbol shape.
export function isFundSymbol(symbol: string): boolean {
  return /^[A-Z]{4}X$/.test(symbol);
}

// Detail-page URL for a ticker. ETFs/funds (and the mutual funds above) live at
// /etfs/symbol; /stocks 404s for them. Pass is_etf/is_fund when known; otherwise
// the symbol heuristic catches mutual funds (but not short ETF tickers, which
// need the flags).
export function tickerHref(symbol: string, isEtf?: boolean | null, isFund?: boolean | null): string {
  if (isEtf || isFund || isFundSymbol(symbol)) return `/etfs/symbol/${symbol}`;
  return `/stocks/${symbol}`;
}

const CURRENCY_PREFIX: Record<string, string> = {
  USD: "$",
  CAD: "C$",
  AUD: "A$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  TWD: "NT$",
  KRW: "₩",
  INR: "₹",
  CHF: "CHF ",
  SEK: "kr ",
  NOK: "kr ",
  DKK: "kr ",
  SGD: "S$",
  MXN: "MX$",
  BRL: "R$",
  ZAR: "R",
};

export function symbolFor(currency: string | null | undefined): string {
  if (!currency) return "$";
  return CURRENCY_PREFIX[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

export function formatCurrency(
  value: number | null | undefined,
  opts: { abbreviate?: boolean; currency?: string | null } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sym = symbolFor(opts.currency);
  if (opts.abbreviate) {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `${sym}${(value / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sym}${(value / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sym}${(value / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sym}${(value / 1e3).toFixed(2)}K`;
  }
  const decimals = ["JPY", "KRW", "INR"].includes((opts.currency ?? "").toUpperCase()) ? 0 : 2;
  return `${sym}${value.toFixed(decimals)}`;
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return date;
  }
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

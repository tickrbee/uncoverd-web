import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminClient, getBackendClient } from "@/lib/supabase/admin";
import type { StockRow, StockRating, DividendEvent, PayoutChangeEvent, StockExtras } from "@/lib/types";

// Re-export shared types so existing `import {...} from "@/lib/data"` callers keep working.
export type { StockRow, StockRating, DividendEvent, PayoutChangeEvent, StockExtras } from "@/lib/types";
export {
  formatCurrency,
  formatPercent,
  formatDate,
  symbolFor,
  isoToday,
  isoDaysFromNow,
} from "@/lib/format";

// ============================================================
// Types matching the `backend` Supabase schema
// ============================================================

// Raw shape from backend.tickers
type TickerRow = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  exchange_short: string | null;
  price: number | null;
  type: string | null;
  beta: number | null;
  vol_avg: number | null;
  mkt_cap: number | null;
  last_div: number | null;
  range: string | null;
  changes: number | null;
  currency: string | null;
  cik: string | null;
  isin: string | null;
  cusip: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  ceo: string | null;
  sector: string | null;
  country: string | null;
  full_time_employees: number | null;
  ipo_date: string | null;
  is_etf: boolean | null;
  is_actively_trading: boolean | null;
  is_fund: boolean | null;
  expense_ratio: number | null;
  aum: number | null;
  holdings_count: number | null;
  etf_category: string | null;
  asset_class: string | null;
  nav: number | null;
  etf_company: string | null;
  avg_recovery_days: number | null;
  change_percentage: number | null;
  volume: number | null;
  average_volume: number | null;
  image: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  address: string | null;
  next_ex_dividend_date: string | null;
  next_ex_dividend_amount: number | null;
};

// StockRow is now defined in @/lib/types and re-exported above.

function toStockRow(t: TickerRow): StockRow {
  const lastDiv = numericOrNull(t.last_div);
  const price = numericOrNull(t.price);
  // Sanity cap: any yield >30% is virtually always a data-quality problem
  // (FMP's last_div sometimes stores pre-split per-share, which inflates
  // yield for any ticker that's had a stock split). Null it out so the
  // enrichment pass can recompute via split-adjusted TTM dividends.
  let yieldPct = lastDiv != null && price && price > 0 ? (lastDiv / price) * 100 : null;
  if (yieldPct != null && yieldPct > 30) yieldPct = null;
  const change = numericOrNull(t.changes);
  const changePercent = numericOrNull(t.change_percentage);
  return {
    symbol: t.symbol,
    name: t.name,
    price,
    change,
    change_percent: changePercent,
    market_cap: t.mkt_cap,
    pe_ratio: null,
    beta: numericOrNull(t.beta),
    volume: t.volume,
    avg_volume: t.average_volume,
    industry: t.industry,
    sector: t.sector,
    country: t.country,
    exchange: t.exchange_short ?? t.exchange,
    currency: t.currency,
    annual_dividend: lastDiv,
    dividend_yield: yieldPct,
    range: t.range,
    description: t.description,
    ceo: t.ceo,
    website: t.website,
    image: t.image,
    full_time_employees: t.full_time_employees,
    ipo_date: t.ipo_date,
    is_etf: t.is_etf,
    is_fund: t.is_fund,
    isin: t.isin,
    city: t.city,
    state: t.state,
    zip: t.zip,
    expense_ratio: t.expense_ratio,
    aum: t.aum,
    holdings_count: t.holdings_count,
    etf_category: t.etf_category,
    asset_class: t.asset_class,
    nav: t.nav,
    etf_company: t.etf_company,
    avg_recovery_days: t.avg_recovery_days,
    next_ex_dividend_date: t.next_ex_dividend_date,
  };
}

function numericOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

// StockRating and DividendEvent are defined in @/lib/types and re-exported above.

export type NewsRow = {
  id: number;
  symbol: string | null;
  published_date: string;
  publisher: string | null;
  title: string;
  image: string | null;
  site: string | null;
  text: string | null;
  url: string;
};

export type HistoricalPriceRow = {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  dividends: number | null;
  change_percent: number | null;
};

export type IncomeStatementRow = {
  symbol: string;
  fiscal_year: string | null;
  period: string | null;
  date: string;
  revenue: number | null;
  gross_profit: number | null;
  operating_income: number | null;
  ebitda: number | null;
  net_income: number | null;
  eps: number | null;
  eps_diluted: number | null;
  reported_currency: string | null;
};

export type BalanceSheetRow = {
  symbol: string;
  fiscal_year: string | null;
  period: string | null;
  date: string;
  total_debt: number | null;
  short_term_debt: number | null;
  long_term_debt: number | null;
  net_debt: number | null;
  cash_and_cash_equivalents: number | null;
  cash_and_short_term_investments: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  total_current_assets: number | null;
  total_current_liabilities: number | null;
  total_stockholders_equity: number | null;
  reported_currency: string | null;
};

export type CashFlowRow = {
  symbol: string;
  fiscal_year: string | null;
  period: string | null;
  date: string;
  free_cash_flow: number | null;
  operating_cash_flow: number | null;
  capital_expenditure: number | null;
  common_dividends_paid: number | null;
  net_dividends_paid: number | null;
  // FMP's table stores activity totals under verbose names; these are the
  // canonical "operating / investing / financing activities" totals used by
  // the cash-flow chart on the company-detail page.
  net_cash_provided_by_operating_activities: number | null;
  net_cash_provided_by_investing_activities: number | null;
  net_cash_provided_by_financing_activities: number | null;
  reported_currency: string | null;
};

export type RatiosRow = {
  symbol: string;
  fiscal_year: string | null;
  date: string;
  price_to_earnings_ratio: number | null;
  price_to_book_ratio: number | null;
  dividend_payout_ratio: number | null;
  dividend_yield_percentage: number | null;
  dividend_per_share: number | null;
  debt_to_equity_ratio: number | null;
  gross_profit_margin: number | null;
  net_profit_margin: number | null;
};

// ============================================================
// Column lists
// ============================================================

const TICKER_COLUMNS =
  "symbol,name,exchange,exchange_short,price,type,beta,vol_avg,mkt_cap,last_div,range,changes,currency,industry,website,description,ceo,sector,country,full_time_employees,ipo_date,is_etf,is_actively_trading,is_fund,change_percentage,volume,average_volume,image,isin,city,state,zip,phone,address,next_ex_dividend_date,next_ex_dividend_amount,expense_ratio,aum,holdings_count,etf_category,asset_class,nav,etf_company,avg_recovery_days";

// ============================================================
// Sector / industry mappings (web slug → backend schema value)
// ============================================================

export const SECTOR_SLUG_MAP: Record<string, string> = {
  financials: "Financial Services",
  "real-estate": "Real Estate",
  communications: "Communication Services",
  "consumer-discretionary": "Consumer Cyclical",
  "consumer-staples": "Consumer Defensive",
  energy: "Energy",
  "health-care": "Healthcare",
  industrials: "Industrials",
  technology: "Technology",
  materials: "Basic Materials",
  utilities: "Utilities",
};

export const SECTOR_LABEL_MAP: Record<string, string> = {
  "Financial Services": "Financials",
  "Real Estate": "Real Estate",
  "Communication Services": "Communications",
  "Consumer Cyclical": "Consumer Discretionary",
  "Consumer Defensive": "Consumer Staples",
  Energy: "Energy",
  Healthcare: "Health Care",
  Industrials: "Industrials",
  Technology: "Technology",
  "Basic Materials": "Materials",
  Utilities: "Utilities",
};

// EU member states (ISO 3166-1 alpha-2) — used when country: "EU" is selected.
const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

// Native exchanges for each country — used to de-dupe US companies dual-listed
// on foreign exchanges (e.g. PFE.DE/PFE.BA/UPS.MX all have country='US' in the
// data but the primary listing is on NYSE/NASDAQ).
const COUNTRY_PRIMARY_EXCHANGES: Record<string, string[]> = {
  US: ["NASDAQ", "NYSE", "AMEX", "NYSEArca", "BATS", "OTC", "NYSE American", "NASDAQ Global Select"],
  GB: ["LSE"],
  CA: ["TSX", "TSXV", "NEO"],
  AU: ["ASX"],
  JP: ["JPX"],
  IN: ["NSE", "BSE"],
  CN: ["SHH", "SHZ"],
};

// Industries in backend use the " - " format (e.g. "REIT - Industrial"). ILIKE
// patterns are derived from the actual distinct industries present in
// backend.tickers — verified against the live table.
export const INDUSTRY_SLUG_MAP: Record<
  string,
  { label: string; industryPattern?: string; sector?: string }
> = {
  reit: { label: "REITs", industryPattern: "REIT%" },
  mlp: { label: "MLPs", industryPattern: "Oil & Gas Midstream" },
  bdc: { label: "BDCs", industryPattern: "Asset Management" },
  "clean-energy": { label: "Clean Energy", industryPattern: "Renewable Utilities" },
  uranium: { label: "Uranium", industryPattern: "Uranium" },
  lithium: { label: "Lithium", industryPattern: "Industrial Materials" },
  "precious-metals": { label: "Precious Metals", industryPattern: "Gold" },
  water: { label: "Water", industryPattern: "Regulated Water" },
  "natural-resources": { label: "Natural Resources", sector: "Basic Materials" },
  "energy-infrastructure": { label: "Energy Infrastructure", industryPattern: "Oil & Gas Midstream" },
  semiconductors: { label: "Semiconductors", industryPattern: "Semiconductors" },
  software: { label: "Software", industryPattern: "Software%" },
  ecommerce: { label: "eCommerce", industryPattern: "Internet Content & Information" },
  transportation: { label: "Transportation", industryPattern: "Integrated Freight & Logistics" },
  autos: { label: "Autos", industryPattern: "Auto - Manufacturers" },
  airlines: { label: "Airlines", industryPattern: "Airlines%" },
  shipping: { label: "Shipping", industryPattern: "Marine Shipping" },
  "cruise-lines": { label: "Cruise Lines", industryPattern: "Travel Services" },
  hotels: { label: "Hotels", industryPattern: "Travel Lodging" },
  retail: { label: "Retail", industryPattern: "Specialty Retail" },
  "iron-steel": { label: "Iron & Steel", industryPattern: "Steel" },
  chemicals: { label: "Chemicals", industryPattern: "Chemicals%" },
  pharma: { label: "Pharma", industryPattern: "Drug Manufacturers - General" },
  insurance: { label: "Insurance", industryPattern: "Insurance%" },
  "aerospace-defense": { label: "Aerospace & Defense", industryPattern: "Aerospace & Defense" },
};

// ============================================================
// Stock list queries
// ============================================================

export type ScreenerOptions = {
  sector?: string;
  industryPattern?: string;
  // Exclude rows whose industry matches this ILIKE pattern (e.g. equity REITs =
  // all "REIT%" except "REIT - Mortgage").
  industryExcludePattern?: string;
  minMarketCap?: number;
  minDividend?: number;
  minYieldPct?: number;
  symbols?: string[];
  excludeEtfs?: boolean;
  currency?: string;
  // When true, restrict to symbols whose next ex-dividend date is in the future.
  // The next ex-div date lives on backend.tickers.next_ex_dividend_date and is
  // refreshed daily by the FMP edge function. This keeps listings free of stale
  // 2023-style "next dividends" for companies that have stopped paying.
  requireUpcomingDividend?: boolean;
  // ISO 3166 alpha-2 country code (US, GB, CA, AU, etc). Pass "ALL" to include
  // every country. Most listing pages default to "US" so the experience mirrors
  // dividend.com out of the box.
  country?: string;
  offset?: number;
  limit?: number;
  sortBy?: "market_cap" | "yield" | "dividend";
  sortDir?: "asc" | "desc";
};

export async function listStocks(opts: ScreenerOptions = {}): Promise<StockRow[]> {
  const sb = getBackendClient();
  let q = sb
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("is_actively_trading", true)
    .gt("price", 0)
    .not("mkt_cap", "is", null);

  if (opts.excludeEtfs !== false) {
    q = q.eq("is_etf", false).eq("is_fund", false);
  }
  if (opts.currency) {
    q = q.eq("currency", opts.currency);
  }
  if (opts.symbols == null || opts.symbols.length === 0) {
    // Default to US listings. Override with `country: "ALL"` for everything,
    // `country: "EU"` for the EU bloc, or any ISO 3166 code.
    // Also restrict to the country's primary exchange(s) so we don't show
    // dual-listed foreign-exchange duplicates of US/UK/etc companies.
    const country = opts.country ?? "US";
    if (country === "EU") {
      q = q.in("country", EU_COUNTRY_CODES);
    } else if (country !== "ALL") {
      q = q.eq("country", country);
      const primaryExchanges = COUNTRY_PRIMARY_EXCHANGES[country];
      if (primaryExchanges) {
        // Allow either a primary-exchange match OR a null exchange. ~1.4K US
        // dividend payers have `exchange_short = null` in the data — they're
        // still US-country, just missing the field, so they should appear.
        const orClause = `exchange_short.in.(${primaryExchanges.join(",")}),exchange_short.is.null`;
        q = q.or(orClause);
      }
    }
  }
  if (opts.sector) q = q.eq("sector", opts.sector);
  if (opts.industryPattern) q = q.ilike("industry", opts.industryPattern);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (opts.industryExcludePattern) q = (q as any).not("industry", "ilike", opts.industryExcludePattern);
  if (opts.minMarketCap) q = q.gte("mkt_cap", opts.minMarketCap);
  if (opts.minDividend != null) q = q.gte("last_div", opts.minDividend);
  if (opts.symbols && opts.symbols.length > 0) q = q.in("symbol", opts.symbols);
  if (opts.requireUpcomingDividend) {
    q = q.gte("next_ex_dividend_date", new Date().toISOString().slice(0, 10));
  }

  // For sortBy 'yield' we can't sort server-side on a computed column, so
  // fetch a wider slice then sort client-side.
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  if (opts.sortBy === "yield") {
    q = q.order("mkt_cap", { ascending: false, nullsFirst: false }).limit(Math.min(2000, (limit + offset) * 5));
  } else if (opts.sortBy === "dividend") {
    q = q.order("last_div", { ascending: opts.sortDir === "asc", nullsFirst: false }).range(offset, offset + limit - 1);
  } else {
    q = q.order("mkt_cap", { ascending: opts.sortDir === "asc", nullsFirst: false }).range(offset, offset + limit - 1);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[data.listStocks]", error);
    return [];
  }
  let rows = (data as TickerRow[] | null)?.map(toStockRow) ?? [];

  // Backfill yield via TTM-adjusted dividends for any row whose
  // last_div-based yield was nulled out (capped >30%, or last_div NULL).
  // Same helper used by listEtfsByCategory; works for stocks too.
  await enrichEtfYieldsFromDividends(rows);

  if (opts.minYieldPct != null) {
    rows = rows.filter((r) => r.dividend_yield != null && r.dividend_yield >= opts.minYieldPct!);
  }

  if (opts.sortBy === "yield") {
    rows.sort((a, b) => (b.dividend_yield ?? 0) - (a.dividend_yield ?? 0));
    rows = rows.slice(offset, offset + limit);
  }

  return rows;
}

// Approximate count of stocks matching screener filters (used for pagination).
export async function countStocks(opts: ScreenerOptions = {}): Promise<number> {
  const sb = getBackendClient();
  let q = sb
    .from("tickers")
    .select("symbol", { count: "exact", head: true })
    .eq("is_actively_trading", true)
    .gt("price", 0)
    .not("mkt_cap", "is", null);

  if (opts.excludeEtfs !== false) {
    q = q.eq("is_etf", false).eq("is_fund", false);
  }
  if (opts.currency) {
    q = q.eq("currency", opts.currency);
  }
  const country = opts.country ?? "US";
  if (country === "EU") {
    q = q.in("country", EU_COUNTRY_CODES);
  } else if (country !== "ALL") {
    q = q.eq("country", country);
    const primaryExchanges = COUNTRY_PRIMARY_EXCHANGES[country];
    if (primaryExchanges) {
      q = q.in("exchange_short", primaryExchanges);
    }
  }
  if (opts.sector) q = q.eq("sector", opts.sector);
  if (opts.industryPattern) q = q.ilike("industry", opts.industryPattern);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (opts.industryExcludePattern) q = (q as any).not("industry", "ilike", opts.industryExcludePattern);
  if (opts.minMarketCap) q = q.gte("mkt_cap", opts.minMarketCap);
  if (opts.minDividend != null) q = q.gte("last_div", opts.minDividend);
  if (opts.requireUpcomingDividend) {
    q = q.gte("next_ex_dividend_date", new Date().toISOString().slice(0, 10));
  }

  const { count, error } = await q;
  if (error) {
    console.error("[data.countStocks]", error);
    return 0;
  }
  return count ?? 0;
}

export async function getStock(symbol: string): Promise<StockRow | null> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) {
    console.error("[data.getStock]", error);
    return null;
  }
  return data ? toStockRow(data as TickerRow) : null;
}

// ============================================================
// Company listings (multi-listing consolidation)
// The same company often has many ticker variations across exchanges/currencies
// (e.g. Repsol: REP.MC/REP.DE/REPYY/REPYF; Apple: AAPL/APC.DE/AAPL.MX…). They
// share the exact `name`. We group by name and treat the highest-volume listing
// as the "primary" (the real trading venue with the richest data). Used to render
// a TradingView-style listing switcher and to canonicalize every variation to the
// primary so Google sees one company page instead of dozens of thin duplicates.
// ============================================================
export type CompanyListing = {
  symbol: string;
  exchange: string | null;
  currency: string | null;
  country: string | null;
  volume: number | null;
  price: number | null;
};

export async function getCompanyListings(
  name: string | null | undefined,
  opts: { funds?: boolean } = {},
): Promise<CompanyListing[]> {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length < 2) return [];
  const sb = getBackendClient();
  let q = sb
    .from("tickers")
    .select("symbol,exchange_short,exchange,currency,country,volume,price")
    .eq("name", trimmed)
    .eq("is_actively_trading", true);
  // ETFs/funds and common stocks live in the same table — pick the right kind so
  // we don't accidentally group an ETF with a same-named stock.
  q = opts.funds ? q.or("is_etf.eq.true,is_fund.eq.true") : q.eq("is_etf", false).eq("is_fund", false);
  const { data, error } = await q
    .order("volume", { ascending: false, nullsFirst: false })
    .limit(25);
  if (error) {
    console.error("[data.getCompanyListings]", error);
    return [];
  }
  return (
    (data as Array<{
      symbol: string;
      exchange_short: string | null;
      exchange: string | null;
      currency: string | null;
      country: string | null;
      volume: number | null;
      price: number | null;
    }>) ?? []
  ).map((t) => ({
    symbol: t.symbol,
    exchange: t.exchange_short ?? t.exchange ?? null,
    currency: t.currency ?? null,
    country: t.country ?? null,
    volume: t.volume ?? null,
    price: t.price ?? null,
  }));
}

// ============================================================
// ETF detail — includes the metadata columns that `enrichEtfs` populates
// (expense_ratio, aum, holdings_count, asset_class, nav, etf_category,
// etf_company). The base StockRow shape doesn't carry those fields, so we
// expose a dedicated row type for the ETF detail page.
// ============================================================

export type EtfDetailRow = StockRow & {
  expense_ratio: number | null;
  aum: number | null;
  holdings_count: number | null;
  etf_category: string | null;
  asset_class: string | null;
  nav: number | null;
  etf_company: string | null;
  is_adr: boolean | null;
};

const ETF_DETAIL_COLUMNS = `${TICKER_COLUMNS},expense_ratio,aum,holdings_count,etf_category,asset_class,nav,etf_company,is_adr`;

export async function getEtfDetail(symbol: string): Promise<EtfDetailRow | null> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("tickers")
    .select(ETF_DETAIL_COLUMNS)
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) {
    console.error("[data.getEtfDetail]", error);
    return null;
  }
  if (!data) return null;
  const base = toStockRow(data as unknown as TickerRow);
  // Fill in TTM yield from the dividends table when last_div is NULL on the
  // tickers row (common for ETFs like HDV). Same enrichment used by the
  // listing pages.
  if (base.is_etf || base.is_fund) {
    await enrichEtfYieldsFromDividends([base]);
  }
  const extra = data as unknown as {
    expense_ratio: number | null;
    aum: number | null;
    holdings_count: number | null;
    etf_category: string | null;
    asset_class: string | null;
    nav: number | null;
    etf_company: string | null;
    is_adr: boolean | null;
  };
  return {
    ...base,
    expense_ratio: extra.expense_ratio,
    aum: extra.aum,
    holdings_count: extra.holdings_count,
    etf_category: extra.etf_category,
    asset_class: extra.asset_class,
    nav: extra.nav,
    etf_company: extra.etf_company,
    is_adr: extra.is_adr,
  };
}

export type EtfHolding = {
  asset: string;
  name: string | null;
  weight_percentage: number | null;
  shares_number: number | null;
  market_value: number | null;
};

// Reverse lookup: given a stock ticker, find all ETFs that hold it. Pulls
// per-ETF metadata (name, AUM, expense ratio) so callers can render a useful
// table without an N+1 follow-up query.
export type EtfHolderRow = {
  etf_symbol: string;
  etf_name: string | null;
  etf_aum: number | null;
  etf_expense_ratio: number | null;
  etf_category: string | null;
  weight_percentage: number | null;
  shares_number: number | null;
  market_value: number | null;
};

// Lightweight peer-stock lookup for the related-content widget. Returns the
// top dividend payers in the same sector (excluding the target), ranked by
// market cap. Used for internal-linking signal on /stocks/[ticker].
export type PeerStockRow = {
  symbol: string;
  name: string | null;
  dividend_yield: number | null;
};

export async function getPeerStocksInSector(
  symbol: string,
  sector: string | null,
  limit = 6,
): Promise<PeerStockRow[]> {
  if (!sector) return [];
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("tickers")
    .select("symbol,name,price,last_div,mkt_cap")
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("sector", sector)
    .neq("symbol", symbol)
    .gt("last_div", 0)
    .gt("price", 0)
    .gte("mkt_cap", 1_000_000_000)
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as { symbol: string; name: string | null; price: number | null; last_div: number | null; mkt_cap: number | null }[]).map((r) => ({
    symbol: r.symbol,
    name: r.name,
    dividend_yield:
      r.price && r.price > 0 && r.last_div != null ? (r.last_div / r.price) * 100 : null,
  }));
}

// Top ETFs holding the target ticker, capped at N. Wraps getEtfHoldersOf for
// the related-content widget so the call site doesn't have to deal with the
// full holder schema.
export async function getTopEtfHoldersPreview(symbol: string, limit = 6) {
  const holders = await getEtfHoldersOf(symbol, limit);
  return holders.map((h) => ({
    etf_symbol: h.etf_symbol,
    etf_name: h.etf_name,
    weight_percentage: h.weight_percentage,
  }));
}

export async function getEtfHoldersOf(symbol: string, limit = 50000): Promise<EtfHolderRow[]> {
  const sb = getBackendClient();
  // 1) Find every ETF that holds this asset, sorted by weight desc. The
  // etf_holdings_asset_idx index makes this cheap even at 5K+ results, so
  // we default to a high limit that effectively returns "all".
  const { data: holdings, error } = await sb
    .from("etf_holdings")
    .select("etf_symbol,weight_percentage,shares_number,market_value")
    .eq("asset", symbol.toUpperCase())
    .order("weight_percentage", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !holdings) {
    console.error("[data.getEtfHoldersOf]", error?.message ?? error);
    return [];
  }
  const etfSymbols = (holdings as { etf_symbol: string }[]).map((h) => h.etf_symbol);
  if (etfSymbols.length === 0) return [];

  // 2) Hydrate each ETF row with ticker metadata.
  const { data: metas } = await sb
    .from("tickers")
    .select("symbol,name,aum,expense_ratio,etf_category")
    .in("symbol", etfSymbols);
  const metaBySymbol = new Map<string, { name: string | null; aum: number | null; expense_ratio: number | null; etf_category: string | null }>();
  for (const m of (metas as { symbol: string; name: string | null; aum: number | null; expense_ratio: number | null; etf_category: string | null }[]) ?? []) {
    metaBySymbol.set(m.symbol, {
      name: m.name,
      aum: m.aum,
      expense_ratio: m.expense_ratio,
      etf_category: m.etf_category,
    });
  }

  return (holdings as { etf_symbol: string; weight_percentage: number | null; shares_number: number | null; market_value: number | null }[]).map((h) => {
    const meta = metaBySymbol.get(h.etf_symbol);
    return {
      etf_symbol: h.etf_symbol,
      etf_name: meta?.name ?? null,
      etf_aum: meta?.aum ?? null,
      etf_expense_ratio: meta?.expense_ratio ?? null,
      etf_category: meta?.etf_category ?? null,
      weight_percentage: h.weight_percentage,
      shares_number: h.shares_number,
      market_value: h.market_value,
    };
  });
}

// ============================================================
// Single-RPC detail loaders (Vercel cost optimization)
// ------------------------------------------------------------
// One supabase.rpc round-trip returns the ENTIRE /stocks/[ticker] or
// /etfs/symbol/[ticker] payload, replacing the ~15–17 separate queries each
// cold (mostly crawler-driven) render used to fire. The JSON is mapped back
// into the exact shapes the pages already consume — toStockRow still applies
// the >30% yield cap — so no downstream component changes. The old granular
// functions above stay in place for the many other callers.
// ============================================================

// Raw JSON shape returned by backend.get_stock_detail.
type StockDetailPayload = {
  stock: TickerRow | null;
  dividends: DividendEvent[];
  news: NewsRow[];
  prices: HistoricalPriceRow[];
  incomeAnnual: IncomeStatementRow[];
  incomeQuarterly: IncomeStatementRow[];
  balanceAnnual: BalanceSheetRow[];
  balanceQuarterly: BalanceSheetRow[];
  cashFlowAnnual: CashFlowRow[];
  cashFlowQuarterly: CashFlowRow[];
  ratios: RatiosRow | null;
  listings: CompanyListing[];
  peers: { symbol: string; name: string | null; price: number | null; last_div: number | null }[];
  etfHolders: { etf_symbol: string; etf_name: string | null; weight_percentage: number | null }[];
};

export type StockDetail = {
  stock: StockRow | null;
  dividends: DividendEvent[];
  news: NewsRow[];
  prices: HistoricalPriceRow[];
  incomeAnnual: IncomeStatementRow[];
  incomeQuarterly: IncomeStatementRow[];
  balanceAnnual: BalanceSheetRow[];
  balanceQuarterly: BalanceSheetRow[];
  cashFlowAnnualRows: CashFlowRow[];
  cashFlowQuarterlyRows: CashFlowRow[];
  ratios: RatiosRow | null;
  listings: CompanyListing[];
  peerStocks: PeerStockRow[];
  topEtfHolders: { etf_symbol: string; etf_name: string | null; weight_percentage: number | null }[];
};

export async function getStockDetail(symbol: string): Promise<StockDetail | null> {
  const sb = getBackendClient();
  const { data, error } = await sb.rpc("get_stock_detail", { p_symbol: symbol });
  if (error) {
    console.error("[data.getStockDetail]", error.message ?? error);
    return null;
  }
  if (!data) return null;
  const p = data as StockDetailPayload;
  return {
    stock: p.stock ? toStockRow(p.stock) : null,
    dividends: p.dividends ?? [],
    news: p.news ?? [],
    prices: p.prices ?? [],
    incomeAnnual: p.incomeAnnual ?? [],
    incomeQuarterly: p.incomeQuarterly ?? [],
    balanceAnnual: p.balanceAnnual ?? [],
    balanceQuarterly: p.balanceQuarterly ?? [],
    cashFlowAnnualRows: p.cashFlowAnnual ?? [],
    cashFlowQuarterlyRows: p.cashFlowQuarterly ?? [],
    ratios: p.ratios ?? null,
    listings: p.listings ?? [],
    // Mirror getPeerStocksInSector's yield math exactly.
    peerStocks: (p.peers ?? []).map((r) => ({
      symbol: r.symbol,
      name: r.name,
      dividend_yield:
        r.price && r.price > 0 && r.last_div != null ? (r.last_div / r.price) * 100 : null,
    })),
    topEtfHolders: p.etfHolders ?? [],
  };
}

// Raw JSON shape returned by backend.get_etf_detail.
type EtfDetailPayload = {
  etf: (TickerRow & { is_adr: boolean | null }) | null;
  dividends: DividendEvent[];
  news: NewsRow[];
  prices: HistoricalPriceRow[];
  holdings: EtfHolding[];
  sectorWeights: EtfSectorWeight[];
  countryWeights: EtfCountryWeight[];
  listings: CompanyListing[];
};

export type EtfDetailFull = {
  etf: EtfDetailRow | null;
  dividends: DividendEvent[];
  news: NewsRow[];
  prices: HistoricalPriceRow[];
  holdings: EtfHolding[];
  sectorWeights: EtfSectorWeight[];
  countryWeights: EtfCountryWeight[];
  listings: CompanyListing[];
};

export async function getEtfDetailFull(symbol: string): Promise<EtfDetailFull | null> {
  const sb = getBackendClient();
  const { data, error } = await sb.rpc("get_etf_detail", { p_symbol: symbol });
  if (error) {
    console.error("[data.getEtfDetailFull]", error.message ?? error);
    return null;
  }
  if (!data) return null;
  const p = data as EtfDetailPayload;
  let etf: EtfDetailRow | null = null;
  if (p.etf) {
    const base = toStockRow(p.etf);
    // Mirror enrichEtfYieldsFromDividends — but from the distributions already
    // in this payload, so no extra round-trip. When the tickers row carries no
    // usable yield, derive a TTM yield from the last 12 months of split-
    // adjusted distributions.
    if (base.dividend_yield == null && base.price != null && base.price > 0) {
      const cutoff = Date.now() - 365 * 86400 * 1000;
      let ttm = 0;
      for (const d of p.dividends ?? []) {
        if (!d.date || new Date(d.date).getTime() < cutoff) continue;
        const val = d.adj_dividend != null ? Number(d.adj_dividend) : Number(d.dividend);
        if (!Number.isFinite(val) || val <= 0) continue;
        ttm += val;
      }
      if (ttm > 0) {
        base.dividend_yield = (ttm / base.price) * 100;
        base.annual_dividend = ttm;
      }
    }
    // Re-assert the ETF-only columns from the raw row so the result satisfies
    // EtfDetailRow (StockRow types them as optional). Mirrors getEtfDetail.
    etf = {
      ...base,
      expense_ratio: p.etf.expense_ratio,
      aum: p.etf.aum,
      holdings_count: p.etf.holdings_count,
      etf_category: p.etf.etf_category,
      asset_class: p.etf.asset_class,
      nav: p.etf.nav,
      etf_company: p.etf.etf_company,
      is_adr: p.etf.is_adr ?? null,
    };
  }
  return {
    etf,
    dividends: p.dividends ?? [],
    news: p.news ?? [],
    prices: p.prices ?? [],
    holdings: p.holdings ?? [],
    sectorWeights: p.sectorWeights ?? [],
    countryWeights: p.countryWeights ?? [],
    listings: p.listings ?? [],
  };
}

// Aggregate: which stocks are held by the most ETFs (basket exposure).
// Used by the heatmap / "top held by ETFs" page.
export type MostHeldRow = {
  asset: string;
  asset_name: string | null;
  asset_sector: string | null;
  etf_count: number;
  total_market_value: number | null;
  weight_total: number | null;
};

// "Could-be" dividend payers: profitable companies that don't yet distribute,
// ranked by how strong the case is. We look for:
//   - net_income > 0 in the latest annual income statement
//   - free_cash_flow > 0 in the latest annual cash flow
//   - last_div = 0 (currently not paying)
//   - market cap > $500M (filters out micro-caps that rarely initiate)
// Returns a candidate score = FCF margin proxy so the user sees the most
// dividend-ready names first.
export type PotentialPayerRow = {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  net_income: number | null;
  free_cash_flow: number | null;
  fcf_margin: number | null;
};

// Heavy LATERAL-join RPC (~5s uncached). Cache it — the underlying financials
// change at most daily, and this page was running the full computation on every
// load (force-dynamic). unstable_cache keyed by limit; revalidate hourly.
export const getPotentialDividendPayers = unstable_cache(
  _getPotentialDividendPayers,
  ["potential-dividend-payers"],
  { revalidate: 3600 },
);

async function _getPotentialDividendPayers(limit = 120): Promise<PotentialPayerRow[]> {
  const sb = getBackendClient();
  // Delegated to a SQL function so we get a single indexed query with
  // LATERAL joins instead of two giant .in(...) lookups that overflowed
  // PostgREST URL limits at 3K symbols and silently returned empty.
  const { data, error } = await sb.rpc("potential_dividend_payers", {
    row_limit: limit,
    min_mkt_cap: 500_000_000,
  });
  if (error) {
    console.error("[data.getPotentialDividendPayers]", error.message ?? error);
    return [];
  }
  return (data as Array<{
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    market_cap: number | null;
    net_income: number | null;
    free_cash_flow: number | null;
    fcf_margin: number | null;
  }>).map((r) => ({
    symbol: r.symbol,
    name: r.name,
    sector: r.sector,
    industry: r.industry,
    market_cap: r.market_cap != null ? Number(r.market_cap) : null,
    net_income: r.net_income != null ? Number(r.net_income) : null,
    free_cash_flow: r.free_cash_flow != null ? Number(r.free_cash_flow) : null,
    fcf_margin: r.fcf_margin != null ? Number(r.fcf_margin) : null,
  }));
}

export async function getMostHeldByEtfs(limit = 100): Promise<MostHeldRow[]> {
  const sb = getBackendClient();
  // Postgres aggregate via direct SQL is faster than client-side grouping.
  const { data, error } = await sb.rpc("etf_top_held", { row_limit: limit });
  if (error || !data) {
    // Fallback: client-side aggregation if the RPC isn't installed yet.
    const { data: rows } = await sb
      .from("etf_holdings")
      .select("asset,weight_percentage,market_value")
      .limit(50000);
    if (!rows) return [];
    const agg = new Map<string, { count: number; total_mv: number; total_w: number }>();
    for (const r of rows as { asset: string; weight_percentage: number | null; market_value: number | null }[]) {
      const cur = agg.get(r.asset) ?? { count: 0, total_mv: 0, total_w: 0 };
      cur.count += 1;
      cur.total_mv += Number(r.market_value ?? 0);
      cur.total_w += Number(r.weight_percentage ?? 0);
      agg.set(r.asset, cur);
    }
    const top = Array.from(agg.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);
    const assets = top.map(([a]) => a);
    const { data: tickerRows } = await sb
      .from("tickers")
      .select("symbol,name,sector")
      .in("symbol", assets);
    const tickerMap = new Map<string, { name: string | null; sector: string | null }>();
    for (const t of (tickerRows as { symbol: string; name: string | null; sector: string | null }[]) ?? []) {
      tickerMap.set(t.symbol, { name: t.name, sector: t.sector });
    }
    return top.map(([asset, v]) => ({
      asset,
      asset_name: tickerMap.get(asset)?.name ?? null,
      asset_sector: tickerMap.get(asset)?.sector ?? null,
      etf_count: v.count,
      total_market_value: v.total_mv,
      weight_total: v.total_w,
    }));
  }
  return data as MostHeldRow[];
}

export async function getEtfHoldings(symbol: string, limit = 25): Promise<EtfHolding[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("etf_holdings")
    .select("asset,name,weight_percentage,shares_number,market_value")
    .eq("etf_symbol", symbol)
    .order("weight_percentage", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error("[data.getEtfHoldings]", error);
    return [];
  }
  return (data as EtfHolding[]) ?? [];
}

export type EtfSectorWeight = {
  sector: string;
  weight_percentage: number | null;
};

export async function getEtfSectorWeights(symbol: string): Promise<EtfSectorWeight[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("etf_sector_weightings")
    .select("sector,weight_percentage")
    .eq("etf_symbol", symbol)
    .order("weight_percentage", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("[data.getEtfSectorWeights]", error);
    return [];
  }
  return (data as EtfSectorWeight[]) ?? [];
}

export type EtfCountryWeight = {
  country: string;
  weight_percentage: number | null;
};

export async function getEtfCountryWeights(symbol: string): Promise<EtfCountryWeight[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("etf_country_weightings")
    .select("country,weight_percentage")
    .eq("etf_symbol", symbol)
    .order("weight_percentage", { ascending: false, nullsFirst: false });
  if (error) {
    // Treat missing table as "no data yet" — the migration may not be applied
    // on every environment, and the data is purely additive.
    if (!String(error.message ?? "").includes("does not exist")) {
      console.error("[data.getEtfCountryWeights]", error);
    }
    return [];
  }
  return (data as EtfCountryWeight[]) ?? [];
}

// Redact sensitive identifiers + premium fields before sending rows to free
// users. Visual blur alone leaks the real values to anyone who hits "Inspect"
// in their browser; we have to scrub them out of the payload entirely.
export function redactRowsForFree(rows: StockRow[], isPremium: boolean): StockRow[] {
  if (isPremium) return rows;
  return rows.map((r, i) => ({
    ...r,
    // Keep a stable per-position placeholder so React keys stay unique and
    // sort comparators don't NaN out.
    symbol: `PRM-${i}`,
    name: "Premium content",
    industry: null,
    sector: null,
    description: null,
    isin: null,
    ceo: null,
    website: null,
    image: null,
    city: null,
    state: null,
    zip: null,
    etf_company: null,
    etf_category: null,
  }));
}

// Compute the ratings/extras/upcomingDividends maps only for premium users.
// Non-premium users get empty maps so nothing rating-related reaches the wire.
export function gatedMap<T>(map: Map<string, T>, isPremium: boolean): Map<string, T> {
  return isPremium ? map : new Map();
}

// Composite ETF rating: 5-band score derived from yield, AUM, expense ratio,
// and 1-year return. Returns null for components missing data so the UI can
// hide them gracefully.
export type EtfRating = {
  symbol: string;
  yieldScore: number | null;
  aumScore: number | null;
  costScore: number | null;
  returnScore: number | null;
  composite: number | null;
  grade: string;
};

export function computeEtfRating(
  detail: EtfDetailRow,
  oneYearReturn: number | null
): EtfRating {
  // Each component is normalized to 0–5.
  const yieldPct = detail.dividend_yield;
  // Yield: 0% → 0, 4% → 3, 6%+ → 5 (cap at 5 to avoid rewarding yield traps).
  const yieldScore =
    yieldPct == null ? null : Math.max(0, Math.min(5, (yieldPct / 6) * 5));

  // AUM: bigger ETFs are safer / more liquid. 100M → 1, 1B → 3, 50B+ → 5.
  const aumScore =
    detail.aum == null
      ? null
      : detail.aum < 100_000_000
      ? 0.5
      : detail.aum < 1_000_000_000
      ? 1 + ((detail.aum - 100_000_000) / 900_000_000) * 2
      : detail.aum < 50_000_000_000
      ? 3 + ((detail.aum - 1_000_000_000) / 49_000_000_000) * 2
      : 5;

  // Cost: lower expense ratio is better. expense_ratio is stored as a percent
  // (HDV = 0.08 means 0.08%), so the thresholds are in percent units.
  const costScore =
    detail.expense_ratio == null
      ? null
      : detail.expense_ratio < 0.1
      ? 5
      : detail.expense_ratio < 0.5
      ? 4
      : detail.expense_ratio < 1.0
      ? 3
      : detail.expense_ratio < 2.0
      ? 2
      : 1;

  // Return: 1-year total return %. <0 → 0, 8% → 3, 20%+ → 5.
  const returnScore =
    oneYearReturn == null
      ? null
      : oneYearReturn < 0
      ? 0
      : oneYearReturn > 20
      ? 5
      : (oneYearReturn / 20) * 5;

  const components = [yieldScore, aumScore, costScore, returnScore].filter(
    (s): s is number => s != null
  );
  const composite =
    components.length === 0
      ? null
      : components.reduce((a, b) => a + b, 0) / components.length;

  const grade =
    composite == null
      ? "—"
      : composite >= 4
      ? "A"
      : composite >= 3
      ? "B"
      : composite >= 2
      ? "C"
      : composite >= 1
      ? "D"
      : "F";

  return {
    symbol: detail.symbol,
    yieldScore,
    aumScore,
    costScore,
    returnScore,
    composite,
    grade,
  };
}

// ============================================================
// Stock ratings from backend.stock_ratings_daily
// ============================================================

const RATING_COLUMNS =
  "symbol,computed_date,value_score,growth_score,profit_score,momentum_score,health_score,composite_total,composite_grade,composite_color,cohort_industry";

export async function getStockRating(symbol: string): Promise<StockRating | null> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("stock_ratings_daily")
    .select(RATING_COLUMNS)
    .eq("symbol", symbol)
    .order("computed_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[data.getStockRating]", error);
    return null;
  }
  return (data as StockRating) ?? null;
}

export async function getStockRatings(symbols: string[]): Promise<Map<string, StockRating>> {
  if (symbols.length === 0) return new Map();
  const sb = getBackendClient();
  // Pull the latest rating per symbol within a 90-day window. A 7-day window
  // dropped stocks whose ratings haven't been recomputed recently (AVGO, AMD,
  // INTC, ADBE, JNJ etc. were 21+ days stale and showed no rating on the
  // top-held heatmap). 90 days covers virtually all stale stocks while still
  // bounding the row count we fetch.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const { data, error } = await sb
    .from("stock_ratings_daily")
    .select(RATING_COLUMNS)
    .in("symbol", symbols)
    .gte("computed_date", ninetyDaysAgo.toISOString().slice(0, 10))
    .order("computed_date", { ascending: false });
  if (error) {
    console.error("[data.getStockRatings]", error.message ?? error.code ?? JSON.stringify(error));
    return new Map();
  }
  const byBest = new Map<string, StockRating>();
  for (const row of (data as StockRating[]) ?? []) {
    if (!byBest.has(row.symbol)) byBest.set(row.symbol, row);
  }
  return byBest;
}

// Fetch per-symbol extras used by the Div Growth / Returns column views.
// Pulls from multiple tables in parallel and computes returns/52w% locally.
export async function getStockExtras(symbols: string[]): Promise<Map<string, StockExtras>> {
  const map = new Map<string, StockExtras>();
  if (symbols.length === 0) return map;
  const sb = getBackendClient();
  const sbPublic = getAdminClient("public");

  // Latest ratios (annual): PE, payout ratio
  // Latest key_metrics: net_debt_to_ebitda
  // Tickers: 52-week range, current price
  // dividend_aristocrats / kings / achievers etc: consecutive increases + CAGR
  const [ratios, keyMetrics, tickerRows, growerRows] = await Promise.all([
    sb
      .from("ratios_annual")
      .select("symbol,date,price_to_earnings_ratio,dividend_payout_ratio")
      .in("symbol", symbols)
      .order("date", { ascending: false })
      .limit(symbols.length * 5),
    sb
      .from("key_metrics_annual")
      .select("symbol,date,net_debt_to_ebitda")
      .in("symbol", symbols)
      .order("date", { ascending: false })
      .limit(symbols.length * 5),
    sb
      .from("tickers")
      .select("symbol,price,range")
      .in("symbol", symbols),
    // Pull each grower table once and merge consecutive_increases. We only need
    // a per-symbol single row; whichever table has the symbol wins.
    Promise.all([
      sbPublic.from("dividend_kings").select("symbol,consecutive_increases,dividendcagr_1y,dividendcagr_5y").in("symbol", symbols),
      sbPublic.from("dividend_aristocrats").select("symbol,consecutive_increases,dividendcagr_1y,dividendcagr_5y").in("symbol", symbols),
      sbPublic.from("dividend_contenders").select("symbol,consecutive_increases,dividendcagr_1y,dividendcagr_5y").in("symbol", symbols),
      sbPublic.from("dividend_achievers").select("symbol,consecutive_increases,dividendcagr_1y,dividendcagr_5y").in("symbol", symbols),
      sbPublic.from("dividend_challengers").select("symbol,consecutive_increases,dividendcagr_1y,dividendcagr_5y").in("symbol", symbols),
    ]),
  ]);

  function ensure(sym: string): StockExtras {
    let e = map.get(sym);
    if (!e) {
      e = { symbol: sym };
      map.set(sym, e);
    }
    return e;
  }

  // Take the first (most recent) ratio row per symbol
  const seenRatio = new Set<string>();
  for (const r of (ratios.data as { symbol: string; price_to_earnings_ratio: number | null; dividend_payout_ratio: number | null }[]) ?? []) {
    if (seenRatio.has(r.symbol)) continue;
    seenRatio.add(r.symbol);
    const e = ensure(r.symbol);
    e.peRatio = r.price_to_earnings_ratio;
    e.payoutRatio = r.dividend_payout_ratio;
  }

  const seenKM = new Set<string>();
  for (const r of (keyMetrics.data as { symbol: string; net_debt_to_ebitda: number | null }[]) ?? []) {
    if (seenKM.has(r.symbol)) continue;
    seenKM.add(r.symbol);
    ensure(r.symbol).netDebtToEbitda = r.net_debt_to_ebitda;
  }

  // 52-week range from tickers.range ("low-high")
  for (const r of (tickerRows.data as { symbol: string; price: number | null; range: string | null }[]) ?? []) {
    const e = ensure(r.symbol);
    if (r.range) {
      const parts = r.range.split("-").map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && isFinite(parts[0]) && isFinite(parts[1])) {
        e.yearLow = parts[0];
        e.yearHigh = parts[1];
        if (r.price && parts[1] > 0) {
          e.pctOff52wHigh = ((r.price - parts[1]) / parts[1]) * 100;
        }
      }
    }
  }

  // CAGR values from the legacy grower tables are still trusted (they're
  // sourced separately and look correct). The `consecutive_increases` column
  // is not — we replace it with the nightly-computed values from
  // backend.dividend_streaks.
  const growerTables = growerRows;
  for (const tableRes of growerTables) {
    for (const r of (tableRes.data as { symbol: string; consecutive_increases: number | null; dividendcagr_1y: number | null; dividendcagr_5y: number | null }[]) ?? []) {
      const e = ensure(r.symbol);
      if (e.divCagr1y == null && r.dividendcagr_1y != null) e.divCagr1y = Number(r.dividendcagr_1y);
      if (e.divCagr5y == null && r.dividendcagr_5y != null) e.divCagr5y = Number(r.dividendcagr_5y);
    }
  }

  // Seed consecutive_increases from the nightly streaks table — a single
  // query covering the whole page. Falls through to history computation
  // below for any symbol not yet in the table.
  const streakMap = await fetchStreakRows(symbols);
  for (const [sym, streak] of streakMap.entries()) {
    const e = ensure(sym);
    e.consecutiveIncreases = streak;
  }

  // For symbols still missing growth metrics (CAGR + any streak gap), derive
  // them from full dividend history.
  await enrichGrowthFromHistory(symbols, map);

  // Returns: compute from historical_prices_stocks. To keep this fast we only
  // pull rows for specific reference dates per symbol (today's latest, 1Y/3Y/5Y/10Y/YTD ago).
  await enrichReturns(symbols, map);

  return map;
}

// Compute consecutive-increase years + 1Y/5Y dividend CAGR from per-symbol
// payment history. Only fills fields that are still null after the grower-table
// merge so the curated lists stay authoritative.
async function enrichGrowthFromHistory(
  symbols: string[],
  map: Map<string, { symbol: string; consecutiveIncreases?: number | null; divCagr1y?: number | null; divCagr5y?: number | null }>
): Promise<void> {
  if (symbols.length === 0) return;
  // Only request enrichment for symbols missing one of the three metrics.
  const missing = symbols.filter((s) => {
    const e = map.get(s);
    return !e || e.consecutiveIncreases == null || e.divCagr1y == null || e.divCagr5y == null;
  });
  if (missing.length === 0) return;

  const sb = getBackendClient();
  const today = new Date().toISOString().slice(0, 10);
  // ~20 years of history should comfortably cover the 5Y CAGR + Aristocrat-like
  // consecutive-increase streaks while staying under 250k total rows.
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 22);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  // Pull adj_dividend alongside dividend. Raw `dividend` stores pre-split
  // per-share values, so a 5:1 split shows up as a year-over-year drop and
  // would falsely terminate the streak. adj_dividend is split-adjusted and
  // pairs cleanly across years.
  const { data } = await sb
    .from("dividends")
    .select("symbol,date,adj_dividend,dividend")
    .in("symbol", missing)
    .gte("date", cutoffIso)
    .lt("date", today)
    .order("date", { ascending: true })
    .limit(missing.length * 80);

  const bySym = new Map<string, { date: string; dividend: number }[]>();
  for (const r of (data as { symbol: string; date: string; adj_dividend: number | null; dividend: number }[]) ?? []) {
    const val = r.adj_dividend != null ? Number(r.adj_dividend) : Number(r.dividend);
    if (!isFinite(val) || val <= 0) continue;
    const arr = bySym.get(r.symbol) ?? [];
    arr.push({ date: r.date, dividend: val });
    bySym.set(r.symbol, arr);
  }

  for (const [sym, rows] of bySym.entries()) {
    if (rows.length === 0) continue;
    // Bucket dividends by calendar year, summing each year's total.
    const byYear = new Map<number, number>();
    for (const r of rows) {
      const y = parseInt(r.date.slice(0, 4), 10);
      if (!isFinite(y)) continue;
      byYear.set(y, (byYear.get(y) ?? 0) + r.dividend);
    }
    if (byYear.size < 2) continue;
    const yearsSorted = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);
    // Drop the current year — it's almost always incomplete.
    const thisYear = new Date().getFullYear();
    const completed = yearsSorted.filter(([y]) => y < thisYear);
    if (completed.length < 2) continue;

    // Consecutive years where the annual total was strictly higher than the
    // prior year. Walk backwards from the most recent completed year.
    let streak = 0;
    for (let i = completed.length - 1; i > 0; i--) {
      if (completed[i][1] > completed[i - 1][1]) streak++;
      else break;
    }

    // CAGR(n) = (latest / past)^(1/n) − 1, expressed as %.
    function cagr(n: number): number | null {
      if (completed.length < n + 1) return null;
      const latest = completed[completed.length - 1][1];
      const past = completed[completed.length - 1 - n][1];
      if (latest <= 0 || past <= 0) return null;
      return (Math.pow(latest / past, 1 / n) - 1) * 100;
    }
    const cagr1 = cagr(1);
    const cagr5 = cagr(5);

    const e = map.get(sym) ?? { symbol: sym };
    if (e.consecutiveIncreases == null) e.consecutiveIncreases = streak;
    if (e.divCagr1y == null && cagr1 != null) e.divCagr1y = cagr1;
    if (e.divCagr5y == null && cagr5 != null) e.divCagr5y = cagr5;
    map.set(sym, e);
  }
}

async function enrichReturns(symbols: string[], map: Map<string, StockExtras>): Promise<void> {
  if (symbols.length === 0) return;
  const sb = getBackendClient();
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(today.getFullYear() - 1);
  const threeYearsAgo = new Date(today);
  threeYearsAgo.setFullYear(today.getFullYear() - 3);
  const fiveYearsAgo = new Date(today);
  fiveYearsAgo.setFullYear(today.getFullYear() - 5);
  const tenYearsAgo = new Date(today);
  tenYearsAgo.setFullYear(today.getFullYear() - 10);
  const ytdAnchor = new Date(today.getFullYear(), 0, 1);
  const oldest = tenYearsAgo;

  const { data } = await sb
    .from("historical_prices_stocks")
    .select("symbol,date,close")
    .in("symbol", symbols)
    .gte("date", oldest.toISOString().slice(0, 10))
    .order("date", { ascending: false })
    .limit(symbols.length * 50);

  type Row = { symbol: string; date: string; close: number };
  const bySym = new Map<string, Row[]>();
  for (const r of (data as Row[]) ?? []) {
    const arr = bySym.get(r.symbol) ?? [];
    arr.push(r);
    bySym.set(r.symbol, arr);
  }

  function priceClosestTo(rows: Row[], anchor: Date): number | null {
    if (rows.length === 0) return null;
    const target = anchor.getTime();
    let best: Row | null = null;
    let bestDist = Infinity;
    for (const r of rows) {
      const d = Math.abs(new Date(r.date).getTime() - target);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    return best?.close ?? null;
  }

  for (const [sym, rows] of bySym.entries()) {
    if (rows.length < 2) continue;
    const latest = rows[0].close;
    if (!latest || latest <= 0) continue;
    const e = map.get(sym) ?? { symbol: sym };
    map.set(sym, e);

    const ytd = priceClosestTo(rows, ytdAnchor);
    if (ytd && ytd > 0) e.returnYtd = ((latest - ytd) / ytd) * 100;

    const p1 = priceClosestTo(rows, yearAgo);
    if (p1 && p1 > 0) e.return1y = ((latest - p1) / p1) * 100;

    const p3 = priceClosestTo(rows, threeYearsAgo);
    if (p3 && p3 > 0) e.return3y = (Math.pow(latest / p3, 1 / 3) - 1) * 100;

    const p5 = priceClosestTo(rows, fiveYearsAgo);
    if (p5 && p5 > 0) e.return5y = (Math.pow(latest / p5, 1 / 5) - 1) * 100;

    const p10 = priceClosestTo(rows, tenYearsAgo);
    if (p10 && p10 > 0) e.return10y = (Math.pow(latest / p10, 1 / 10) - 1) * 100;
  }
}

// Real "monthly income from quarterly dividends" portfolio: pick the highest-rated
// quarterly-payer dividend stocks across 3 staggered groups (months 1,4,7,10 /
// 2,5,8,11 / 3,6,9,12) by matching ex-dividend dates against month buckets.
export async function staggeredQuarterlyPortfolio(limit = 24): Promise<StockRow[]> {
  const sb = getBackendClient();
  // Pull recent quarterly dividends from the last 4 months — enough to map each
  // symbol into a month bucket.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 4);
  const { data: divs } = await sb
    .from("dividends")
    .select("symbol,date,frequency")
    .ilike("frequency", "Quarterly")
    .gte("date", cutoff.toISOString().slice(0, 10))
    .limit(5000);
  if (!divs || (divs as { symbol: string; date: string }[]).length === 0) return [];

  // Map: symbol → month bucket (1-3) based on most recent ex-date month
  const bucket = new Map<string, number>();
  for (const d of divs as { symbol: string; date: string }[]) {
    if (bucket.has(d.symbol)) continue;
    const m = new Date(d.date).getMonth() + 1; // 1-12
    bucket.set(d.symbol, ((m - 1) % 3) + 1);
  }
  const allSymbols = Array.from(bucket.keys());
  if (allSymbols.length === 0) return [];

  // Fetch stock data + ratings, then pick top-N per bucket
  const [stocks, ratings] = await Promise.all([
    listStocks({ symbols: allSymbols, minMarketCap: 1_000_000_000, limit: 1000, excludeEtfs: false }),
    getStockRatings(allSymbols),
  ]);
  const perBucket = Math.max(8, Math.ceil(limit / 3));
  const byBucket: Record<number, StockRow[]> = { 1: [], 2: [], 3: [] };
  // Sort by composite rating then market cap
  const sorted = [...stocks].sort((a, b) => {
    const ra = ratings.get(a.symbol)?.composite_total ?? -1;
    const rb = ratings.get(b.symbol)?.composite_total ?? -1;
    if (rb !== ra) return rb - ra;
    return (b.market_cap ?? 0) - (a.market_cap ?? 0);
  });
  for (const s of sorted) {
    const b = bucket.get(s.symbol);
    if (!b) continue;
    if (byBucket[b].length < perBucket) byBucket[b].push(s);
  }
  // Interleave buckets so the display alternates monthly groups
  const result: StockRow[] = [];
  for (let i = 0; i < perBucket; i++) {
    for (const b of [1, 2, 3]) {
      const s = byBucket[b][i];
      if (s) result.push(s);
    }
  }
  return result.slice(0, limit);
}

// Real target-date allocation: blue-chip dividend payers, weighted by horizon.
// Short horizon (< 10 yrs) = high yield + low beta. Mid = balanced. Long = growth.
export async function targetDatePortfolio(targetYear: number, limit = 25): Promise<StockRow[]> {
  const nowYear = new Date().getFullYear();
  const diff = targetYear - nowYear;
  const horizon: "short" | "mid" | "long" = diff <= 10 ? "short" : diff <= 25 ? "mid" : "long";

  let candidates: StockRow[] = [];
  if (horizon === "short") {
    // High-yield, low-beta US dividend payers
    candidates = await listStocks({
      country: "US",
      minDividend: 1,
      minYieldPct: 2.5,
      minMarketCap: 10_000_000_000,
      limit: 500,
    });
  } else if (horizon === "mid") {
    // Balanced — moderate yield, large-cap
    candidates = await listStocks({
      country: "US",
      minDividend: 0.5,
      minYieldPct: 1,
      minMarketCap: 20_000_000_000,
      limit: 500,
    });
  } else {
    // Growth tilt — large-cap with dividend, no yield floor
    candidates = await listStocks({
      country: "US",
      minDividend: 0,
      minMarketCap: 50_000_000_000,
      limit: 500,
    });
  }

  // Rank by composite rating
  const ratings = await getStockRatings(candidates.map((c) => c.symbol));
  const sorted = [...candidates].sort((a, b) => {
    const ra = ratings.get(a.symbol)?.composite_total ?? -1;
    const rb = ratings.get(b.symbol)?.composite_total ?? -1;
    if (rb !== ra) return rb - ra;
    return (b.market_cap ?? 0) - (a.market_cap ?? 0);
  });
  return sorted.slice(0, limit);
}

// Real allocation-fund portfolio (income / balanced / conservative / etc).
// Driven by yield + market cap bands and ranked by composite rating.
export type AllocationKind =
  | "income"
  | "balanced"
  | "conservative"
  | "tactical"
  | "us"
  | "international";

export async function allocationPortfolio(kind: AllocationKind, limit = 25): Promise<StockRow[]> {
  let opts: ScreenerOptions;
  if (kind === "income") {
    opts = { country: "US", minDividend: 1.5, minYieldPct: 4, minMarketCap: 1_000_000_000, sortBy: "yield", limit: 200 };
  } else if (kind === "balanced") {
    opts = { country: "US", minDividend: 0.5, minYieldPct: 2, minMarketCap: 10_000_000_000, limit: 200 };
  } else if (kind === "conservative") {
    opts = { country: "US", minDividend: 0.5, minYieldPct: 1.5, minMarketCap: 50_000_000_000, limit: 200 };
  } else if (kind === "tactical") {
    opts = { country: "US", minDividend: 0, minMarketCap: 10_000_000_000, limit: 200 };
  } else if (kind === "us") {
    opts = { country: "US", minDividend: 0.5, minMarketCap: 20_000_000_000, limit: 200 };
  } else {
    // international = everything except US, by market cap
    opts = { country: "ALL", minDividend: 0.5, minMarketCap: 10_000_000_000, limit: 500 };
  }

  let rows = await listStocks(opts);
  if (kind === "international") {
    rows = rows.filter((r) => r.country !== "US");
  }
  const ratings = await getStockRatings(rows.map((r) => r.symbol));
  rows.sort((a, b) => {
    const ra = ratings.get(a.symbol)?.composite_total ?? -1;
    const rb = ratings.get(b.symbol)?.composite_total ?? -1;
    if (rb !== ra) return rb - ra;
    return (b.market_cap ?? 0) - (a.market_cap ?? 0);
  });
  return rows.slice(0, limit);
}

// Pull cached `avg_recovery_days` for a batch of symbols from backend.tickers.
// Populated by the edge function refresh-fmp-data?stage=recovery (sharded job).
export async function recoveryDaysBySymbols(symbols: string[]): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("tickers")
    .select("symbol,avg_recovery_days")
    .in("symbol", symbols)
    .not("avg_recovery_days", "is", null);
  if (error || !data) return new Map();
  const map = new Map<string, number>();
  for (const r of data as { symbol: string; avg_recovery_days: number | null }[]) {
    if (r.avg_recovery_days != null) map.set(r.symbol, Number(r.avg_recovery_days));
  }
  return map;
}

// Average price recovery days after ex-dividend dates. For each of the last N
// ex-dates, count how many trading days the close price took to return to
// (or above) the pre-ex close. Returns null if we can't find enough data.
export async function avgRecoveryDays(symbol: string, lookbackEvents = 8): Promise<number | null> {
  const sb = getBackendClient();
  const [{ data: divs }, { data: prices }] = await Promise.all([
    sb
      .from("dividends")
      .select("date,dividend")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(lookbackEvents),
    sb
      .from("historical_prices_stocks")
      .select("date,close")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(2500), // ~10 years of trading days
  ]);
  if (!divs || !prices) return null;
  const priceRows = (prices as { date: string; close: number }[]).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  if (priceRows.length === 0) return null;

  const recoveries: number[] = [];
  for (const d of divs as { date: string; dividend: number }[]) {
    // Find the trading day index of (or just before) the ex-date
    const exIdx = priceRows.findIndex((p) => p.date >= d.date);
    if (exIdx <= 0) continue;
    const preClose = priceRows[exIdx - 1].close;
    // Walk forward looking for the first close >= preClose
    for (let i = exIdx; i < Math.min(priceRows.length, exIdx + 90); i++) {
      if (priceRows[i].close >= preClose) {
        recoveries.push(i - exIdx + 1);
        break;
      }
    }
  }
  if (recoveries.length === 0) return null;
  const avg = recoveries.reduce((a, b) => a + b, 0) / recoveries.length;
  return Math.round(avg * 10) / 10;
}

// Next dividend event per symbol — preferring the soonest future ex-date, but
// falling back to the most recent past event if no upcoming one exists. This
// keeps Frequency / Ex-Div / Payment columns populated for active payers that
// just don't have a forward-looking calendar entry yet (e.g. mid-cycle), while
// still showing the freshest data we have for each row.
export async function nextDividendBySymbols(symbols: string[]): Promise<Map<string, DividendEvent>> {
  if (symbols.length === 0) return new Map();
  const sb = getBackendClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1) Pull upcoming events first (cheap, small set).
  const { data: futureData } = await sb
    .from("dividends")
    .select(DIVIDEND_COLUMNS)
    .in("symbol", symbols)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(symbols.length * 4);

  const map = new Map<string, DividendEvent>();
  for (const row of (futureData as DividendEvent[]) ?? []) {
    if (!map.has(row.symbol)) map.set(row.symbol, row); // earliest future wins
  }

  // 2) For symbols still without an event, pull the most recent past one.
  const missing = symbols.filter((s) => !map.has(s));
  if (missing.length > 0) {
    const { data: pastData } = await sb
      .from("dividends")
      .select(DIVIDEND_COLUMNS)
      .in("symbol", missing)
      .lt("date", today)
      .order("date", { ascending: false })
      .limit(missing.length * 4);
    for (const row of (pastData as DividendEvent[]) ?? []) {
      if (!map.has(row.symbol)) map.set(row.symbol, row); // most recent past
    }
  }

  return map;
}

// Rank a list of stocks by their composite rating (premium-ish curation), then
// market cap as a fallback. Used for "Best X" picks pages to ensure we surface
// quality dividend payers, not just the largest names.
export async function rankByRating(rows: StockRow[]): Promise<StockRow[]> {
  if (rows.length === 0) return rows;
  const ratings = await getStockRatings(rows.map((r) => r.symbol));
  return [...rows].sort((a, b) => {
    const ra = ratings.get(a.symbol)?.composite_total ?? -1;
    const rb = ratings.get(b.symbol)?.composite_total ?? -1;
    if (rb !== ra) return rb - ra;
    return (b.market_cap ?? 0) - (a.market_cap ?? 0);
  });
}

export type RatingDimension = "value" | "growth" | "profit" | "momentum" | "health" | "composite";

// Rank by a specific rating dimension. Used for "Best Growth", "Best Protection"
// (= health), etc — so each pick page surfaces stocks that excel on the
// dimension that matches the theme.
// Ratings fetch for the model-portfolio ranking, cached (the picks pages rank
// ~500 symbols on every load via the uncached getStockRatings — that was the
// bulk of their latency). Keyed by the symbol list; revalidate 30 min.
const _rankRatingsEntries = unstable_cache(
  async (symbols: string[]): Promise<[string, StockRating][]> =>
    Array.from((await getStockRatings(symbols)).entries()),
  ["rank-ratings"],
  { revalidate: 1800 },
);

export async function rankByDimension(rows: StockRow[], dim: RatingDimension): Promise<StockRow[]> {
  if (rows.length === 0) return rows;
  const ratings = new Map(await _rankRatingsEntries(rows.map((r) => r.symbol)));
  const get = (sym: string): number => {
    const r = ratings.get(sym);
    if (!r) return -1;
    switch (dim) {
      case "value":
        return r.value_score ?? -1;
      case "growth":
        return r.growth_score ?? -1;
      case "profit":
        return r.profit_score ?? -1;
      case "momentum":
        return r.momentum_score ?? -1;
      case "health":
        return r.health_score ?? -1;
      case "composite":
      default:
        return r.composite_total ?? -1;
    }
  };
  return [...rows].sort((a, b) => {
    const ra = get(a.symbol);
    const rb = get(b.symbol);
    if (rb !== ra) return rb - ra;
    // tiebreaker: composite
    const ca = ratings.get(a.symbol)?.composite_total ?? -1;
    const cb = ratings.get(b.symbol)?.composite_total ?? -1;
    if (cb !== ca) return cb - ca;
    return (b.market_cap ?? 0) - (a.market_cap ?? 0);
  });
}

export type PayoutChangeKind = "increasing" | "decreasing" | "initiating" | "suspending" | "special";

// PayoutChangeEvent is defined in @/lib/types and re-exported above.

// Resolve company names for a batch of symbols (from backend.tickers).
async function symbolNames(symbols: string[]): Promise<Map<string, string>> {
  if (symbols.length === 0) return new Map();
  const sb = getBackendClient();
  const { data } = await sb.from("tickers").select("symbol,name").in("symbol", symbols);
  const map = new Map<string, string>();
  for (const r of (data as { symbol: string; name: string | null }[]) ?? []) {
    if (r.name) map.set(r.symbol, r.name);
  }
  return map;
}

// Resolve the FMP sector for a batch of symbols (from backend.tickers). Used by
// the news page to filter headlines to a chosen sector via each item's symbol.
export async function sectorBySymbols(symbols: string[]): Promise<Map<string, string>> {
  if (symbols.length === 0) return new Map();
  const sb = getBackendClient();
  const { data } = await sb.from("tickers").select("symbol,sector").in("symbol", symbols);
  const map = new Map<string, string>();
  for (const r of (data as { symbol: string; sector: string | null }[]) ?? []) {
    if (r.sector) map.set(r.symbol, r.sector);
  }
  return map;
}

// Returns dividend events matching a specific payout-change pattern, computed
// by walking each symbol's most recent dividend events and comparing.
export async function payoutChanges(kind: PayoutChangeKind, limit = 100): Promise<PayoutChangeEvent[]> {
  const sb = getBackendClient();
  // Look back ~2 years so we can compare against historical baselines
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 730);

  if (kind === "special") {
    // Special dividends are explicitly flagged by frequency
    const { data, error } = await sb
      .from("dividends")
      .select("symbol,date,payment_date,declaration_date,dividend,frequency")
      .ilike("frequency", "Special")
      .order("date", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const rows = data as Array<{
      symbol: string;
      date: string;
      payment_date: string | null;
      declaration_date: string | null;
      dividend: number;
      frequency: string | null;
    }>;
    const names = await symbolNames(rows.map((r) => r.symbol));
    return rows.map((d) => ({
      symbol: d.symbol,
      name: names.get(d.symbol) ?? null,
      date: d.date,
      payment_date: d.payment_date,
      declaration_date: d.declaration_date,
      dividend: Number(d.dividend),
      previousDividend: null,
      pctChange: null,
      frequency: d.frequency,
    }));
  }

  // For initiating/suspending we need a wider history
  const { data, error } = await sb
    .from("dividends")
    .select("symbol,date,payment_date,declaration_date,dividend,frequency")
    .gte("date", cutoff.toISOString().slice(0, 10))
    .order("date", { ascending: false })
    .limit(30000);
  if (error || !data) return [];

  type R = {
    symbol: string;
    date: string;
    payment_date: string | null;
    declaration_date: string | null;
    dividend: number;
    frequency: string | null;
  };
  const bySymbol = new Map<string, R[]>();
  for (const row of data as R[]) {
    const arr = bySymbol.get(row.symbol) ?? [];
    arr.push(row);
    bySymbol.set(row.symbol, arr);
  }

  const today = new Date();
  const events: PayoutChangeEvent[] = [];

  for (const [sym, raw] of bySymbol.entries()) {
    // Filter out specials so we compare like-for-like regular payments
    const regulars = raw.filter((r) => (r.frequency ?? "").toLowerCase() !== "special");
    if (regulars.length === 0) continue;
    const latest = regulars[0];
    const latestDate = new Date(latest.date);
    const previous = regulars[1];
    const a = Number(latest.dividend);

    if (kind === "increasing" && previous) {
      const b = Number(previous.dividend);
      if (a > 0 && b > 0 && a > b * 1.001) {
        events.push({
          symbol: sym,
          name: null,
          date: latest.date,
          payment_date: latest.payment_date,
          declaration_date: latest.declaration_date,
          dividend: a,
          previousDividend: b,
          pctChange: ((a - b) / b) * 100,
          frequency: latest.frequency,
        });
      }
    } else if (kind === "decreasing" && previous) {
      const b = Number(previous.dividend);
      if (a > 0 && b > 0 && a < b * 0.999) {
        events.push({
          symbol: sym,
          name: null,
          date: latest.date,
          payment_date: latest.payment_date,
          declaration_date: latest.declaration_date,
          dividend: a,
          previousDividend: b,
          pctChange: ((a - b) / b) * 100,
          frequency: latest.frequency,
        });
      }
    } else if (kind === "initiating") {
      if (regulars.length === 1 && a > 0) {
        const ageDays = (today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= 365) {
          events.push({
            symbol: sym,
            name: null,
            date: latest.date,
            payment_date: latest.payment_date,
            declaration_date: latest.declaration_date,
            dividend: a,
            previousDividend: null,
            pctChange: null,
            frequency: latest.frequency,
          });
        }
      }
    } else if (kind === "suspending" && previous) {
      const prevDate = new Date(previous.date);
      const intervalDays = (latestDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      const sinceLastDays = (today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
      const expected =
        latest.frequency === "Monthly"
          ? 30
          : latest.frequency === "Quarterly"
          ? 91
          : latest.frequency === "Semi-Annual"
          ? 183
          : latest.frequency === "Annual"
          ? 365
          : 120;
      if (a === 0 || sinceLastDays > expected * 1.5) {
        if (intervalDays > 0) {
          events.push({
            symbol: sym,
            name: null,
            date: latest.date,
            payment_date: latest.payment_date,
            declaration_date: latest.declaration_date,
            dividend: a,
            previousDividend: Number(previous.dividend),
            pctChange: null,
            frequency: latest.frequency,
          });
        }
      }
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date));
  const top = events.slice(0, limit);
  const names = await symbolNames(top.map((e) => e.symbol));
  for (const e of top) {
    e.name = names.get(e.symbol) ?? null;
  }
  return top;
}

// ============================================================
// Dividend data from backend.dividends
// ============================================================

const DIVIDEND_COLUMNS = "symbol,date,record_date,payment_date,declaration_date,adj_dividend,dividend,yield,frequency";

export async function dividendHistoryBySymbol(symbol: string, limit = 60): Promise<DividendEvent[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("dividends")
    .select(DIVIDEND_COLUMNS)
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data.dividendHistoryBySymbol]", error);
    return [];
  }
  return (data as DividendEvent[]) ?? [];
}

export async function dividendCalendar(from: string, to: string, limit = 2000): Promise<DividendEvent[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("dividends")
    .select(DIVIDEND_COLUMNS)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[data.dividendCalendar]", error);
    return [];
  }
  return (data as DividendEvent[]) ?? [];
}

export async function declarationCalendar(from: string, to: string, limit = 2000): Promise<DividendEvent[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("dividends")
    .select(DIVIDEND_COLUMNS)
    .gte("declaration_date", from)
    .lte("declaration_date", to)
    .order("declaration_date", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data.declarationCalendar]", error);
    return [];
  }
  return (data as DividendEvent[]) ?? [];
}

// ============================================================
// Growers — these tables live in `public` schema
// ============================================================

export type GrowerSlug =
  | "aristocrats"
  | "kings"
  | "champions"
  | "achievers"
  | "contenders"
  | "challengers";

// Dividend Growers are now derived dynamically from the actual dividend
// history (backend.dividend_streaks, refreshed nightly). The legacy static
// tables (public.dividend_kings/_aristocrats/_achievers/_contenders/
// _challengers) were unreliable — kings all showed "2 yrs", achievers and
// contenders had identical membership, champions had no table.
//
// Slug criteria (matches backend.dividend_growers_by_slug):
//   kings        streak_years >= 50
//   aristocrats  streak_years >= 25
//   champions    streak_years >= 25
//   achievers    streak_years >= 10
//   contenders   streak_years between 10 and 24
//   challengers  streak_years between 5 and 9
export async function listGrowers(slug: GrowerSlug): Promise<{ symbol: string }[]> {
  const sb = getBackendClient();
  const { data, error } = await sb.rpc("dividend_growers_by_slug", { slug });
  if (error) {
    console.error("[data.listGrowers]", error);
    return [];
  }
  return (data as { symbol: string }[]) ?? [];
}

// Same shape as the previous grower-table read, but consults
// backend.dividend_streaks for the consecutive_increases values. Used by
// getStockExtras to override the broken values from the static tables.
async function fetchStreakRows(
  symbols: string[],
): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("dividend_streaks")
    .select("symbol,streak_years")
    .in("symbol", symbols);
  if (error || !data) return new Map();
  const m = new Map<string, number>();
  for (const r of data as { symbol: string; streak_years: number }[]) {
    m.set(r.symbol, r.streak_years);
  }
  return m;
}

export async function listGrowersWithStocks(slug: GrowerSlug): Promise<StockRow[]> {
  const growers = await listGrowers(slug);
  if (growers.length === 0) return [];
  const symbols = growers.map((g) => g.symbol);
  const stocks = await listStocks({ symbols, limit: 500, excludeEtfs: false });
  // Preserve grower-list ordering (by consecutive_increases desc)
  const order = new Map(symbols.map((s, i) => [s, i]));
  return [...stocks].sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));
}

// ============================================================
// ETFs (live in public.etfs, separate from backend.tickers)
// ============================================================

type EtfRow = {
  ticker: string;
  symbol: string | null;
  longname: string | null;
  shortname: string | null;
  regularmarketprice: number | null;
  regularmarketchangepercent: number | null;
  regularmarketchange: number | null;
  totalassets: number | null;
  netassets: number | null;
  dividendyield: number | null;
  yield: number | null;
  category: string | null;
  fundfamily: string | null;
  fullexchangename: string | null;
  netexpenseratio: number | null;
  ytdreturn: number | null;
  fiftytwoweekrange: string | null;
  quotetype?: string | null;
  legaltype?: string | null;
};

// List ETFs from the public.etfs table. When sector / category is provided we
// filter to ETFs whose `category` mentions that theme. Used by listing pages
// that want to switch security type (Stocks ↔ ETFs / Active ETFs / Funds)
// while keeping their existing page context.
// List distinct industries within a sector — used to render contextual industry
// chips on the sector pages.
export async function industriesInSector(sectorName: string): Promise<{ industry: string; count: number }[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("tickers")
    .select("industry")
    .eq("sector", sectorName)
    .eq("is_actively_trading", true)
    .eq("country", "US")
    .gt("last_div", 0)
    .not("industry", "is", null)
    .limit(5000);
  if (error || !data) return [];
  const counts = new Map<string, number>();
  for (const r of data as { industry: string | null }[]) {
    if (!r.industry) continue;
    counts.set(r.industry, (counts.get(r.industry) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count);
}

// List ETFs from backend.tickers (where is_etf=true). The daily refresh-fmp-data
// edge function keeps this populated with up-to-date prices, changes, mkt cap.
// `categoryContains` is a fuzzy filter against the ETF name (e.g. "Energy",
// "Dividend"). `fund` toggles between ETFs and mutual funds.
export type EtfListOptions = {
  active?: boolean;
  fund?: boolean;
  categoryContains?: string;
  minMarketCap?: number;
  offset?: number;
  limit?: number;
};

function applyEtfFilters<T>(q: T, opts: EtfListOptions): T {
  // PostgREST query builders chain identically across `select` / `head:true`,
  // so we share the predicate body. The cast lets us return whatever shape was
  // passed in without leaking the postgrest internals into the public API.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qb = q as any;
  qb = qb.eq("is_actively_trading", true).gt("price", 0);
  if (opts.fund === true) qb = qb.eq("is_fund", true);
  else if (opts.fund === false) qb = qb.eq("is_etf", true);
  else qb = qb.or("is_etf.eq.true,is_fund.eq.true");
  if (opts.active) {
    qb = qb.or(
      "name.ilike.%Active%,name.ilike.%JPMorgan%,name.ilike.%Capital Group%,name.ilike.%Dimensional%"
    );
  }
  if (opts.categoryContains) {
    qb = qb.ilike("name", `%${opts.categoryContains}%`);
  }
  if (opts.minMarketCap) {
    qb = qb.gte("mkt_cap", opts.minMarketCap);
  }
  return qb;
}

export async function listEtfsByCategory(opts: EtfListOptions): Promise<StockRow[]> {
  const sb = getBackendClient();
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 200;
  let q = sb.from("tickers").select(TICKER_COLUMNS);
  q = applyEtfFilters(q, opts);
  q = q.order("mkt_cap", { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) {
    console.error("[data.listEtfsByCategory]", error);
    return [];
  }
  const rows = (data as TickerRow[] | null)?.map(toStockRow) ?? [];
  // `tickers.last_div` is NULL for most major US ETFs (SCHD, VYM, VTI, etc.)
  // so the yield computed in toStockRow comes back null and the list shows
  // empty yield columns. Backfill with TTM (trailing 12 months) sum of
  // distributions from the dividends table.
  await enrichEtfYieldsFromDividends(rows);
  return rows;
}

// In-place yield enrichment from the dividends table. Used for any list of
// ETFs where last_div on the tickers row is NULL. Single round-trip even
// for ~200 rows.
async function enrichEtfYieldsFromDividends(rows: StockRow[]): Promise<void> {
  const missing = rows
    .filter((r) => r.dividend_yield == null && r.price != null && r.price > 0)
    .map((r) => r.symbol);
  if (missing.length === 0) return;
  const sb = getBackendClient();
  const cutoff = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);
  // Use adj_dividend (split-adjusted) when summing TTM. The raw `dividend`
  // column stores pre-split per-share amounts, so for any ticker that's
  // had a stock split (e.g. HDV had a 5:1 split — raw dividend $0.84 but
  // post-split per-share is $0.17), summing raw `dividend` blows the
  // yield up by the split ratio. adj_dividend always matches the current
  // share basis that pairs with the current price.
  const { data } = await sb
    .from("dividends")
    .select("symbol,adj_dividend,dividend")
    .in("symbol", missing)
    .gte("date", cutoff)
    .gt("dividend", 0)
    .limit(missing.length * 15);
  const ttm = new Map<string, number>();
  for (const r of (data as { symbol: string; adj_dividend: number | null; dividend: number }[] | null) ?? []) {
    // Prefer adj_dividend; fall back to dividend only if adj is null
    // (some old rows have NULL adj_dividend; for those the raw is the
    // best we've got).
    const val = r.adj_dividend != null ? Number(r.adj_dividend) : Number(r.dividend);
    if (!isFinite(val) || val <= 0) continue;
    ttm.set(r.symbol, (ttm.get(r.symbol) ?? 0) + val);
  }
  for (const r of rows) {
    if (r.dividend_yield != null) continue;
    if (r.price == null || r.price <= 0) continue;
    const d = ttm.get(r.symbol);
    if (d != null && d > 0) {
      r.dividend_yield = (d / r.price) * 100;
      r.annual_dividend = d;
    }
  }
}

export async function countEtfsByCategory(opts: EtfListOptions): Promise<number> {
  const sb = getBackendClient();
  let q = sb.from("tickers").select("symbol", { count: "exact", head: true });
  q = applyEtfFilters(q, opts);
  const { count, error } = await q;
  if (error) {
    console.error("[data.countEtfsByCategory]", error);
    return 0;
  }
  return count ?? 0;
}

function mapEtfRow(e: EtfRow): StockRow {
  const yld =
    e.dividendyield != null
      ? e.dividendyield > 1
        ? e.dividendyield
        : e.dividendyield * 100
      : e.yield != null
      ? e.yield > 1
        ? e.yield
        : e.yield * 100
      : null;
  const price = e.regularmarketprice;
  const annual = yld != null && price ? (yld / 100) * price : null;
  return {
    symbol: e.ticker,
    name: e.longname ?? e.shortname ?? null,
    price,
    change: e.regularmarketchange,
    change_percent: e.regularmarketchangepercent,
    market_cap: e.totalassets ?? e.netassets,
    pe_ratio: null,
    beta: null,
    volume: null,
    avg_volume: null,
    industry: e.category,
    sector: "ETF",
    country: null,
    exchange: e.fullexchangename,
    currency: "USD",
    annual_dividend: annual,
    dividend_yield: yld,
    range: e.fiftytwoweekrange,
    description: null,
    ceo: null,
    website: null,
    image: null,
    full_time_employees: null,
    ipo_date: null,
    is_etf: true,
    is_fund: false,
    isin: null,
    city: null,
    state: null,
    zip: null,
  };
}

export async function listEtfs(tickers: string[]): Promise<StockRow[]> {
  if (tickers.length === 0) return [];
  const sb = getAdminClient("public");
  const { data, error } = await sb
    .from("etfs")
    .select(
      "ticker,symbol,longname,shortname,regularmarketprice,regularmarketchangepercent,regularmarketchange,totalassets,netassets,dividendyield,yield,category,fundfamily,fullexchangename,netexpenseratio,ytdreturn,fiftytwoweekrange"
    )
    .in("ticker", tickers);
  if (error) {
    console.error("[data.listEtfs]", error);
    return [];
  }
  return ((data as EtfRow[] | null) ?? []).map((e) => {
    const yld =
      e.dividendyield != null
        ? e.dividendyield > 1
          ? e.dividendyield
          : e.dividendyield * 100
        : e.yield != null
        ? e.yield > 1
          ? e.yield
          : e.yield * 100
        : null;
    const price = e.regularmarketprice;
    const annual = yld != null && price ? (yld / 100) * price : null;
    return {
      symbol: e.ticker,
      name: e.longname ?? e.shortname ?? null,
      price,
      change: e.regularmarketchange,
      change_percent: e.regularmarketchangepercent,
      market_cap: e.totalassets ?? e.netassets,
      pe_ratio: null,
      beta: null,
      volume: null,
      avg_volume: null,
      industry: e.category,
      sector: "ETF",
      country: null,
      exchange: e.fullexchangename,
      currency: "USD",
      annual_dividend: annual,
      dividend_yield: yld,
      range: e.fiftytwoweekrange,
      description: null,
      ceo: null,
      website: null,
      image: null,
      full_time_employees: null,
      ipo_date: null,
      is_etf: true,
      is_fund: false,
      isin: null,
      city: null,
      state: null,
      zip: null,
    };
  });
}

// ============================================================
// News from backend.company_news
// ============================================================

const NEWS_COLUMNS = "id,symbol,published_date,publisher,title,image,site,text,url";

export async function latestNews(limit = 50): Promise<NewsRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("company_news")
    .select(NEWS_COLUMNS)
    .order("published_date", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data.latestNews]", error);
    return [];
  }
  return (data as NewsRow[]) ?? [];
}

// Recent dividend INCREASES: regular payers whose newest declared dividend is
// higher than the one before. Powers the /dividend-increases service page
// ("recent dividend increases" / "dividend increases this week" keywords).
export type DividendIncrease = {
  symbol: string;
  name: string | null;
  sector: string | null;
  prevAmount: number;
  amount: number;
  pctIncrease: number;
  exDate: string;
  paymentDate: string | null;
  price: number | null;
  grade: string | null;
};

export async function recentDividendIncreases(days = 30, max = 40): Promise<DividendIncrease[]> {
  const sb = getBackendClient();
  const since = new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10);
  const until = new Date(Date.now() + 75 * 86400e3).toISOString().slice(0, 10);
  const { data: rows, error } = await sb
    .from("dividends")
    .select("symbol,date,declaration_date,payment_date,adj_dividend,dividend")
    .gte("date", since)
    .lte("date", until)
    .order("date", { ascending: false })
    .limit(5000);
  if (error || !rows?.length) return [];

  // Latest dividend per symbol within the window.
  type DivRow = { symbol: string; date: string; declaration_date: string | null; payment_date: string | null; adj_dividend: number | null; dividend: number | null };
  const latest = new Map<string, DivRow>();
  for (const r of rows as DivRow[]) if (!latest.has(r.symbol)) latest.set(r.symbol, r);
  const syms = [...latest.keys()].filter((s) => /^[A-Z]{1,5}$/.test(s)).slice(0, 600);
  if (!syms.length) return [];

  // Previous dividend per symbol (the payment before the latest one).
  const { data: hist } = await sb
    .from("dividends")
    .select("symbol,date,adj_dividend,dividend")
    .in("symbol", syms)
    .order("date", { ascending: false })
    .limit(syms.length * 6);
  const prevBy = new Map<string, number>();
  for (const h of (hist ?? []) as { symbol: string; date: string; adj_dividend: number | null; dividend: number | null }[]) {
    const cur = latest.get(h.symbol);
    if (!cur || prevBy.has(h.symbol) || h.date >= cur.date) continue;
    const amt = h.adj_dividend ?? h.dividend;
    if (amt != null && amt > 0) prevBy.set(h.symbol, amt);
  }

  // Liquid US-listed common stock only; raise between +2% and +100% (filters
  // variable shippers' noise and special-dividend doublings).
  const meta = await listStocks({ symbols: syms, limit: syms.length }).catch(() => []);
  const out: DividendIncrease[] = [];
  for (const m of meta) {
    const cur = latest.get(m.symbol);
    const prev = prevBy.get(m.symbol);
    if (!cur || !prev) continue;
    const amt = cur.adj_dividend ?? cur.dividend;
    if (amt == null || amt <= prev * 1.02 || amt >= prev * 2) continue;
    if (m.currency !== "USD" || m.is_etf || m.is_fund) continue;
    if ((m.market_cap ?? 0) < 1e9 || ((m.volume ?? 0) as number) * (m.price ?? 0) < 2e6) continue;
    out.push({
      symbol: m.symbol,
      name: m.name ?? null,
      sector: m.sector ?? null,
      prevAmount: prev,
      amount: amt,
      pctIncrease: +((amt / prev - 1) * 100).toFixed(1),
      exDate: cur.date,
      paymentDate: cur.payment_date,
      price: m.price ?? null,
      grade: null,
    });
  }
  out.sort((a, b) => b.pctIncrease - a.pctIncrease);
  const top = out.slice(0, max);
  const ratings = await getStockRatings(top.map((t) => t.symbol)).catch(() => new Map());
  for (const t of top) t.grade = ratings.get(t.symbol)?.composite_grade ?? null;
  return top;
}

// Ratings snapshot AS OF a given computed_date — powers the live walk-forward
// validation of the generator (top-rated names on a past date, no lookahead).
export async function topRatedAsOf(
  computedDate: string,
  limit = 120,
): Promise<{ symbol: string; composite_total: number | null; composite_grade: string | null }[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("stock_ratings_daily")
    .select("symbol,composite_total,composite_grade")
    .eq("computed_date", computedDate)
    .in("composite_grade", ["A+", "A", "A-"])
    .order("composite_total", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data.topRatedAsOf]", error);
    return [];
  }
  return (data as { symbol: string; composite_total: number | null; composite_grade: string | null }[]) ?? [];
}

export async function newsForSymbol(symbol: string, limit = 12): Promise<NewsRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("company_news")
    .select(NEWS_COLUMNS)
    .eq("symbol", symbol)
    .order("published_date", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data.newsForSymbol]", error);
    return [];
  }
  return (data as NewsRow[]) ?? [];
}

// ============================================================
// Historical prices + financials
// ============================================================

export async function historicalPrices(symbol: string, days = 365 * 5): Promise<HistoricalPriceRow[]> {
  const sb = getBackendClient();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromIso = fromDate.toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("historical_prices_stocks")
    .select("symbol,date,open,high,low,close,volume,dividends,change_percent")
    .eq("symbol", symbol)
    .gte("date", fromIso)
    .order("date", { ascending: true })
    .limit(5000);
  if (error) {
    console.error("[data.historicalPrices]", error);
    return [];
  }
  return (data as HistoricalPriceRow[]) ?? [];
}

export async function incomeStatementAnnual(symbol: string, years = 6): Promise<IncomeStatementRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("income_statement_annual")
    .select("symbol,fiscal_year,period,date,revenue,gross_profit,operating_income,ebitda,net_income,eps,eps_diluted,reported_currency")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(years);
  if (error) {
    console.error("[data.incomeStatementAnnual]", error);
    return [];
  }
  return (data as IncomeStatementRow[]) ?? [];
}

export async function incomeStatementQuarterly(symbol: string, quarters = 8): Promise<IncomeStatementRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("income_statement_quarterly")
    .select("symbol,fiscal_year,period,date,revenue,gross_profit,operating_income,ebitda,net_income,eps,eps_diluted,reported_currency")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(quarters);
  if (error) {
    console.error("[data.incomeStatementQuarterly]", error);
    return [];
  }
  return (data as IncomeStatementRow[]) ?? [];
}

export async function balanceSheetQuarterly(symbol: string, quarters = 8): Promise<BalanceSheetRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("balance_sheet_quarterly")
    .select(
      "symbol,fiscal_year,period,date,total_debt,short_term_debt,long_term_debt,net_debt,cash_and_cash_equivalents,cash_and_short_term_investments,total_assets,total_liabilities,total_current_assets,total_current_liabilities,total_stockholders_equity,reported_currency"
    )
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(quarters);
  if (error) {
    console.error("[data.balanceSheetQuarterly]", error.message ?? error.code ?? JSON.stringify(error));
    return [];
  }
  return (data as BalanceSheetRow[]) ?? [];
}

export async function cashFlowQuarterly(symbol: string, quarters = 8): Promise<CashFlowRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("cash_flow_quarterly")
    .select(
      "symbol,fiscal_year,period,date,free_cash_flow,operating_cash_flow,capital_expenditure,common_dividends_paid,net_dividends_paid,net_cash_provided_by_operating_activities,net_cash_provided_by_investing_activities,net_cash_provided_by_financing_activities,reported_currency"
    )
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(quarters);
  if (error) {
    console.error("[data.cashFlowQuarterly]", error);
    return [];
  }
  return (data as CashFlowRow[]) ?? [];
}

export async function balanceSheetAnnual(symbol: string, years = 6): Promise<BalanceSheetRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("balance_sheet_annual")
    .select(
      "symbol,fiscal_year,period,date,total_debt,short_term_debt,long_term_debt,net_debt,cash_and_cash_equivalents,cash_and_short_term_investments,total_assets,total_liabilities,total_current_assets,total_current_liabilities,total_stockholders_equity,reported_currency"
    )
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(years);
  if (error) {
    console.error("[data.balanceSheetAnnual]", error);
    return [];
  }
  return (data as BalanceSheetRow[]) ?? [];
}

export async function cashFlowAnnual(symbol: string, years = 6): Promise<CashFlowRow[]> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("cash_flow_annual")
    .select(
      "symbol,fiscal_year,period,date,free_cash_flow,operating_cash_flow,capital_expenditure,common_dividends_paid,net_dividends_paid,net_cash_provided_by_operating_activities,net_cash_provided_by_investing_activities,net_cash_provided_by_financing_activities,reported_currency"
    )
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(years);
  if (error) {
    console.error("[data.cashFlowAnnual]", error);
    return [];
  }
  return (data as CashFlowRow[]) ?? [];
}

export async function ratiosLatest(symbol: string): Promise<RatiosRow | null> {
  const sb = getBackendClient();
  const { data, error } = await sb
    .from("ratios_annual")
    .select(
      "symbol,fiscal_year,date,price_to_earnings_ratio,price_to_book_ratio,dividend_payout_ratio,dividend_yield_percentage,dividend_per_share,debt_to_equity_ratio,gross_profit_margin,net_profit_margin"
    )
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[data.ratiosLatest]", error.message ?? error);
    return null;
  }
  return ((data as RatiosRow[] | null)?.[0]) ?? null;
}

// ============================================================
// Search
// ============================================================

export async function searchStocks(query: string, limit = 20): Promise<StockRow[]> {
  if (!query.trim()) return [];
  const sb = getBackendClient();
  const upper = query.trim().toUpperCase();
  const trimmed = query.trim();
  const { data, error } = await sb
    .from("tickers")
    .select(TICKER_COLUMNS)
    .or(`symbol.ilike.${upper}%,name.ilike.%${trimmed}%`)
    .eq("is_actively_trading", true)
    .not("mkt_cap", "is", null)
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error("[data.searchStocks]", error.message ?? error);
    return [];
  }
  return (data as TickerRow[] | null)?.map(toStockRow) ?? [];
}

// Search for "any holdable asset" — extends searchStocks so the /etfs/holders
// flow can find names that exist only in ETF holdings (pre-IPO companies, JV
// holdings, private placements like SPACEX). Returns a lightweight shape
// because we only need symbol + name + a tag for the typeahead.
export type HoldableSearchResult = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
  source: "ticker" | "etf_holding";
};

export async function searchHoldableAssets(query: string, limit = 12): Promise<HoldableSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const sb = getBackendClient();
  const upper = trimmed.toUpperCase();

  // Step 1: regular ticker search (fastest, covers 90% of cases).
  const [tickerRes, holdingRes] = await Promise.all([
    sb
      .from("tickers")
      .select("symbol,name,exchange_short,sector,is_etf,is_fund,mkt_cap")
      .or(`symbol.ilike.${upper}%,name.ilike.%${trimmed}%`)
      .eq("is_actively_trading", true)
      .order("mkt_cap", { ascending: false, nullsFirst: false })
      .limit(limit),
    // Step 2: ETF holdings for asset names that don't exist in tickers
    // (private companies, pre-IPO names). Cap at limit*2 since we'll dedupe.
    sb
      .from("etf_holdings")
      .select("asset,name")
      .or(`asset.ilike.${upper}%,name.ilike.%${trimmed}%`)
      .limit(limit * 2),
  ]);

  const out: HoldableSearchResult[] = [];
  const seen = new Set<string>();

  for (const r of (tickerRes.data as { symbol: string; name: string | null; exchange_short: string | null; sector: string | null; is_etf: boolean | null; is_fund: boolean | null }[]) ?? []) {
    if (seen.has(r.symbol)) continue;
    seen.add(r.symbol);
    out.push({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange_short,
      sector: r.sector,
      is_etf: r.is_etf,
      is_fund: r.is_fund,
      source: "ticker",
    });
  }

  // Aggregate ETF-only assets by (asset, name) so duplicates from many ETFs
  // collapse into a single suggestion. We don't add tickers we already have.
  const etfOnly = new Map<string, { name: string | null; count: number }>();
  for (const r of (holdingRes.data as { asset: string; name: string | null }[]) ?? []) {
    const a = (r.asset ?? "").trim();
    // Skip holding identifiers that can't make a working /etfs/holders/{asset}
    // link: blank/whitespace-only, no alphanumeric char (e.g. the literal " "),
    // or containing a space (Next won't route "SPACEX SPV"/"711339Z US" — the
    // path 404s before the page runs even though the data exists). Clean IDs
    // like "SPACEXSPV" still resolve.
    if (!a || !/[a-z0-9]/i.test(a) || /\s/.test(a) || seen.has(a.toUpperCase())) continue;
    const key = a.toUpperCase();
    const cur = etfOnly.get(key) ?? { name: r.name, count: 0 };
    cur.count += 1;
    // Prefer a non-null name across collisions.
    if (!cur.name && r.name) cur.name = r.name;
    etfOnly.set(key, cur);
  }
  for (const [asset, v] of Array.from(etfOnly.entries()).sort((a, b) => b[1].count - a[1].count)) {
    if (out.length >= limit) break;
    out.push({
      symbol: asset,
      name: v.name,
      exchange: null,
      sector: null,
      is_etf: null,
      is_fund: null,
      source: "etf_holding",
    });
  }

  return out.slice(0, limit);
}

// ============================================================
// Watchlists — these live in `public` schema (user data)
// ============================================================

export async function getOrCreateDefaultWatchlist(userId: string): Promise<string | null> {
  const sb = getAdminClient("public");
  const { data: existing } = await sb
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing && (existing as { id: string }).id) return (existing as { id: string }).id;

  const { data: created, error } = await sb
    .from("watchlists")
    .insert({ user_id: userId, name: "My Watchlist" })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[data.getOrCreateDefaultWatchlist]", error);
    return null;
  }
  return (created as { id: string }).id;
}

export async function listWatchlistSymbols(userId: string): Promise<Set<string>> {
  const sb = getAdminClient("public");
  const { data: lists } = await sb.from("watchlists").select("id").eq("user_id", userId);
  if (!lists || lists.length === 0) return new Set();
  const ids = (lists as { id: string }[]).map((l) => l.id);
  const { data: items } = await sb
    .from("watchlist_items")
    .select("asset_symbol")
    .in("watchlist_id", ids);
  return new Set(((items as { asset_symbol: string }[]) ?? []).map((i) => i.asset_symbol));
}

export async function addToWatchlist(userId: string, symbol: string): Promise<boolean> {
  const sb = getAdminClient("public");
  const wlId = await getOrCreateDefaultWatchlist(userId);
  if (!wlId) return false;
  const { error } = await sb.from("watchlist_items").insert({
    watchlist_id: wlId,
    asset_symbol: symbol,
    asset_type: "stock",
  });
  return !error;
}

export async function removeFromWatchlist(userId: string, symbol: string): Promise<boolean> {
  const sb = getAdminClient("public");
  const { data: lists } = await sb.from("watchlists").select("id").eq("user_id", userId);
  if (!lists || lists.length === 0) return false;
  const ids = (lists as { id: string }[]).map((l) => l.id);
  const { error } = await sb
    .from("watchlist_items")
    .delete()
    .in("watchlist_id", ids)
    .eq("asset_symbol", symbol);
  return !error;
}

// ============================================================
// FX rates — convert local-currency values to a chosen display currency.
// Rates come from public.exchange_rates (tickers like EURUSD=X meaning 1 EUR
// in USD). We pull the latest rate per pair, then derive cross-rates via USD.
// ============================================================

// Read the user's chosen display currency from the cookie. Server-only.
export async function getDisplayCurrency(): Promise<string> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const v = jar.get("displayCurrency")?.value;
  return v || "native";
}

// The 5,000-row exchange_rates pull was running on EVERY render whenever a
// display currency (non-native) was selected — that was the dominant slowdown
// users saw when navigating/switching tabs with currency on (native skips this
// entirely). Cache the result (FX updates at most a few times a day via the
// update-forex-rates cron). Maps aren't JSON-serializable for unstable_cache,
// so the cached layer returns entries and we rebuild the Map.
const fxRatesEntriesCached = unstable_cache(
  async (): Promise<[string, number][]> => {
    const sb = getAdminClient("public");
    const { data, error } = await sb
      .from("exchange_rates")
      .select("ticker,close,date")
      .ilike("ticker", "%USD=X")
      .order("date", { ascending: false })
      .limit(5000);
    if (error || !data) return [["USD", 1]];
    const map = new Map<string, number>([["USD", 1]]);
    for (const r of data as { ticker: string; close: number }[]) {
      const m = r.ticker.match(/^([A-Z]{3})USD=X$/);
      if (!m) continue;
      const ccy = m[1];
      if (!map.has(ccy)) map.set(ccy, Number(r.close));
    }
    return Array.from(map.entries());
  },
  ["fx-rates-to-usd"],
  { revalidate: 3600 },
);

export async function fxRatesToUSD(): Promise<Map<string, number>> {
  return new Map(await fxRatesEntriesCached());
}

// Convert a value in `fromCurrency` to `targetCurrency`.
// Pass undefined targetCurrency to keep native (no conversion).
export function convertCurrency(
  value: number | null | undefined,
  fromCurrency: string | null | undefined,
  targetCurrency: string | undefined,
  ratesToUSD: Map<string, number>
): { value: number | null; currency: string | null } {
  if (value == null || !isFinite(value)) return { value: null, currency: fromCurrency ?? null };
  const from = (fromCurrency ?? "USD").toUpperCase();
  if (!targetCurrency || targetCurrency === "native") {
    return { value, currency: from };
  }
  const target = targetCurrency.toUpperCase();
  if (from === target) return { value, currency: from };
  const fromToUsd = ratesToUSD.get(from);
  const targetToUsd = ratesToUSD.get(target);
  if (!fromToUsd || !targetToUsd) {
    return { value, currency: from }; // missing rate, fall back to native
  }
  const usd = value * fromToUsd;
  const converted = usd / targetToUsd;
  return { value: converted, currency: target };
}

// Apply a display-currency conversion to an array of StockRows. When the
// display currency is "native" (or null/undefined), rows pass through
// unchanged. Otherwise price / annual_dividend / market_cap are converted
// and the row's `currency` is set to the display currency for formatting.
export async function applyDisplayCurrency(rows: StockRow[], display: string | undefined): Promise<StockRow[]> {
  if (!display || display === "native" || rows.length === 0) return rows;
  const rates = await fxRatesToUSD();
  return rows.map((r) => {
    const conv = (v: number | null) =>
      v == null ? null : convertCurrency(v, r.currency, display, rates).value;
    return {
      ...r,
      price: conv(r.price),
      annual_dividend: conv(r.annual_dividend),
      market_cap: conv(r.market_cap),
      change: conv(r.change),
      currency: display,
    };
  });
}

// Formatting helpers + isoToday/isoDaysFromNow are now in @/lib/format and re-exported at the top.

export function yieldFromStock(stock: StockRow): number | null {
  return stock.dividend_yield;
}

// ============================================================
// A–Z directory (internal-linking hubs)
//
// The Ahrefs audit flagged ~9.7k indexable ticker pages as orphans — they
// were reachable only from the sitemap, with zero incoming internal links.
// These two helpers back the /stocks and /etfs browse pages, which list every
// indexable ticker alphabetically so each detail page gets a real crawlable
// inlink. Kept deliberately lean (no yield enrichment) since these pages link
// thousands of rows.
// ============================================================

export type DirectoryRow = { symbol: string; name: string | null };

// Same market-cap floor the sitemap uses, so the directory and sitemap cover
// exactly the same set of pages (no orphans, no dead directory links).
const DIRECTORY_MIN_MKT_CAP = 100_000_000;

// Build the symbol-prefix filter for a bucket. "A".."Z" → starts with that
// letter; "0" → starts with any digit (covers numeric foreign tickers like
// 603259.SS that would otherwise have no home in an A–Z index).
function applyDirectoryBucket<T>(q: T, bucket: string): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = q as any;
  if (bucket === "0") {
    return query.or(
      "symbol.like.0%,symbol.like.1%,symbol.like.2%,symbol.like.3%,symbol.like.4%,symbol.like.5%,symbol.like.6%,symbol.like.7%,symbol.like.8%,symbol.like.9%",
    );
  }
  return query.ilike("symbol", `${bucket}%`);
}

function applyDirectoryKind<T>(q: T, kind: "stocks" | "etfs"): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = q as any;
  if (kind === "etfs") {
    return query.or("is_etf.eq.true,is_fund.eq.true");
  }
  return query.eq("is_etf", false).eq("is_fund", false);
}

export async function listDirectory(opts: {
  kind: "stocks" | "etfs";
  bucket: string;
  offset: number;
  limit: number;
}): Promise<DirectoryRow[]> {
  const sb = getBackendClient();
  let q = sb
    .from("tickers")
    .select("symbol,name")
    .eq("is_actively_trading", true)
    .gte("mkt_cap", DIRECTORY_MIN_MKT_CAP);
  q = applyDirectoryKind(q, opts.kind);
  q = applyDirectoryBucket(q, opts.bucket);
  q = q.order("symbol", { ascending: true }).range(opts.offset, opts.offset + opts.limit - 1);
  const { data, error } = await q;
  if (error) {
    console.error("[data.listDirectory]", error);
    return [];
  }
  return (data as DirectoryRow[] | null) ?? [];
}

export async function countDirectory(opts: {
  kind: "stocks" | "etfs";
  bucket: string;
}): Promise<number> {
  const sb = getBackendClient();
  let q = sb
    .from("tickers")
    .select("symbol", { count: "exact", head: true })
    .eq("is_actively_trading", true)
    .gte("mkt_cap", DIRECTORY_MIN_MKT_CAP);
  q = applyDirectoryKind(q, opts.kind);
  q = applyDirectoryBucket(q, opts.bucket);
  const { count, error } = await q;
  if (error) {
    console.error("[data.countDirectory]", error);
    return 0;
  }
  return count ?? 0;
}

// Monthly-dividend-paying stocks (used by /monthly and the localized monthly
// service pages). Monthly payers are mostly US REITs/BDCs/funds, so this is
// not country-filtered — it returns the global set, largest first.
export async function listMonthlyPayers(limit = 40): Promise<StockRow[]> {
  const sb = getBackendClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  const { data } = await sb
    .from("dividends")
    .select("symbol")
    .ilike("frequency", "Monthly")
    .gte("date", cutoff.toISOString().slice(0, 10))
    .limit(5000);
  const symbols = Array.from(new Set(((data as { symbol: string }[]) ?? []).map((r) => r.symbol)));
  if (symbols.length === 0) return [];
  const rows = await listStocks({ symbols, minMarketCap: 100_000_000, limit: 2000, excludeEtfs: false });
  return rows
    .filter((r) => !r.is_etf && !r.is_fund)
    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
    .slice(0, limit);
}

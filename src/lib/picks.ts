import {
  rankByDimension,
  SECTOR_SLUG_MAP,
  type StockRow,
  type ScreenerOptions,
  type RatingDimension,
} from "@/lib/data";
import {
  cachedListStocks as listStocks,
  cachedListEtfsByCategory as listEtfsByCategory,
  cachedStaggeredQuarterlyPortfolio as staggeredQuarterlyPortfolio,
} from "@/lib/cached-data";
import { getBackendClient, getAdminClient } from "@/lib/supabase/admin";

// This month's pinned top pick. The Postgres function lazy-pins the top-rated
// US large-cap dividend stock for the current month (first caller computes &
// stores it; everyone after reads the same row), so the featured pick is stable
// all month. Identity stays gated on the page — we only surface sector + grade.
export type MonthlyPick = { symbol: string; name: string; sector: string; grade: string; total: number };
export async function getMonthlyTopPick(): Promise<MonthlyPick | null> {
  try {
    const sb = getAdminClient("public");
    const { data, error } = await sb.rpc("get_monthly_top_pick");
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return null;
    return { symbol: row.symbol, name: row.name, sector: row.sector || "", grade: row.grade || "", total: row.total ?? 0 };
  } catch {
    return null;
  }
}

// Model-portfolio / best-of list definitions + row builders. Centralised here
// so BOTH the (identity-gated) pages and the /api/picks/premium rows-reveal
// endpoint compute the exact same rows. The pages render the scrubbed free
// version with no server auth read; paying users fetch the real rows from the
// endpoint client-side (see DividendTable revealRowsEndpoint).

export type Pick = {
  label: string;
  description: string;
  premium: boolean;
  build: (rows: StockRow[]) => StockRow[];
  fetchOpts: ScreenerOptions;
  needsMonthlyFilter?: boolean;
  rankBy: RatingDimension;
  finalLimit: number;
};

export const PICKS: Record<string, Pick> = {
  "best-dividend-stocks": {
    label: "Best Dividend Stocks Model Portfolio",
    description: "A balanced blend of yield and total return — our flagship Model Portfolio. Ranked by composite rating.",
    premium: true,
    fetchOpts: { minDividend: 1, minMarketCap: 5_000_000_000, minYieldPct: 1.5, limit: 500, requireUpcomingDividend: true },
    build: (rows) => rows.filter((r) => (r.dividend_yield ?? 0) >= 2 && (r.dividend_yield ?? 0) <= 5.5).slice(0, 80),
    rankBy: "composite",
    finalLimit: 25,
  },
  "best-high-yield": {
    label: "Best High Dividend Stocks",
    description: "Model portfolio targeting 6–12% dividend yield, ranked by composite rating (so we surface high-quality high-yield names, not yield traps).",
    premium: true,
    fetchOpts: { minDividend: 1, minMarketCap: 500_000_000, minYieldPct: 6, sortBy: "yield", limit: 500, requireUpcomingDividend: true },
    build: (rows) => rows.filter((r) => (r.dividend_yield ?? 0) >= 6 && (r.dividend_yield ?? 0) <= 14).slice(0, 80),
    rankBy: "composite",
    finalLimit: 25,
  },
  "best-dividend-growth": {
    label: "Best Dividend Growth Stocks",
    description: "Companies that consistently raise dividends — ranked by our Growth rating (1-5 scale) which weights revenue growth, EPS growth, and dividend CAGR.",
    premium: true,
    fetchOpts: { minDividend: 0.5, minMarketCap: 5_000_000_000, minYieldPct: 0.5, limit: 500, requireUpcomingDividend: true },
    build: (rows) => rows.slice(0, 100),
    rankBy: "growth",
    finalLimit: 25,
  },
  "best-dividend-protection": {
    label: "Best Dividend Protection",
    description: "Maximum safety — large-cap dividend payers with the highest Health rating (debt coverage, cash position, payout ratio).",
    premium: true,
    fetchOpts: { minDividend: 0.5, minMarketCap: 20_000_000_000, minYieldPct: 1.5, limit: 500, requireUpcomingDividend: true },
    build: (rows) => rows.filter((r) => (r.dividend_yield ?? 0) >= 1.5 && (r.dividend_yield ?? 0) <= 5).slice(0, 100),
    rankBy: "health",
    finalLimit: 20,
  },
  "best-monthly-dividend": {
    label: "Best Monthly Dividend Stocks",
    description: "Top-rated monthly dividend payers for steady income — ranked by composite rating.",
    premium: true,
    fetchOpts: { minDividend: 0.1, minMarketCap: 250_000_000, limit: 500, excludeEtfs: false, requireUpcomingDividend: true },
    needsMonthlyFilter: true,
    build: (rows) => rows.slice(0, 60),
    rankBy: "composite",
    finalLimit: 25,
  },
  "dividend-capture": {
    label: "Best Dividend Capture Stocks",
    description: "Stable high-yield dividend payers with strong Momentum scores — quick to recover from ex-dividend drops, making them ideal capture candidates.",
    premium: true,
    fetchOpts: { minDividend: 1, minMarketCap: 1_000_000_000, minYieldPct: 3, limit: 500, requireUpcomingDividend: true },
    build: (rows) => rows.filter((r) => (r.dividend_yield ?? 0) >= 3 && (r.dividend_yield ?? 0) <= 9).slice(0, 100),
    rankBy: "momentum",
    finalLimit: 25,
  },
};

const NAME_BOND_PATTERN =
  /(%|\bNote(s)?\b|\bSubord|\bSenior\b|\bSeries\s+[A-Z]\b|\bPref\b|\bPreferred\b|\bFinance\s+(Co|Corp|LLC)\b|\bCapital\s+Trust\b|\bDebenture)/i;

function isCommonStock(row: { symbol: string; name: string | null }): boolean {
  if (!row.name) return true;
  if (NAME_BOND_PATTERN.test(row.name)) return false;
  if (/^[A-Z]+-[A-Z]{1,2}$/.test(row.symbol)) return false;
  return true;
}

async function monthlySymbols(): Promise<Set<string>> {
  const sb = getBackendClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  const { data } = await sb
    .from("dividends")
    .select("symbol")
    .ilike("frequency", "Monthly")
    .gte("date", cutoff.toISOString().slice(0, 10))
    .limit(2000);
  return new Set(((data as { symbol: string }[]) ?? []).map((r) => r.symbol));
}

export type PickSecurityType = "stocks" | "etfs";

// Build the rows for a named Model Portfolio. Returns [] for unknown slugs.
export async function buildPickRows(slug: string, type: PickSecurityType): Promise<StockRow[]> {
  const pick = PICKS[slug];
  if (!pick) return [];
  if (type === "etfs") {
    return listEtfsByCategory({ categoryContains: "Dividend", minMarketCap: 50_000_000, limit: 100 });
  }
  let all = await listStocks(pick.fetchOpts);
  if (pick.needsMonthlyFilter) {
    const monthly = await monthlySymbols();
    all = all.filter((r) => monthly.has(r.symbol));
  }
  all = all.filter(isCommonStock);
  let rows = pick.build(all);
  rows = await rankByDimension(rows, pick.rankBy);
  return rows.slice(0, pick.finalLimit);
}

// "Best Dividend Stocks {year}" SEO list — 30 large-caps by composite rating.
export async function buildBestYearRows(): Promise<StockRow[]> {
  const all = await listStocks({
    minDividend: 1,
    minMarketCap: 5_000_000_000,
    minYieldPct: 1.5,
    requireUpcomingDividend: true,
    limit: 500,
  });
  const filtered = all.filter((r) => (r.dividend_yield ?? 0) >= 2 && (r.dividend_yield ?? 0) <= 6);
  return (await rankByDimension(filtered, "composite")).slice(0, 30);
}

// "Best {sector} Dividend Stocks" SEO list — top 15 by composite rating.
// `sectorSlug` is the URL slug (mapped to an FMP sector); [] for unknown slugs.
export async function buildBestSectorRows(sectorSlug: string): Promise<StockRow[]> {
  const fmpSector = SECTOR_SLUG_MAP[sectorSlug];
  if (!fmpSector) return [];
  const all = await listStocks({
    sector: fmpSector,
    minDividend: 0.1,
    minMarketCap: 500_000_000,
    minYieldPct: 1,
    limit: 500,
  });
  return (await rankByDimension(all, "composite")).slice(0, 15);
}

// Quarterly-staggered monthly-income portfolio (24 names). Cached upstream.
export async function buildStaggeredRows(limit = 24): Promise<StockRow[]> {
  return staggeredQuarterlyPortfolio(limit);
}

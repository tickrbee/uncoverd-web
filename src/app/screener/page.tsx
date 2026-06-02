import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { T } from "@/components/t";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { Pager } from "@/components/pager";
import { ListingToolbar } from "@/components/listing-toolbar";
import { CountryFilter } from "@/components/country-filter";
import {
  listStocks,
  countStocks,
  getStockRatings,
  nextDividendBySymbols,
  getStockExtras,
  listEtfsByCategory,
  countEtfsByCategory,
  applyDisplayCurrency,
  getDisplayCurrency,
  redactRowsForFree,
  gatedMap,
  SECTOR_LABEL_MAP,
  SECTOR_SLUG_MAP,
  type StockRow,
} from "@/lib/data";
import type { SecurityType } from "@/components/listing-toolbar";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Dividend Stock Screener",
  description:
    "Screen 65,000+ dividend stocks and ETFs by yield, payout ratio, dividend growth, market cap, sector and currency. Filter, sort and compare income investments on uncoverd.",
  alternates: { canonical: "/screener" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const VALID_VIEWS_STOCKS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];
const VALID_VIEWS_ETFS: ColumnView[] = ["etf-overview", "payout", "returns"];

type SearchParams = {
  sector?: string;
  sort?: string;
  view?: string;
  page?: string;
  currency?: string;
  country?: string;
  type?: string;
};

const SECURITY_TYPES = new Set<SecurityType>(["stocks", "etfs", "active-etfs", "funds"]);

export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const sectorParam = sp.sector;
  const sector = sectorParam && sectorParam in SECTOR_SLUG_MAP ? SECTOR_SLUG_MAP[sectorParam] : undefined;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currency = sp.currency;
  const country = sp.country ?? "US";
  const type: SecurityType = sp.type && SECURITY_TYPES.has(sp.type as SecurityType) ? (sp.type as SecurityType) : "stocks";
  const isEtfView = type !== "stocks";
  const validViews = isEtfView ? VALID_VIEWS_ETFS : VALID_VIEWS_STOCKS;
  const defaultView: ColumnView = isEtfView ? "etf-overview" : "overview";
  const view: ColumnView = sp.view && validViews.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : defaultView;

  const baseOpts = {
    sector,
    minMarketCap: 300_000_000,
    minDividend: 0.01,
    currency,
    country,
    requireUpcomingDividend: true,
  };

  let rows: StockRow[] = [];
  let total = 0;
  try {
    if (type === "stocks") {
      [rows, total] = await Promise.all([
        listStocks({
          ...baseOpts,
          sortBy: sp.sort === "yield" ? "yield" : "market_cap",
          offset,
          limit: PAGE_SIZE,
        }),
        countStocks(baseOpts),
      ]);
    } else {
      // Unified ETFs view: include passive ETFs, active ETFs, and mutual funds.
      // Legacy URLs with type=active-etfs / type=funds still scope appropriately.
      const sectorCategory = sector ? sector.split(" ")[0] : undefined;
      const etfOpts = {
        active: type === "active-etfs" ? true : undefined,
        fund: type === "funds" ? true : undefined,
        categoryContains: sectorCategory,
        minMarketCap: 100_000_000,
      };
      [rows, total] = await Promise.all([
        listEtfsByCategory({ ...etfOpts, offset, limit: PAGE_SIZE }),
        countEtfsByCategory(etfOpts),
      ]);
    }
  } catch (e) {
    console.error(e);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const sectorChips = Object.entries(SECTOR_SLUG_MAP);
  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  const needsExtras = view === "growth" || view === "returns";
  let [ratings, upcomingDividends, extras, displayCurrency] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
    getDisplayCurrency(),
  ]);
  rows = await applyDisplayCurrency(rows, displayCurrency);

  // Redact identifiers + premium fields server-side for free users so
  // browser inspectors can't reveal the underlying ticker/name/ratings.
  rows = redactRowsForFree(rows, premium.isPremium);
  ratings = gatedMap(ratings, premium.isPremium);
  extras = gatedMap(extras, premium.isPremium);
  upcomingDividends = gatedMap(upcomingDividends, premium.isPremium);

  const baseHref = "/screener";
  const filterQs = (override: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      sector: sectorParam,
      sort: sp.sort,
      view: view !== "overview" ? view : undefined,
      currency,
      // Preserve country unless explicitly overridden, and treat default "US" as no-op.
      country: country !== "US" ? country : undefined,
      type: type !== "stocks" ? type : undefined,
      ...override,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return params.toString();
  };
  const baseHrefWithFilters = (() => {
    const qs = filterQs({});
    return qs ? `/screener?${qs}` : "/screener";
  })();

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Screener"
          title={`Best Dividend Stock Screener in ${new Date().getFullYear()}`}
          description="Find dividend stocks across sectors, currencies, and market caps. Filter by yield, size, and industry."
          meta={`As of ${new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}.`}
        />

        <ColumnTabs active={view} baseHref={baseHref} preset={isEtfView ? "etf" : "screener"} />

        <ListingToolbar
          active={type}
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-screener-${type}${sectorParam ? `-${sectorParam}` : ""}.csv`}
        />

        <CountryFilter active={country} />

        <div className="dv-filters">
          <Link
            href={`/screener${filterQs({ sector: undefined, page: undefined }) ? `?${filterQs({ sector: undefined, page: undefined })}` : ""}`}
            className={`dv-chip ${!sectorParam ? "dv-chip--active" : ""}`}
          >
            <T>All Sectors</T>
          </Link>
          {sectorChips.map(([slug, name]) => (
            <Link
              key={slug}
              href={`/screener?${filterQs({ sector: slug, page: undefined })}`}
              className={`dv-chip ${sectorParam === slug ? "dv-chip--active" : ""}`}
            >
              <T>{SECTOR_LABEL_MAP[name] || name}</T>
            </Link>
          ))}
        </div>

        <div className="dv-filters">
          <Link
            href={`/screener?${filterQs({ sort: undefined, page: undefined })}`}
            className={`dv-chip ${!sp.sort || sp.sort === "market_cap" ? "dv-chip--active" : ""}`}
          >
            <T>Sort: Market Cap</T>
          </Link>
          <Link
            href={`/screener?${filterQs({ sort: "yield", page: undefined })}`}
            className={`dv-chip ${sp.sort === "yield" ? "dv-chip--active" : ""}`}
          >
            <T>Sort: Yield</T>
          </Link>
        </div>

        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          extras={extras}
          isPremium={premium.isPremium}
          view={view}
        />

        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Page {page} of {totalPages} · {total.toLocaleString()} stocks{currency ? ` in ${currency}` : " (all currencies)"}
        </p>

        <Pager page={page} totalPages={totalPages} baseHref={baseHrefWithFilters} />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { Pager } from "@/components/pager";
import { ListingToolbar } from "@/components/listing-toolbar";
import { CountryFilter } from "@/components/country-filter";
import {
  listStocks,
  countStocks,
  getStockRatings,
  nextDividendBySymbols,
  listEtfsByCategory,
  industriesInSector,
  getStockExtras,
  applyDisplayCurrency,
  getDisplayCurrency,
  SECTOR_SLUG_MAP,
  SECTOR_LABEL_MAP,
  type StockRow,
} from "@/lib/data";
import type { SecurityType } from "@/components/listing-toolbar";
import { getPremiumStatus } from "@/lib/premium";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTOR_SLUG_MAP[slug];
  if (!sector) return { title: "Sector Dividends" };
  const label = SECTOR_LABEL_MAP[sector] || sector;
  return {
    title: `${label} Dividend Stocks`,
    description: metaDescription(
      `Top dividend-paying ${label.toLowerCase()} stocks ranked by yield, payout ratio, growth and uncoverd rating. Compare ${label.toLowerCase()} dividend payers and find the safest income.`
    ),
    alternates: { canonical: `/sectors/${slug}` },
  };
}

export default async function SectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    view?: string;
    page?: string;
    currency?: string;
    country?: string;
    type?: string;
    industry?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sector = SECTOR_SLUG_MAP[slug];
  if (!sector) notFound();
  const label = SECTOR_LABEL_MAP[sector] || sector;
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currency = sp.currency;
  const country = sp.country ?? "US";
  const validTypes = new Set(["stocks", "etfs", "active-etfs", "funds"]);
  const type: SecurityType = sp.type && validTypes.has(sp.type) ? (sp.type as SecurityType) : "stocks";
  const industryFilter = sp.industry || undefined;

  const baseOpts = {
    sector,
    industryPattern: industryFilter,
    minDividend: 0.01,
    minMarketCap: 300_000_000,
    currency,
    country,
  };

  let rows: StockRow[] = [];
  let total = 0;
  try {
    if (type === "stocks") {
      [rows, total] = await Promise.all([
        listStocks({ ...baseOpts, offset, limit: PAGE_SIZE }),
        countStocks(baseOpts),
      ]);
    } else {
      rows = await listEtfsByCategory({
        active: type === "active-etfs",
        fund: type === "funds",
        categoryContains: label.split(" ")[0],
        minMarketCap: 100_000_000,
        limit: PAGE_SIZE,
      });
      total = rows.length;
    }
  } catch (e) {
    console.error(e);
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  const needsExtras = view === "growth" || view === "returns";
  const [ratings, upcomingDividends, industries, extras, displayCurrency] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    industriesInSector(sector),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
    getDisplayCurrency(),
  ]);
  rows = await applyDisplayCurrency(rows, displayCurrency);

  const params2 = new URLSearchParams();
  if (view !== "overview") params2.set("view", view);
  if (currency) params2.set("currency", currency);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Sector Dividends"
          title={`${label} Dividend Stocks`}
          description={`The full list of dividend-paying ${label.toLowerCase()} companies, sorted by market cap.`}
        />
        <ColumnTabs active={view} baseHref={`/sectors/${slug}`} />

        {industries.length > 0 && (
          <div className="dv-filters">
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginRight: "0.4rem", alignSelf: "center" }}>
              Industry:
            </span>
            {(() => {
              // Helper: preserve country/type/view/currency across industry chip clicks
              const buildHref = (industry?: string) => {
                const qp = new URLSearchParams();
                if (industry) qp.set("industry", industry);
                if (type !== "stocks") qp.set("type", type);
                if (country && country !== "US") qp.set("country", country);
                if (view !== "overview") qp.set("view", view);
                if (currency) qp.set("currency", currency);
                const qs = qp.toString();
                return qs ? `/sectors/${slug}?${qs}` : `/sectors/${slug}`;
              };
              return (
                <>
                  <Link
                    href={buildHref()}
                    className={`dv-chip ${!industryFilter ? "dv-chip--active" : ""}`}
                  >
                    All
                  </Link>
                  {industries.slice(0, 12).map((i) => (
                    <Link
                      key={i.industry}
                      href={buildHref(i.industry)}
                      className={`dv-chip ${industryFilter === i.industry ? "dv-chip--active" : ""}`}
                    >
                      {i.industry} ({i.count})
                    </Link>
                  ))}
                </>
              );
            })()}
          </div>
        )}
        <ListingToolbar
          active={type}
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-${slug}-${type}.csv`}
        />
        <CountryFilter active={country} />
        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          extras={extras}
          isPremium={premium.isPremium}
          view={view}
        />
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Page {page} of {totalPages} · {total.toLocaleString()} stocks
        </p>
        <Pager
          page={page}
          totalPages={totalPages}
          baseHref={`/sectors/${slug}${params2.toString() ? `?${params2.toString()}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

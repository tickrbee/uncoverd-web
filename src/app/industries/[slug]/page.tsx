import type { Metadata } from "next";
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
  getStockExtras,
  applyDisplayCurrency,
  getDisplayCurrency,
  redactRowsForFree,
  gatedMap,
  INDUSTRY_SLUG_MAP,
  type StockRow,
} from "@/lib/data";
import type { SecurityType } from "@/components/listing-toolbar";
import { getPremiumStatus } from "@/lib/premium";
import { metaDescription } from "@/lib/seo";
import { industryBySlug, industryHreflang } from "@/lib/i18n-taxonomy";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = INDUSTRY_SLUG_MAP[slug];
  if (!entry) return { title: "Industry Dividends" };
  const taxo = industryBySlug("en", slug);
  return {
    title: `${entry.label} Dividend Stocks`,
    description: metaDescription(
      `Top dividend-paying ${entry.label.toLowerCase()} stocks ranked by yield, payout ratio, growth and uncoverd rating. Compare ${entry.label.toLowerCase()} dividend payers and find the safest income.`
    ),
    alternates: {
      canonical: `/industries/${slug}`,
      languages: taxo ? industryHreflang(taxo) : undefined,
    },
  };
}

export default async function IndustryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; page?: string; currency?: string; country?: string; type?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const entry = INDUSTRY_SLUG_MAP[slug];
  if (!entry) notFound();
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currency = sp.currency;
  const country = sp.country ?? "US";
  const validTypes = new Set(["stocks", "etfs", "active-etfs", "funds"]);
  const type: SecurityType = sp.type && validTypes.has(sp.type) ? (sp.type as SecurityType) : "stocks";

  // Industry pages are dividend listings — only include companies that actually
  // pay dividends, AND have an upcoming ex-div date. Themed buckets (Uranium,
  // Biotech, etc) may legitimately show empty if no constituent pays.
  const baseOpts = {
    industryPattern: entry.industryPattern,
    sector: entry.sector,
    minMarketCap: 250_000_000,
    minDividend: 0.01,
    requireUpcomingDividend: true,
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
        categoryContains: entry.label.split(" ")[0],
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
  let [ratings, upcomingDividends, extras, displayCurrency] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
    getDisplayCurrency(),
  ]);
  rows = await applyDisplayCurrency(rows, displayCurrency);
  rows = redactRowsForFree(rows, premium.isPremium);
  ratings = gatedMap(ratings, premium.isPremium);
  extras = gatedMap(extras, premium.isPremium);
  upcomingDividends = gatedMap(upcomingDividends, premium.isPremium);

  const params2 = new URLSearchParams();
  if (view !== "overview") params2.set("view", view);
  if (currency) params2.set("currency", currency);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Industry Dividends"
          title={`${entry.label} Dividend Stocks`}
          description={`Dividend-paying ${entry.label.toLowerCase()} stocks ranked by market cap.`}
        />
        <ColumnTabs active={view} baseHref={`/industries/${slug}`} />
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
          baseHref={`/industries/${slug}${params2.toString() ? `?${params2.toString()}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

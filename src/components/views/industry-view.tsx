import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { Pager } from "@/components/pager";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import { CountryFilter } from "@/components/country-filter";
import {
  applyDisplayCurrency,
  getDisplayCurrency,
  INDUSTRY_SLUG_MAP,
  type StockRow,
} from "@/lib/data";
import {
  cachedListStocks as listStocks,
  cachedCountStocks as countStocks,
  cachedListEtfsByCategory as listEtfsByCategory,
} from "@/lib/cached-data";
import { INDUSTRIES, industryUrl } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { industryHeader, etfHeaderParts, pageSummary, BLUE_CHIP_MIN_MARKET_CAP } from "@/lib/ui-i18n";

const PAGE_SIZE = 30;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export type IndustrySearch = {
  view?: string; page?: string; currency?: string; country?: string; type?: string; tier?: string;
};

// Shared, locale-aware industry listing — identical to the English
// /industries/[slug] page, only translated.
export async function IndustryView({
  locale,
  slug, // canonical English industry slug (e.g. "reit")
  sp,
}: {
  locale: Locale;
  slug: string;
  sp: IndustrySearch;
}) {
  const entry = INDUSTRY_SLUG_MAP[slug];
  if (!entry) notFound();
  const taxo = INDUSTRIES.find((i) => i.key === slug);
  const label = locale === "en" ? entry.label : taxo?.label[locale] ?? entry.label;
  const basePath = taxo ? industryUrl(locale, taxo) : `/industries/${slug}`;

  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currency = sp.currency;
  const country = sp.country ?? "US";
  const validTypes = new Set(["stocks", "etfs", "active-etfs", "funds"]);
  const type: SecurityType = sp.type && validTypes.has(sp.type) ? (sp.type as SecurityType) : "stocks";
  // Title/description reflect the active security type.
  const header = type === "stocks"
    ? industryHeader(locale, label)
    : { ...industryHeader(locale, label), ...etfHeaderParts(locale, label) };
  const minMarketCap = sp.tier === "large" ? BLUE_CHIP_MIN_MARKET_CAP : 250_000_000;

  const baseOpts = {
    industryPattern: entry.industryPattern,
    sector: entry.sector,
    minMarketCap,
    minDividend: 0.01,
    // NOT requireUpcomingDividend: that only keeps stocks whose NEXT ex-div date
    // is already declared (~1-3 months out), which dropped 56-78% of real payers
    // (e.g. a quarterly bank that hasn't declared its next ex-date yet). We want
    // the full set of dividend payers in the industry.
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
  // Free/gated render — no server auth read; paying users get ratings/extras
  // revealed client-side via <DividendTable revealPremium>.
  const displayCurrency = await getDisplayCurrency();
  rows = await applyDisplayCurrency(rows, displayCurrency);

  const params2 = new URLSearchParams();
  if (view !== "overview") params2.set("view", view);
  if (currency) params2.set("currency", currency);
  if (sp.tier === "large") params2.set("tier", "large");

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
        <ColumnTabs active={view} baseHref={basePath} />
        <ListingToolbar
          active={type}
          rows={rows}
          csvFilename={`uncoverd-${slug}-${type}.csv`}
        />
        <CountryFilter active={country} />
        <DividendTable rows={rows} isPremium={false} revealPremium view={view} />
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {pageSummary(locale, page, totalPages, total)}
        </p>
        <Pager
          page={page}
          totalPages={totalPages}
          baseHref={`${basePath}${params2.toString() ? `?${params2.toString()}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

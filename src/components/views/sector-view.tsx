import Link from "next/link";
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
  gatedMap,
  SECTOR_SLUG_MAP,
  SECTOR_LABEL_MAP,
  type StockRow,
} from "@/lib/data";
import {
  cachedListStocks as listStocks,
  cachedCountStocks as countStocks,
  cachedListEtfsByCategory as listEtfsByCategory,
  cachedIndustriesInSector as industriesInSector,
  cachedGetStockRatings as getStockRatings,
  cachedNextDividendBySymbols as nextDividendBySymbols,
  cachedGetStockExtras as getStockExtras,
} from "@/lib/cached-data";
import { getPremiumStatus } from "@/lib/premium";
import { SECTORS, sectorUrl } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { chromeStrings, sectorHeader, etfHeaderParts, pageSummary, BLUE_CHIP_MIN_MARKET_CAP } from "@/lib/ui-i18n";

const PAGE_SIZE = 30;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export type SectorSearch = {
  view?: string; page?: string; currency?: string; country?: string;
  type?: string; industry?: string; tier?: string;
};

// Shared, locale-aware sector listing. Rendered identically by the English
// /sectors/[slug] route and the localized /<locale>/<sectorPath>/[slug] routes
// — same layout, columns, filters and data; only the text is translated.
export async function SectorView({
  locale,
  slug, // canonical English sector slug (e.g. "energy")
  sp,
}: {
  locale: Locale;
  slug: string;
  sp: SectorSearch;
}) {
  const sector = SECTOR_SLUG_MAP[slug];
  if (!sector) notFound();
  const taxo = SECTORS.find((s) => s.key === slug);
  const englishLabel = SECTOR_LABEL_MAP[sector] || sector;
  const label = locale === "en" ? englishLabel : taxo?.label[locale] ?? englishLabel;
  const basePath = taxo ? sectorUrl(locale, taxo) : `/sectors/${slug}`;
  const chrome = chromeStrings(locale);

  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currency = sp.currency;
  const country = sp.country ?? "US";
  const validTypes = new Set(["stocks", "etfs", "active-etfs", "funds"]);
  const type: SecurityType = sp.type && validTypes.has(sp.type) ? (sp.type as SecurityType) : "stocks";
  const industryFilter = sp.industry || undefined;
  const header = type === "stocks"
    ? sectorHeader(locale, label)
    : { ...sectorHeader(locale, label), ...etfHeaderParts(locale, label) };
  // Blue-chip (national index) approximation: country + market-cap floor.
  const minMarketCap = sp.tier === "large" ? BLUE_CHIP_MIN_MARKET_CAP : 300_000_000;

  const baseOpts = {
    sector,
    industryPattern: industryFilter,
    minDividend: 0.01,
    minMarketCap,
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
        categoryContains: englishLabel.split(" ")[0],
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
  // Stock identities are free for everyone; the rating + extras stay gated below.
  const safeRatings = gatedMap(ratings, premium.isPremium);
  const safeExtras = gatedMap(extras, premium.isPremium);
  const safeUpcoming = gatedMap(upcomingDividends, premium.isPremium);

  const params2 = new URLSearchParams();
  if (view !== "overview") params2.set("view", view);
  if (currency) params2.set("currency", currency);
  if (sp.tier === "large") params2.set("tier", "large");

  const buildHref = (industry?: string) => {
    const qp = new URLSearchParams();
    if (industry) qp.set("industry", industry);
    if (type !== "stocks") qp.set("type", type);
    if (country && country !== "US") qp.set("country", country);
    if (sp.tier === "large") qp.set("tier", "large");
    if (view !== "overview") qp.set("view", view);
    if (currency) qp.set("currency", currency);
    const qs = qp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
        <ColumnTabs active={view} baseHref={basePath} />

        {industries.length > 0 && (
          <div className="dv-filters">
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginRight: "0.4rem", alignSelf: "center" }}>
              {chrome.industry}
            </span>
            <Link href={buildHref()} className={`dv-chip ${!industryFilter ? "dv-chip--active" : ""}`}>
              {chrome.all}
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
          ratings={safeRatings}
          upcomingDividends={safeUpcoming}
          extras={safeExtras}
          isPremium={premium.isPremium}
          view={view}
        />
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

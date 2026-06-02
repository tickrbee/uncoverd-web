import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import { CountryFilter } from "@/components/country-filter";
import { Pager } from "@/components/pager";
import {
  getStockRatings,
  nextDividendBySymbols,
  getStockExtras,
  applyDisplayCurrency,
  getDisplayCurrency,
  redactRowsForFree,
  gatedMap,
  type StockRow,
} from "@/lib/data";
import { cachedListStocks as listStocks } from "@/lib/cached-data";
import { getPremiumStatus } from "@/lib/premium";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { highYieldHeader, pageSummary, BLUE_CHIP_MIN_MARKET_CAP } from "@/lib/ui-i18n";

const PAGE_SIZE = 100;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings", "buy-reco", "upside"];

// Localized high-yield route paths (fixed pages, not a [slug] taxonomy).
const HY_PATH: Record<Locale, string> = {
  en: "/high-yield",
  fr: "/fr/actions-haut-rendement",
  de: "/de/aktien-hohe-dividende",
  it: "/it/azioni-alto-rendimento",
  es: "/es/acciones-alta-rentabilidad",
};

export type HighYieldSearch = { view?: string; page?: string; country?: string; tier?: string };

// Shared, locale-aware "yields over 4%" listing — identical to the English
// /high-yield page, only translated.
export async function HighYieldView({ locale, sp }: { locale: Locale; sp: HighYieldSearch }) {
  const basePath = HY_PATH[locale];
  const header = highYieldHeader(locale);
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const country = sp.country ?? "US";
  const minMarketCap = sp.tier === "large" ? BLUE_CHIP_MIN_MARKET_CAP : 300_000_000;

  let allRows: StockRow[] = [];
  try {
    allRows = await listStocks({
      minDividend: 0.5,
      minMarketCap,
      minYieldPct: 4,
      sortBy: "yield",
      country,
      limit: 2000,
    });
  } catch (e) {
    console.error(e);
  }
  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const rows = allRows.slice(offset, offset + PAGE_SIZE);

  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  const needsExtras = view === "growth" || view === "returns" || view === "buy-reco" || view === "upside";
  const [ratings, upcomingDividends, extras, displayCurrency] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
    getDisplayCurrency(),
  ]);
  const isPrem = premium.isPremium;
  const safeRows = redactRowsForFree(rows, isPrem);
  const displayRows = await applyDisplayCurrency(safeRows, displayCurrency);
  const safeRatings = gatedMap(ratings, isPrem);
  const safeExtras = gatedMap(extras, isPrem);
  const safeUpcoming = gatedMap(upcomingDividends, isPrem);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
        <ColumnTabs active={view} baseHref={basePath} />
        <ListingToolbar
          active="stocks"
          rows={safeRows}
          isPremium={premium.isPremium}
          csvFilename="uncoverd-high-yield.csv"
          hideSecurityType
        />
        <CountryFilter active={country} />
        <DividendTable
          rows={displayRows}
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
          baseHref={`${basePath}${view !== "overview" ? `?view=${view}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

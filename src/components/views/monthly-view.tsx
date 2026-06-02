import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import { Pager } from "@/components/pager";
import { getBackendClient } from "@/lib/supabase/admin";
import {
  getStockRatings,
  nextDividendBySymbols,
  getStockExtras,
  redactRowsForFree,
  gatedMap,
  type StockRow,
} from "@/lib/data";
import { cachedListStocks as listStocks } from "@/lib/cached-data";
import { getPremiumStatus } from "@/lib/premium";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { monthlyHeader, pageSummary } from "@/lib/ui-i18n";

const PAGE_SIZE = 100;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings", "buy-reco", "upside"];

const MONTHLY_PATH: Record<Locale, string> = {
  en: "/monthly",
  fr: "/fr/actions-dividende-mensuel",
  de: "/de/monatliche-dividenden-aktien",
  it: "/it/azioni-dividendo-mensile",
  es: "/es/acciones-dividendo-mensual",
};

export type MonthlySearch = { view?: string; page?: string; type?: string };

async function monthlyDividendSymbols(): Promise<string[]> {
  const sb = getBackendClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 18);
  const { data, error } = await sb
    .from("dividends")
    .select("symbol")
    .ilike("frequency", "Monthly")
    .gte("date", cutoff.toISOString().slice(0, 10))
    .limit(5000);
  if (error || !data) return [];
  return Array.from(new Set((data as { symbol: string }[]).map((r) => r.symbol)));
}

// Shared, locale-aware monthly-dividend listing — identical to the English
// /monthly page, only translated.
export async function MonthlyView({ locale, sp }: { locale: Locale; sp: MonthlySearch }) {
  const basePath = MONTHLY_PATH[locale];
  const header = monthlyHeader(locale);
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const type: SecurityType =
    sp.type === "etfs" || sp.type === "active-etfs" || sp.type === "funds" ? "etfs" : "stocks";

  let allRows: StockRow[] = [];
  try {
    const symbols = await monthlyDividendSymbols();
    if (symbols.length > 0) {
      const candidates = await listStocks({ symbols, minMarketCap: 250_000_000, limit: 2000, excludeEtfs: false });
      allRows =
        type === "etfs"
          ? candidates.filter((r) => r.is_etf || r.is_fund)
          : candidates.filter((r) => !r.is_etf && !r.is_fund);
      allRows.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
    }
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
  const [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
  ]);

  const isPrem = premium.isPremium;
  const safeRows = redactRowsForFree(rows, isPrem);
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
          active={type}
          rows={safeRows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-monthly-${type}.csv`}
        />
        <DividendTable
          rows={safeRows}
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

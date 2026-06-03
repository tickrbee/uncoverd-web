import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import { Pager } from "@/components/pager";
import { unstable_cache } from "next/cache";
import { getBackendClient } from "@/lib/supabase/admin";
import { type StockRow } from "@/lib/data";
import { cachedListStocks as listStocks } from "@/lib/cached-data";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { monthlyHeader, pageSummary } from "@/lib/ui-i18n";

const PAGE_SIZE = 30;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings", "buy-reco", "upside"];

const MONTHLY_PATH: Record<Locale, string> = {
  en: "/monthly",
  fr: "/fr/actions-dividende-mensuel",
  de: "/de/monatliche-dividenden-aktien",
  it: "/it/azioni-dividendo-mensile",
  es: "/es/acciones-dividendo-mensual",
};

export type MonthlySearch = { view?: string; page?: string; type?: string };

// Cached: the "which symbols pay monthly" scan is user-independent and was
// re-running a 5000-row dividends scan on every request (a big chunk of the
// /monthly slowness). Sorted so the downstream cachedListStocks({ symbols })
// cache key is stable across requests.
const monthlyDividendSymbols = unstable_cache(
  async (): Promise<string[]> => {
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
    return Array.from(new Set((data as { symbol: string }[]).map((r) => r.symbol))).sort();
  },
  ["monthly-dividend-symbols"],
  { revalidate: 3600 },
);

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

  // Free/gated render — no server auth read; paying users get ratings/extras
  // revealed client-side via <DividendTable revealPremium>.
  const safeRows = rows;

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
          csvFilename={`uncoverd-monthly-${type}.csv`}
        />
        <DividendTable rows={safeRows} isPremium={false} revealPremium view={view} />
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

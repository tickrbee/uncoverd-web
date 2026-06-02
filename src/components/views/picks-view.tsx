import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import {
  listStocks,
  listEtfsByCategory,
  rankByDimension,
  getStockRatings,
  getStockExtras,
  nextDividendBySymbols,
  redactRowsForFree,
  gatedMap,
  type StockRow,
  type ScreenerOptions,
  type RatingDimension,
} from "@/lib/data";
import { getBackendClient } from "@/lib/supabase/admin";
import { getPremiumStatus } from "@/lib/premium";
import { PICKS as PICKS_TAXO, pickUrl } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { tHeader } from "@/lib/page-header-i18n";
import { picksNote } from "@/lib/ui-i18n";

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

type Pick = {
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

// Shared, locale-aware model-portfolio page. EN /picks/[slug] + localized
// /<locale>/<picksPath>/[slug] both render this. `slug` is the English key.
export async function PicksView({
  locale,
  slug,
  sp,
}: {
  locale: Locale;
  slug: string;
  sp: { view?: string; type?: string };
}) {
  const pick = PICKS[slug];
  if (!pick) notFound();
  const taxo = PICKS_TAXO.find((p) => p.key === slug);
  const basePath = taxo ? pickUrl(locale, taxo) : `/picks/${slug}`;
  const title = locale === "en" ? pick.label : taxo?.label[locale] ?? pick.label;
  const eyebrow = tHeader("Model Portfolio", locale)!;
  const description = tHeader(pick.description, locale)!;
  const note = picksNote(locale);

  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const type: SecurityType =
    sp.type === "etfs" || sp.type === "active-etfs" || sp.type === "funds" ? "etfs" : "stocks";

  let rows: StockRow[] = [];
  try {
    if (type === "etfs") {
      rows = await listEtfsByCategory({ categoryContains: "Dividend", minMarketCap: 50_000_000, limit: 100 });
    } else {
      let all = await listStocks(pick.fetchOpts);
      if (pick.needsMonthlyFilter) {
        const monthly = await monthlySymbols();
        all = all.filter((r) => monthly.has(r.symbol));
      }
      all = all.filter(isCommonStock);
      rows = pick.build(all);
      rows = await rankByDimension(rows, pick.rankBy);
      rows = rows.slice(0, pick.finalLimit);
    }
  } catch (e) {
    console.error(e);
  }

  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  let [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    getStockExtras(symbols),
  ]);
  rows = redactRowsForFree(rows, premium.isPremium);
  ratings = gatedMap(ratings, premium.isPremium);
  upcomingDividends = gatedMap(upcomingDividends, premium.isPremium);
  extras = gatedMap(extras, premium.isPremium);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={eyebrow} title={title} description={description} />
        <ColumnTabs active={view} baseHref={basePath} />
        <ListingToolbar
          active={type}
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-${slug}-${type}.csv`}
        />
        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          extras={extras}
          isPremium={premium.isPremium}
          view={view}
        />
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {note.base}
          {!premium.isPremium && pick.premium && note.premiumSuffix}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

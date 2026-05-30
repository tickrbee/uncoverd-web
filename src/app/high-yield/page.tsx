import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import { CountryFilter } from "@/components/country-filter";
import { Pager } from "@/components/pager";
import {
  listStocks,
  getStockRatings,
  nextDividendBySymbols,
  getStockExtras,
  applyDisplayCurrency,
  getDisplayCurrency,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Yields Over 4% — High Dividend Stocks",
  description: "Dividend-paying stocks with forward yields above 4%.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const VALID_VIEWS: ColumnView[] = [
  "overview",
  "payout",
  "growth",
  "returns",
  "ratings",
  "buy-reco",
  "upside",
];

export default async function HighYieldPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const country = sp.country ?? "US";

  let allRows: StockRow[] = [];
  try {
    allRows = await listStocks({
      minDividend: 0.5,
      minMarketCap: 300_000_000,
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
  const needsExtras = view === "growth" || view === "returns" || view === "income" || view === "income-risk" || view === "buy-reco" || view === "upside";
  const [ratings, upcomingDividends, extras, displayCurrency] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
    getDisplayCurrency(),
  ]);
  const displayRows = await applyDisplayCurrency(rows, displayCurrency);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="High Yield"
          title="Stocks Yielding Over 4%"
          description="Dividend stocks with forward yields above 4%, ranked highest to lowest."
        />
        <ColumnTabs active={view} baseHref="/high-yield" />
        <ListingToolbar
          active="stocks"
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename="uncoverd-high-yield.csv"
        />
        <CountryFilter active={country} />
        <DividendTable
          rows={displayRows}
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
          baseHref={`/high-yield${view !== "overview" ? `?view=${view}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

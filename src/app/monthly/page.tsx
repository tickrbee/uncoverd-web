import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import { Pager } from "@/components/pager";
import { getBackendClient } from "@/lib/supabase/admin";
import {
  listStocks,
  getStockRatings,
  nextDividendBySymbols,
  getStockExtras,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Monthly Dividend Stocks",
  description:
    "Stocks and ETFs that pay dividends every month, ranked by yield, payout ratio and uncoverd rating. Build a monthly dividend income stream with reliable payers.",
  alternates: { canonical: "/monthly" },
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

export default async function MonthlyDividendsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  // The Stocks / ETFs chip writes ?type= back to the same URL. Default = stocks.
  // ETFs branch: filter monthly-paying symbols down to ETFs/funds only.
  const type: SecurityType =
    sp.type === "etfs" || sp.type === "active-etfs" || sp.type === "funds" ? "etfs" : "stocks";

  let allRows: StockRow[] = [];
  try {
    const symbols = await monthlyDividendSymbols();
    if (symbols.length > 0) {
      const candidates = await listStocks({
        symbols,
        minMarketCap: 250_000_000,
        limit: 2000,
        excludeEtfs: false,
      });
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
  const needsExtras = view === "growth" || view === "returns" || view === "income" || view === "income-risk" || view === "buy-reco" || view === "upside";
  const [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Monthly Dividends"
          title="Monthly Dividend Stocks"
          description="Stocks that pay dividends every month. Build a steady monthly income stream."
        />
        <ColumnTabs active={view} baseHref="/monthly" />
        <ListingToolbar
          active={type}
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-monthly-${type}.csv`}
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
          Page {page} of {totalPages} · {total.toLocaleString()} monthly dividend payers
        </p>
        <Pager
          page={page}
          totalPages={totalPages}
          baseHref={`/monthly${view !== "overview" ? `?view=${view}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

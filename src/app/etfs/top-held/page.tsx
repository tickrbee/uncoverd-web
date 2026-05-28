import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView, type RowMeta } from "@/components/dividend-table";
import {
  getMostHeldByEtfs,
  listStocks,
  getStockRatings,
  getStockExtras,
  nextDividendBySymbols,
  redactRowsForFree,
  gatedMap,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Stocks most held by ETFs",
  description: "The 500 stocks held by the most ETFs in our database. Click any ticker to see exactly which funds hold it.",
};

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const VALID_VIEWS: ColumnView[] = ["etf-coverage", "overview", "payout", "growth", "returns", "ratings"];

export default async function TopHeldPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "etf-coverage";

  // Aggregate top-500 most-held assets across all ETFs, then hydrate into
  // StockRows so the standard DividendTable can render its full column views.
  const aggregate = await getMostHeldByEtfs(500);
  const assets = aggregate.map((a) => a.asset);

  const stockRowsRaw =
    assets.length > 0
      ? await listStocks({ symbols: assets, limit: assets.length, excludeEtfs: false })
      : [];

  // Preserve the most-held ordering even though the listStocks query may
  // re-shuffle rows. Build a position map up front.
  const rank = new Map<string, number>();
  aggregate.forEach((r, i) => rank.set(r.asset, i));
  let rows: StockRow[] = stockRowsRaw
    .filter((r) => rank.has(r.symbol))
    .sort((a, b) => (rank.get(a.symbol) ?? 999) - (rank.get(b.symbol) ?? 999));

  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  let [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    getStockExtras(symbols),
  ]);

  // Build per-row meta (rank, ETF count, position value) so the etf-coverage
  // view can render the count + coverage bar + market value alongside the
  // standard stock columns.
  const maxEtfCount = aggregate.reduce((m, r) => Math.max(m, r.etf_count), 0) || 1;
  const meta = new Map<string, RowMeta>();
  aggregate.forEach((a, i) => {
    meta.set(a.asset, {
      rank: i + 1,
      etf_count: a.etf_count,
      total_market_value: a.total_market_value ?? undefined,
      max_etf_count: maxEtfCount,
    });
  });

  rows = redactRowsForFree(rows, premium.isPremium);
  ratings = gatedMap(ratings, premium.isPremium);
  upcomingDividends = gatedMap(upcomingDividends, premium.isPremium);
  extras = gatedMap(extras, premium.isPremium);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="ETF Heatmap"
          title="Stocks most held by ETFs"
          description="The 500 companies that show up in the most ETFs across our database, ordered by ETF count. Click any ticker to see exactly which funds hold it."
        />

        <ColumnTabs active={view} baseHref="/etfs/top-held" preset="etf-coverage" />

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.75rem 0" }}>
          Showing top {rows.length.toLocaleString()} stocks ranked by ETF count.
        </p>

        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          extras={extras}
          meta={meta}
          isPremium={premium.isPremium}
          view={view}
        />
      </main>
      <SiteFooter />
    </>
  );
}

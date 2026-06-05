import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView, type RowMeta } from "@/components/dividend-table";
import { RedditShareButton } from "@/components/reddit-share";
import { Pager } from "@/components/pager";
import { getMostHeldByEtfs, listStocks, type StockRow } from "@/lib/data";

export const metadata: Metadata = {
  title: "Stocks most held by ETFs",
  description: "The 500 stocks held by the most ETFs in our database. Paginated for speed; click any ticker to see exactly which funds hold it.",
  alternates: { canonical: "/etfs/top-held" },
};

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const PAGE_SIZE = 30;
const TOP_N = 500;
const VALID_VIEWS: ColumnView[] = ["etf-coverage", "overview", "payout", "growth", "returns", "ratings"];

// The top-500 aggregate is a heavy cross-table count, but it's identical for
// every visitor and every page — memoise it (hourly) instead of recomputing the
// whole thing on each request. This was the main source of the page's slowness.
const getTopHeldAggregate = unstable_cache(
  async () => getMostHeldByEtfs(TOP_N),
  ["etf-top-held-aggregate"],
  { revalidate: 3600 },
);

export default async function TopHeldPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "etf-coverage";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const aggregate = await getTopHeldAggregate();
  const totalPages = Math.max(1, Math.ceil(aggregate.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageSlice = aggregate.slice(start, start + PAGE_SIZE);
  const pageAssets = pageSlice.map((a) => a.asset);

  const stockRowsRaw =
    pageAssets.length > 0
      ? await listStocks({ symbols: pageAssets, limit: pageAssets.length, excludeEtfs: false })
      : [];

  // Preserve the most-held ordering: we sorted by aggregate position, so map
  // each asset to its rank for stable display.
  const rank = new Map<string, number>();
  pageSlice.forEach((r, i) => rank.set(r.asset, start + i + 1));
  const rows: StockRow[] = stockRowsRaw
    .filter((r) => rank.has(r.symbol))
    .sort((a, b) => (rank.get(a.symbol) ?? 999999) - (rank.get(b.symbol) ?? 999999));

  // RowMeta carries rank + ETF count + position value into the etf-coverage
  // ColumnView cells. max_etf_count is global so the bar widths compare
  // across all pages, not just the current page.
  const maxEtfCount = aggregate.reduce((m, r) => Math.max(m, r.etf_count), 0) || 1;
  const meta = new Map<string, RowMeta>();
  for (const a of pageSlice) {
    meta.set(a.asset, {
      rank: rank.get(a.asset) ?? 0,
      etf_count: a.etf_count,
      total_market_value: a.total_market_value ?? undefined,
      max_etf_count: maxEtfCount,
    });
  }

  // This is a free discovery page: identities, ETF-coverage, price and yield are
  // visible to everyone. Only the rating column is premium — revealed client-side
  // via <DividendTable revealPremium> (no server auth read, so the page stays
  // light + cacheable). That keeps it fast and "fully free except the rating".
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="ETF Heatmap"
          title="Stocks most held by ETFs"
          description="The 500 companies that show up in the most ETFs across our database, ordered by ETF count. Click any ticker to see exactly which funds hold it."
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <RedditShareButton
            title="The 500 stocks most held by ETFs (basket-exposure heatmap)"
            path="/etfs/top-held"
          />
        </div>

        <ColumnTabs active={view} baseHref="/etfs/top-held" preset="etf-coverage" />

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.75rem 0" }}>
          Page {page} of {totalPages} · top {aggregate.length.toLocaleString()} stocks ranked by ETF count.
        </p>

        <DividendTable rows={rows} meta={meta} isPremium={false} revealPremium view={view} />

        <Pager
          page={page}
          totalPages={totalPages}
          baseHref={`/etfs/top-held${view !== "etf-coverage" ? `?view=${view}` : ""}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

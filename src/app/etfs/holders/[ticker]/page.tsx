import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { EtfHolderSearch } from "@/components/etf-holder-search";
import { DividendTable, ColumnTabs, type ColumnView, type RowMeta } from "@/components/dividend-table";
import { Pager } from "@/components/pager";
import {
  getStock,
  getEtfHoldersOf,
  listStocks,
  getStockRatings,
  getStockExtras,
  nextDividendBySymbols,
  redactRowsForFree,
  gatedMap,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const PAGE_SIZE = 50;
const HOLDERS_CAP = 1000;
const VALID_VIEWS: ColumnView[] = ["etf-holders", "etf-overview", "payout", "returns"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  return {
    title: `Which ETFs own ${upper}?`,
    description: `Find every ETF that holds ${upper} — weights, AUM, expense ratios, market value of each ETF's position.`,
  };
}

export default async function EtfHoldersPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const { ticker } = await params;
  const sp = await searchParams;
  const symbol = ticker.toUpperCase();
  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "etf-holders";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const [stock, holders, premium] = await Promise.all([
    getStock(symbol),
    getEtfHoldersOf(symbol, HOLDERS_CAP),
    getPremiumStatus(),
  ]);

  const stockName = stock?.name ?? symbol;
  if (!stock && holders.length === 0) notFound();

  // Pagination over the holders list. We only fetch StockRow + ratings for
  // the page slice so per-page load stays cheap.
  const totalHolders = holders.length;
  const totalPages = Math.max(1, Math.ceil(totalHolders / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageSlice = holders.slice(start, start + PAGE_SIZE);
  const pageEtfSymbols = pageSlice.map((h) => h.etf_symbol);

  let rows: StockRow[] =
    pageEtfSymbols.length > 0
      ? await listStocks({ symbols: pageEtfSymbols, limit: pageEtfSymbols.length, excludeEtfs: false })
      : [];

  // Preserve the holders ordering (which was already sorted by weight desc).
  const rank = new Map<string, number>();
  pageSlice.forEach((h, i) => rank.set(h.etf_symbol, start + i + 1));
  rows = rows
    .filter((r) => rank.has(r.symbol))
    .sort((a, b) => (rank.get(a.symbol) ?? 999999) - (rank.get(b.symbol) ?? 999999));

  // Enrich with ratings/divs/extras so the standard column views work too.
  const etfSymbols = rows.map((r) => r.symbol);
  let [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(etfSymbols),
    nextDividendBySymbols(etfSymbols),
    getStockExtras(etfSymbols),
  ]);

  // Per-ETF meta carries weight/position/shares so the etf-holders ColumnView
  // can render them alongside the ETF's own AUM + expense ratio.
  const meta = new Map<string, RowMeta>();
  for (const h of pageSlice) {
    meta.set(h.etf_symbol, {
      rank: rank.get(h.etf_symbol),
      weight_percentage: h.weight_percentage ?? undefined,
      position_market_value: h.market_value ?? undefined,
      shares_held: h.shares_number ?? undefined,
    });
  }

  rows = redactRowsForFree(rows, premium.isPremium);
  ratings = gatedMap(ratings, premium.isPremium);
  upcomingDividends = gatedMap(upcomingDividends, premium.isPremium);
  extras = gatedMap(extras, premium.isPremium);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow={`${stockName} (${symbol})`}
          title={`Which ETFs own ${symbol}?`}
          description={`Every ETF in our database that holds ${symbol}, ranked by position weight. Compare them by AUM, expense ratio, distributions, or returns.`}
        />

        {/* Search stays visible so you can chain lookups without backing out */}
        <section className="dv-section">
          <EtfHolderSearch />
        </section>

        <ColumnTabs active={view} baseHref={`/etfs/holders/${symbol}`} preset="etf-holders" />

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.75rem 0" }}>
          {totalHolders === 0
            ? `We have no recorded ETF holdings of ${symbol}. The ETF holdings refresh weekly; small or international stocks may be under-covered.`
            : `Page ${page} of ${totalPages} · ${totalHolders.toLocaleString()} ETFs hold ${symbol}.`}
        </p>

        {totalHolders > 0 && (
          <>
            <DividendTable
              rows={rows}
              ratings={ratings}
              upcomingDividends={upcomingDividends}
              extras={extras}
              meta={meta}
              isPremium={premium.isPremium}
              view={view}
            />

            <Pager
              page={page}
              totalPages={totalPages}
              baseHref={`/etfs/holders/${symbol}${view !== "etf-holders" ? `?view=${view}` : ""}`}
            />
          </>
        )}

        {stock && (
          <p style={{ marginTop: "1.5rem" }}>
            <Link href={`/stocks/${symbol}`} className="dv-action-link">
              ← Back to {symbol}
            </Link>
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

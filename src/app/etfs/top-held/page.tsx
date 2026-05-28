import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import {
  getMostHeldByEtfs,
  listStocks,
  getStockRatings,
  getStockExtras,
  nextDividendBySymbols,
  redactRowsForFree,
  gatedMap,
  formatCurrency,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";
import { EtfHolderSearch } from "@/components/etf-holder-search";

export const metadata: Metadata = {
  title: "Stocks most held by ETFs",
  description: "Search which ETFs own a given stock, plus the heatmap of stocks most held across all ETFs.",
};

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export default async function TopHeldPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  // Aggregate top-500 most-held assets across all ETFs.
  const aggregate = await getMostHeldByEtfs(500);

  // Hydrate each asset into a full StockRow so the standard DividendTable
  // works (Overview / Payout / Div Growth / Returns / Ratings tabs).
  const assets = aggregate.map((a) => a.asset);
  const stockRowsRaw = assets.length > 0 ? await listStocks({ symbols: assets, limit: assets.length, excludeEtfs: false }) : [];

  // Preserve the most-held ordering even though the listStocks query may
  // re-shuffle rows. Build a position map up front.
  const rank = new Map<string, number>();
  aggregate.forEach((r, i) => rank.set(r.asset, i));
  let rows: StockRow[] = stockRowsRaw
    .filter((r) => rank.has(r.symbol))
    .sort((a, b) => (rank.get(a.symbol) ?? 999) - (rank.get(b.symbol) ?? 999));

  // ETF-coverage stats live on the aggregate; surface them as an inline column
  // by stashing them in a side map keyed by symbol.
  const etfCountBySymbol = new Map<string, { count: number; mv: number | null }>();
  for (const a of aggregate) etfCountBySymbol.set(a.asset, { count: a.etf_count, mv: a.total_market_value });

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
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="ETF Heatmap"
          title="Stocks most held by ETFs"
          description="Which companies show up in the most ETFs — basket exposure and crowding signals. Search any ticker or company below to see exactly which funds hold it."
        />

        <section className="dv-section">
          <EtfHolderSearch />
        </section>

        <ColumnTabs active={view} baseHref="/etfs/top-held" />

        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "1rem 0" }}>
          Top {aggregate.length.toLocaleString()} most-held stocks across our ETF universe.
        </p>

        {/* Coverage bar visualization */}
        {aggregate.length > 0 && (
          <div className="dv-table-wrap" style={{ marginBottom: "1.25rem" }}>
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Stock</th>
                    <th className="dv-th--num">ETFs holding it</th>
                    <th>Coverage</th>
                    <th className="dv-th--num">Total position value</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const maxCount = aggregate.reduce((m, r) => Math.max(m, r.etf_count), 0) || 1;
                    return aggregate.slice(0, 50).map((r, i) => {
                      const pct = (r.etf_count / maxCount) * 100;
                      return (
                        <tr key={r.asset}>
                          <td>{i + 1}</td>
                          <td>
                            <Link href={`/etfs/holders/${r.asset}`} className="dv-ticker">
                              <span className="dv-ticker__name">{r.asset}</span>
                              <span className="dv-ticker__meta">{r.asset_name ?? ""}</span>
                            </Link>
                          </td>
                          <td className="dv-td--num">{r.etf_count.toLocaleString()}</td>
                          <td style={{ minWidth: 220 }}>
                            <div
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                height: 10,
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background:
                                    "linear-gradient(90deg, #064e3b 0%, #34d399 100%)",
                                }}
                              />
                            </div>
                          </td>
                          <td className="dv-td--num">
                            {r.total_market_value != null
                              ? formatCurrency(r.total_market_value, { abbreviate: true })
                              : "—"}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>
              Top 50 heatmap shown above. Full {aggregate.length}-row table with standard
              dividend columns is below.
            </p>
          </div>
        )}

        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          extras={extras}
          isPremium={premium.isPremium}
          view={view}
        />

        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Sourced from ETF holdings data (refreshed weekly). Click any ticker to see exactly
          which ETFs hold it.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

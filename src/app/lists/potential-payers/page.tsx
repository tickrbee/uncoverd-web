import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView, type RowMeta } from "@/components/dividend-table";
import {
  getPotentialDividendPayers,
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
  title: "Stocks that could start paying dividends",
  description: "Profitable, cash-generative US companies that don't yet pay a dividend — ranked by how ready they look to start.",
};

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const VALID_VIEWS: ColumnView[] = ["future-payers", "overview", "returns", "ratings"];

export default async function PotentialPayersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "future-payers";

  // Pull the ranked list of candidates (FCF-margin-sorted), then hydrate each
  // into a full StockRow so the standard column views (Overview / Returns /
  // Ratings) actually populate.
  const candidates = await getPotentialDividendPayers(120);
  const symbols = candidates.map((c) => c.symbol);
  const stockRowsRaw =
    symbols.length > 0
      ? await listStocks({ symbols, limit: symbols.length, excludeEtfs: false })
      : [];

  // Preserve the ranked order from the SQL function regardless of how
  // listStocks shuffles results.
  const rank = new Map<string, number>();
  candidates.forEach((c, i) => rank.set(c.symbol, i + 1));
  let rows: StockRow[] = stockRowsRaw
    .filter((r) => rank.has(r.symbol))
    .sort((a, b) => (rank.get(a.symbol) ?? 999999) - (rank.get(b.symbol) ?? 999999));

  const premium = await getPremiumStatus();
  const enrichSymbols = rows.map((r) => r.symbol);
  let [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(enrichSymbols),
    nextDividendBySymbols(enrichSymbols),
    getStockExtras(enrichSymbols),
  ]);

  // RowMeta carries the rank + financials snapshot used by the future-payers
  // ColumnView (rank, net income, free cash flow, FCF margin).
  const meta = new Map<string, RowMeta>();
  for (const c of candidates) {
    meta.set(c.symbol, {
      rank: rank.get(c.symbol),
      net_income: c.net_income ?? undefined,
      free_cash_flow: c.free_cash_flow ?? undefined,
      fcf_margin: c.fcf_margin ?? undefined,
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
          eyebrow="Future Income"
          title="Stocks that could start paying dividends"
          description="Profitable, cash-generative US companies that don't yet distribute. Ranked by free-cash-flow margin — a proxy for how comfortably they could initiate."
          meta="Filters: market cap > $500M · net income > 0 · free cash flow > 0 · currently last_div = 0."
        />

        <ColumnTabs active={view} baseHref="/lists/potential-payers" preset="future-payers" />

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.75rem 0" }}>
          {rows.length === 0
            ? "No candidates surfaced. The latest annual financials may not be loaded yet — re-run the financials refresh and try again."
            : `${rows.length.toLocaleString()} candidates ranked by free-cash-flow margin.`}
        </p>

        {rows.length > 0 && (
          <DividendTable
            rows={rows}
            ratings={ratings}
            upcomingDividends={upcomingDividends}
            extras={extras}
            meta={meta}
            isPremium={premium.isPremium}
            view={view}
          />
        )}

        <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
          This is a screening list, not a prediction. Initiating a dividend is a board decision
          that depends on management policy, leverage, growth runway and capital-allocation
          priorities — none of which are captured here. See our{" "}
          <Link href="/legal/disclaimer" className="dv-action-link">Investment Disclaimer</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

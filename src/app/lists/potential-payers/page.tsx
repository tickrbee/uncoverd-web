import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView, type RowMeta } from "@/components/dividend-table";
import { Pager } from "@/components/pager";
import { RedditShareButton } from "@/components/reddit-share";
import {
  getPotentialDividendPayers,
  listStocks,
  type StockRow,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Stocks that could start paying dividends",
  description: "Profitable, cash-generative US companies that don't yet pay a dividend — ranked by how ready they look to start.",
  alternates: { canonical: "/lists/potential-payers" },
};

// No auth/cookie reads here anymore (premium is revealed client-side), so the
// page is CDN-cacheable via ISR instead of force-dynamic.
export const revalidate = 3600;

const PAGE_SIZE = 30;
const TOTAL_CANDIDATES = 300;
const VALID_VIEWS: ColumnView[] = ["future-payers", "returns", "ratings"];

export default async function PotentialPayersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "future-payers";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  // Pull the full ranked list of candidates once so totalPages is stable, but
  // only enrich the page slice with StockRows + ratings + extras. That keeps
  // per-page render fast even at TOTAL_CANDIDATES=300.
  const candidates = await getPotentialDividendPayers(TOTAL_CANDIDATES);
  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageSlice = candidates.slice(start, start + PAGE_SIZE);

  const symbols = pageSlice.map((c) => c.symbol);
  const stockRowsRaw =
    symbols.length > 0
      ? await listStocks({ symbols, limit: symbols.length, excludeEtfs: false })
      : [];

  // Preserve the ranked order from the SQL function regardless of how
  // listStocks shuffles results.
  const rank = new Map<string, number>();
  pageSlice.forEach((c, i) => rank.set(c.symbol, start + i + 1));
  let rows: StockRow[] = stockRowsRaw
    .filter((r) => rank.has(r.symbol))
    .sort((a, b) => (rank.get(a.symbol) ?? 999999) - (rank.get(b.symbol) ?? 999999));

  // RowMeta carries the rank + financials snapshot used by the future-payers
  // ColumnView (rank, net income, free cash flow, FCF margin). These are free.
  // Ratings/returns columns reveal client-side via <DividendTable revealPremium>.
  const meta = new Map<string, RowMeta>();
  for (const c of pageSlice) {
    meta.set(c.symbol, {
      rank: rank.get(c.symbol),
      net_income: c.net_income ?? undefined,
      free_cash_flow: c.free_cash_flow ?? undefined,
      fcf_margin: c.fcf_margin ?? undefined,
    });
  }

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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <RedditShareButton
            title={`${candidates.length} profitable US companies that could start paying dividends`}
            path="/lists/potential-payers"
          />
        </div>

        <ColumnTabs active={view} baseHref="/lists/potential-payers" preset="future-payers" />

        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.75rem 0" }}>
          {candidates.length === 0
            ? "No candidates surfaced. The latest annual financials may not be loaded yet — re-run the financials refresh and try again."
            : `Page ${page} of ${totalPages} · ${candidates.length.toLocaleString()} candidates ranked by free-cash-flow margin.`}
        </p>

        {rows.length > 0 && (
          <>
            <DividendTable rows={rows} meta={meta} isPremium={false} revealPremium view={view} />
            <Pager
              page={page}
              totalPages={totalPages}
              baseHref={`/lists/potential-payers${view !== "future-payers" ? `?view=${view}` : ""}`}
            />
          </>
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

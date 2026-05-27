import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { createClient } from "@/lib/supabase/server";
import {
  listWatchlistSymbols,
  listStocks,
  getStockRatings,
  nextDividendBySymbols,
  type StockRow,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "My Dividend Watchlist",
};

export const dynamic = "force-dynamic";

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="dv-page">
          <PageHeader
            eyebrow="Watchlist"
            title="My Dividend Watchlist"
            description="Track and compare your favorite dividend stocks in one place."
          />
          <div className="dv-empty" style={{ padding: "2.5rem" }}>
            <p style={{ marginBottom: "1rem" }}>
              <Link href="/login?next=%2Fwatchlist" className="btn">
                Log in to see your watchlist
              </Link>
            </p>
            <p style={{ color: "var(--text-muted)" }}>
              Once you&apos;re logged in, you can add any stock with the + button on the right of every row.
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const symbols = await listWatchlistSymbols(user.id);
  const symbolList = Array.from(symbols);

  let rows: StockRow[] = [];
  if (symbolList.length > 0) {
    rows = await listStocks({ symbols: symbolList, limit: 500, excludeEtfs: false });
  }

  const [ratings, upcomingDividends] = await Promise.all([
    getStockRatings(rows.map((r) => r.symbol)),
    nextDividendBySymbols(rows.map((r) => r.symbol)),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Watchlist"
          title="My Dividend Watchlist"
          description={`${symbolList.length} symbol${symbolList.length === 1 ? "" : "s"} on your watchlist.`}
        />
        {rows.length === 0 ? (
          <div className="dv-empty" style={{ padding: "2.5rem" }}>
            <p>Your watchlist is empty.</p>
            <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Browse the <Link href="/screener" style={{ color: "#93c5fd" }}>screener</Link> or any sector / industry
              page, then click the + button on the right of any row to start tracking.
            </p>
          </div>
        ) : (
          <>
            <ColumnTabs active={view} baseHref="/watchlist" />
            <DividendTable
              rows={rows}
              ratings={ratings}
              upcomingDividends={upcomingDividends}
              isPremium={true}
              view={view}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

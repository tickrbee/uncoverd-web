import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PremiumGate } from "@/components/premium-gate";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import {
  staggeredQuarterlyPortfolio,
  getStockRatings,
  nextDividendBySymbols,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Monthly Income from Quarterly Dividends",
  description: "A staggered portfolio of quarterly dividend payers that delivers income every month.",
};

export const dynamic = "force-dynamic";

const VALID_VIEWS: ColumnView[] = [
  "overview",
  "payout",
  "growth",
  "returns",
  "ratings",
  "buy-reco",
  "upside",
];

export default async function StaggeredPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  let rows: StockRow[] = [];
  try {
    rows = await staggeredQuarterlyPortfolio(24);
  } catch (e) {
    console.error(e);
  }
  const premium = await getPremiumStatus();
  const [ratings, upcomingDividends] = await Promise.all([
    getStockRatings(rows.map((r) => r.symbol)),
    nextDividendBySymbols(rows.map((r) => r.symbol)),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Monthly Income"
          title="Monthly Payments from Quarterly Dividends"
          description="Quarterly dividend payers split into 3 month buckets — buy across all 3 buckets and you receive a dividend every month of the year."
        />
        <PremiumGate
          title="Quarterly-staggered portfolio — Premium"
          description="Premium subscribers see the full 24-name staggered allocation, ranked by uncoverd composite rating."
        >
          <ColumnTabs active={view} baseHref="/monthly/staggered" />
          <ListingToolbar
            active="stocks"
            rows={rows}
            isPremium={premium.isPremium}
            csvFilename="uncoverd-monthly-staggered.csv"
            hideSecurityType
          />
          {rows.length === 0 ? (
            <div className="dv-empty">No staggered candidates available — backend.dividends may be backfilling.</div>
          ) : (
            <DividendTable
              rows={rows}
              ratings={ratings}
              upcomingDividends={upcomingDividends}
              isPremium={premium.isPremium}
              view={view}
            />
          )}
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Computed live from upcoming ex-dividend dates — split into 3 monthly buckets so the combined portfolio pays
            out every month.
          </p>
        </PremiumGate>
      </main>
      <SiteFooter />
    </>
  );
}

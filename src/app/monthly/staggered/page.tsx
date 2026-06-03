import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import { redactRowsForFree, type StockRow } from "@/lib/data";
import { buildStaggeredRows } from "@/lib/picks";

export const metadata: Metadata = {
  title: "Monthly Income from Quarterly Dividends",
  description: "A staggered portfolio of quarterly dividend payers that delivers income every month.",
};

// No server auth read (ratings reveal client-side, CSV gate is client-side),
// so ISR is fine instead of force-dynamic.
export const revalidate = 3600;

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

  // Premium portfolio: render the identity-scrubbed free version with no server
  // auth read; paying users reveal the real rows client-side via the endpoint.
  let realRows: StockRow[] = [];
  try {
    realRows = await buildStaggeredRows(24);
  } catch (e) {
    console.error(e);
  }
  const rows = redactRowsForFree(realRows, false);
  const revealEndpoint = "/api/picks/premium?list=staggered";

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Monthly Income"
          title="Monthly Payments from Quarterly Dividends"
          description="Quarterly dividend payers split into 3 month buckets — buy across all 3 buckets and you receive a dividend every month of the year."
        />
        <ColumnTabs active={view} baseHref="/monthly/staggered" />
        <ListingToolbar
          active="stocks"
          rows={rows}
          csvFilename="uncoverd-monthly-staggered.csv"
          hideSecurityType
          revealRowsEndpoint={revealEndpoint}
        />
        {rows.length === 0 ? (
          <div className="dv-empty">No staggered candidates available — backend.dividends may be backfilling.</div>
        ) : (
          <DividendTable
            rows={rows}
            isPremium={false}
            revealPremium
            revealRowsEndpoint={revealEndpoint}
            view={view}
          />
        )}
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Computed live from upcoming ex-dividend dates — split into 3 monthly buckets so the combined portfolio pays
          out every month.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import {
  targetDatePortfolio,
  getStockRatings,
  nextDividendBySymbols,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

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

const VALID = ["2025", "2030", "2035", "2040", "2045", "2050", "2055", "2060"];

export async function generateStaticParams() {
  return VALID.map((year) => ({ year }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Target-Date ${year} Dividend Portfolio`,
    description: `A dividend-focused target-date allocation for investors retiring around ${year}.`,
  };
}

export default async function TargetDatePage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { year } = await params;
  const sp = await searchParams;
  if (!VALID.includes(year)) notFound();
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  let rows: StockRow[] = [];
  try {
    rows = await targetDatePortfolio(parseInt(year, 10), 25);
  } catch (e) {
    console.error(e);
  }
  const premium = await getPremiumStatus();
  const [ratings, upcomingDividends] = await Promise.all([
    getStockRatings(rows.map((r) => r.symbol)),
    nextDividendBySymbols(rows.map((r) => r.symbol)),
  ]);

  const nowYear = new Date().getFullYear();
  const diff = parseInt(year, 10) - nowYear;
  const horizon = diff <= 10 ? "near-term (yield + safety)" : diff <= 25 ? "mid-term (balanced)" : "long-term (growth tilt)";

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Target-Date"
          title={`Target-Date ${year}`}
          description={`A dividend-focused allocation calibrated for investors retiring around ${year} — ${horizon}.`}
        />
        <ColumnTabs active={view} baseHref={`/retire/target-date/${year}`} />
        <ListingToolbar
          active="stocks"
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-target-${year}.csv`}
          hideSecurityType
        />
        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          isPremium={premium.isPremium}
          view={view}
        />
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Computed live: large-cap US dividend payers screened by yield + market-cap bands appropriate to a {year}
          retirement, ranked by composite rating.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

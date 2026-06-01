import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import {
  allocationPortfolio,
  getStockRatings,
  nextDividendBySymbols,
  redactRowsForFree,
  gatedMap,
  type AllocationKind,
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

const ALLOCATIONS: Record<AllocationKind, { label: string; description: string }> = {
  income: {
    label: "Income Allocation",
    description: "Maximum current income — high-yield US dividend payers ≥4% yield, sorted by yield, ranked by quality.",
  },
  balanced: {
    label: "Balanced Allocation",
    description: "A 60/40-style mix of mid-yield large-cap dividend stocks ranked by composite rating.",
  },
  conservative: {
    label: "Conservative Allocation",
    description: "Stable blue-chip dividend payers (≥$50B mkt cap, 1.5%+ yield) with strong fundamentals.",
  },
  tactical: {
    label: "Tactical Allocation",
    description: "Tactical positions — large-cap US, no dividend floor, momentum-leaning.",
  },
  us: {
    label: "US Allocation",
    description: "U.S. dividend-paying large- and mid-caps.",
  },
  international: {
    label: "International Allocation",
    description: "International dividend-paying stocks (excluding US).",
  },
};

export async function generateStaticParams() {
  return Object.keys(ALLOCATIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = ALLOCATIONS[slug as AllocationKind];
  if (!a) return { title: "Allocation Funds" };
  return { title: a.label, description: a.description };
}

export default async function AllocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const a = ALLOCATIONS[slug as AllocationKind];
  if (!a) notFound();
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  let rows: StockRow[] = [];
  try {
    rows = await allocationPortfolio(slug as AllocationKind, 25);
  } catch (e) {
    console.error(e);
  }
  const premium = await getPremiumStatus();
  const [ratings, upcomingDividends] = await Promise.all([
    getStockRatings(rows.map((r) => r.symbol)),
    nextDividendBySymbols(rows.map((r) => r.symbol)),
  ]);
  // Gate premium data server-side (keeps the blurred-placeholder funnel).
  rows = redactRowsForFree(rows, premium.isPremium);
  const safeRatings = gatedMap(ratings, premium.isPremium);
  const safeUpcoming = gatedMap(upcomingDividends, premium.isPremium);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="Allocation Fund" title={a.label} description={a.description} />
        <ColumnTabs active={view} baseHref={`/retire/allocation/${slug}`} />
        <ListingToolbar
          active="stocks"
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-allocation-${slug}.csv`}
          hideSecurityType
        />
        {rows.length === 0 ? (
          <div className="dv-empty">List is being assembled. Check back soon.</div>
        ) : (
          <DividendTable
            rows={rows}
            ratings={safeRatings}
            upcomingDividends={safeUpcoming}
            isPremium={premium.isPremium}
            view={view}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

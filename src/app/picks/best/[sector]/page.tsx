import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PremiumGate } from "@/components/premium-gate";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];
import {
  listStocks,
  rankByDimension,
  getStockRatings,
  SECTOR_SLUG_MAP,
  SECTOR_LABEL_MAP,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const revalidate = 3600;

export async function generateStaticParams() {
  return Object.keys(SECTOR_SLUG_MAP).map((sector) => ({ sector }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector } = await params;
  const fmpSector = SECTOR_SLUG_MAP[sector];
  if (!fmpSector) return { title: "Best Sector Picks" };
  const label = SECTOR_LABEL_MAP[fmpSector] || fmpSector;
  return { title: `Best ${label} Dividend Stocks`, description: `Top dividend picks in ${label}.` };
}

export default async function BestSectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ sector: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { sector } = await params;
  const sp = await searchParams;
  const fmpSector = SECTOR_SLUG_MAP[sector];
  if (!fmpSector) notFound();
  const label = SECTOR_LABEL_MAP[fmpSector] || fmpSector;
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  let rows: StockRow[] = [];
  try {
    // Pull a wider candidate pool of dividend-paying stocks in the sector,
    // then rank by composite rating to surface the *best* — not just biggest.
    const all = await listStocks({
      sector: fmpSector,
      minDividend: 0.1,
      minMarketCap: 500_000_000,
      minYieldPct: 1,
      limit: 500,
    });
    rows = (await rankByDimension(all, "composite")).slice(0, 15);
  } catch (e) {
    console.error(e);
  }

  const premium = await getPremiumStatus();
  const ratings = await getStockRatings(rows.map((r) => r.symbol));

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Best Sector Picks"
          title={`Best ${label} Dividend Stocks`}
          description={`Top dividend picks within ${label.toLowerCase()}, ranked by uncoverd composite rating (then market cap).`}
        />
        <PremiumGate
          title={`Best ${label} — Premium`}
          description="Best-of-sector lists are part of the Premium dividend research suite."
        >
          <ColumnTabs active={view} baseHref={`/picks/best/${sector}`} />
          <ListingToolbar
            active="stocks"
            rows={rows}
            isPremium={premium.isPremium}
            csvFilename={`uncoverd-best-${sector}.csv`}
            hideSecurityType
          />
          <DividendTable rows={rows} ratings={ratings} isPremium={premium.isPremium} view={view} />
        </PremiumGate>
      </main>
      <SiteFooter />
    </>
  );
}

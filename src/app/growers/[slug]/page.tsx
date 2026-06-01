import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import { Pager } from "@/components/pager";
import {
  listGrowersWithStocks,
  getStockRatings,
  nextDividendBySymbols,
  getStockExtras,
  redactRowsForFree,
  gatedMap,
  type GrowerSlug,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";
import { metaDescription } from "@/lib/seo";

const PAGE_SIZE = 100;

export const revalidate = 3600;

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

const GROWER_INFO: Record<GrowerSlug, { label: string; description: string }> = {
  aristocrats: {
    label: "Dividend Aristocrats",
    description: "S&P 500 companies that have raised dividends for 25+ consecutive years.",
  },
  kings: {
    label: "Dividend Kings",
    description: "Companies that have raised dividends for 50+ consecutive years.",
  },
  champions: {
    label: "Dividend Champions",
    description: "Companies with 25+ years of consecutive dividend increases.",
  },
  contenders: {
    label: "Dividend Contenders",
    description: "Companies with 10–24 years of consecutive dividend increases.",
  },
  challengers: {
    label: "Dividend Challengers",
    description: "Companies with 5–9 years of consecutive dividend increases.",
  },
  achievers: {
    label: "Dividend Achievers",
    description: "Companies that have raised dividends for 10+ consecutive years.",
  },
};

export async function generateStaticParams() {
  return (Object.keys(GROWER_INFO) as GrowerSlug[]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const info = GROWER_INFO[slug as GrowerSlug];
  if (!info) return { title: "Dividend Growers" };
  return {
    title: info.label,
    description: metaDescription(
      `${info.description} See the full ${info.label} list with current yields, payout ratios and uncoverd ratings.`
    ),
    alternates: { canonical: `/growers/${slug}` },
  };
}

export default async function GrowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const info = GROWER_INFO[slug as GrowerSlug];
  if (!info) notFound();
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  let allRows: StockRow[] = [];
  try {
    allRows = await listGrowersWithStocks(slug as GrowerSlug);
  } catch (e) {
    console.error(e);
  }
  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const rows = allRows.slice(offset, offset + PAGE_SIZE);

  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  const needsExtras = view === "growth" || view === "returns" || view === "income" || view === "income-risk" || view === "buy-reco" || view === "upside";
  const [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    needsExtras ? getStockExtras(symbols) : Promise.resolve(new Map()),
  ]);

  // Gate premium data server-side (keeps the blurred-placeholder funnel).
  const isPrem = premium.isPremium;
  const safeRows = redactRowsForFree(rows, isPrem);
  const safeRatings = gatedMap(ratings, isPrem);
  const safeExtras = gatedMap(extras, isPrem);
  const safeUpcoming = gatedMap(upcomingDividends, isPrem);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="Dividend Growers" title={info.label} description={info.description} />
        <ColumnTabs active={view} baseHref={`/growers/${slug}`} />
        <ListingToolbar
          active="stocks"
          rows={safeRows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-${slug}.csv`}
          hideSecurityType
        />
        {safeRows.length === 0 ? (
          <div className="dv-empty">List is being assembled. Check back soon.</div>
        ) : (
          <>
            <DividendTable
              rows={safeRows}
              ratings={safeRatings}
              upcomingDividends={safeUpcoming}
              extras={safeExtras}
              isPremium={premium.isPremium}
              view={view}
            />
            <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Page {page} of {totalPages} · {total.toLocaleString()} stocks
            </p>
            <Pager
              page={page}
              totalPages={totalPages}
              baseHref={`/growers/${slug}${view !== "overview" ? `?view=${view}` : ""}`}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

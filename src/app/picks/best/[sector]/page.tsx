import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import { breadcrumbList, faqJsonLd, jsonLdScript } from "@/lib/structured-data";

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];
import {
  redactRowsForFree,
  SECTOR_SLUG_MAP,
  SECTOR_LABEL_MAP,
  type StockRow,
} from "@/lib/data";
import { buildBestSectorRows } from "@/lib/picks";

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
  const year = new Date().getFullYear();
  return {
    title: `Best ${label} Dividend Stocks ${year} — Yield, Growth & Safety`,
    description: `The best ${label.toLowerCase()} dividend stocks for ${year}, ranked by uncoverd's composite rating. Top high-yield, dividend growth, and dividend safety picks in ${label.toLowerCase()}, updated weekly.`,
    alternates: { canonical: `/picks/best/${sector}` },
    openGraph: {
      title: `Best ${label} Dividend Stocks ${year}`,
      description: `Top dividend picks in ${label}, ranked by uncoverd's composite rating.`,
      type: "website",
      url: `/picks/best/${sector}`,
    },
  };
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

  // Premium best-of-sector list: render the identity-scrubbed free version with
  // no server auth read (so the page prerenders); paying users reveal the real
  // rows client-side via the rows endpoint.
  let realRows: StockRow[] = [];
  try {
    realRows = await buildBestSectorRows(sector);
  } catch (e) {
    console.error(e);
  }
  const rows = redactRowsForFree(realRows, false);
  const revealEndpoint = `/api/picks/premium?list=best-sector&sector=${encodeURIComponent(sector)}`;

  const year = new Date().getFullYear();
  const breadcrumbs = breadcrumbList([
    { name: "Home", url: "/" },
    { name: "Lists", url: "/picks/best-dividend-stocks" },
    { name: `Best ${label}`, url: `/picks/best/${sector}` },
  ]);
  const faqs = [
    {
      q: `What are the best ${label.toLowerCase()} dividend stocks for ${year}?`,
      a: `The list above ranks ${label.toLowerCase()} dividend payers by uncoverd's 5-pillar composite rating (Value, Growth, Profitability, Momentum, Health), then market cap. We require a market-cap floor of $500M and a minimum dividend payment so the list surfaces investable, liquid names.`,
    },
    {
      q: `How often is the ${label.toLowerCase()} dividend list updated?`,
      a: `Ratings recompute daily after market data refreshes; this list re-ranks automatically. Underlying financials refresh nightly from SEC filings.`,
    },
    {
      q: `Is this an investment recommendation?`,
      a: `No. uncoverd produces independent research and rankings — not personalized investment advice. See our Investment Disclaimer.`,
    },
  ];
  const faqSchema = faqJsonLd(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }}
        />
      )}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow={`Best ${label} Dividend Stocks ${year}`}
          title={`Best ${label} Dividend Stocks for ${year}`}
          description={`Top dividend picks within ${label.toLowerCase()}, ranked by uncoverd's composite rating (Value, Growth, Profitability, Momentum, Health) then market cap. Filters: $500M+ market cap, dividend payer.`}
        />
        <ColumnTabs active={view} baseHref={`/picks/best/${sector}`} />
        <ListingToolbar
          active="stocks"
          rows={rows}
          csvFilename={`uncoverd-best-${sector}.csv`}
          hideSecurityType
          revealRowsEndpoint={revealEndpoint}
        />
        <DividendTable
          rows={rows}
          isPremium={false}
          revealPremium
          revealRowsEndpoint={revealEndpoint}
          view={view}
        />

        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <h2 className="dv-section__title">FAQ — best {label.toLowerCase()} dividend stocks</h2>
          <div className="dv-faq-list">
            {faqs.map((qa, i) => (
              <details key={i} className="dv-faq-item">
                <summary>{qa.q}</summary>
                <p>{qa.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

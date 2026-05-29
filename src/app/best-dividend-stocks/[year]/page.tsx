import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import {
  listStocks,
  rankByDimension,
  getStockRatings,
  getStockExtras,
  nextDividendBySymbols,
  redactRowsForFree,
  gatedMap,
  type StockRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";
import { breadcrumbList, faqJsonLd, jsonLdScript } from "@/lib/structured-data";

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

const CURRENT_YEAR = new Date().getFullYear();

// Generate the static set of year params so each year page pre-renders.
export async function generateStaticParams() {
  return [CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({ year: String(y) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  const y = parseInt(year, 10);
  if (!isFinite(y)) return { title: "Best Dividend Stocks" };
  return {
    title: `Best Dividend Stocks ${y} — Top Yields, Growth & Safety`,
    description: `The best dividend stocks for ${y}, ranked by uncoverd's composite rating. Top high-yield, dividend growth, and dividend safety picks updated weekly.`,
    alternates: { canonical: `/best-dividend-stocks/${y}` },
  };
}

export default async function BestDividendStocksYearPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { year } = await params;
  const sp = await searchParams;
  const y = parseInt(year, 10);
  if (!isFinite(y) || y < CURRENT_YEAR - 1 || y > CURRENT_YEAR + 5) notFound();

  const view: ColumnView =
    sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";

  let rows: StockRow[] = [];
  try {
    const all = await listStocks({
      minDividend: 1,
      minMarketCap: 5_000_000_000,
      minYieldPct: 1.5,
      requireUpcomingDividend: true,
      limit: 500,
    });
    const filtered = all.filter(
      (r) => (r.dividend_yield ?? 0) >= 2 && (r.dividend_yield ?? 0) <= 6,
    );
    rows = await rankByDimension(filtered, "composite");
    rows = rows.slice(0, 30);
  } catch (e) {
    console.error(e);
  }

  const premium = await getPremiumStatus();
  const symbols = rows.map((r) => r.symbol);
  let [ratings, upcomingDividends, extras] = await Promise.all([
    getStockRatings(symbols),
    nextDividendBySymbols(symbols),
    getStockExtras(symbols),
  ]);
  rows = redactRowsForFree(rows, premium.isPremium);
  ratings = gatedMap(ratings, premium.isPremium);
  upcomingDividends = gatedMap(upcomingDividends, premium.isPremium);
  extras = gatedMap(extras, premium.isPremium);

  const breadcrumbs = breadcrumbList([
    { name: "Home", url: "/" },
    { name: "Best Dividend Stocks", url: "/best-dividend-stocks" },
    { name: String(y), url: `/best-dividend-stocks/${y}` },
  ]);
  const faqs = [
    {
      q: `What are the best dividend stocks for ${y}?`,
      a: `The 30 names above are ranked by uncoverd's composite rating — a 5-pillar score combining Value, Growth, Profitability, Momentum, and Health. Filters applied: market cap above $5B, forward yield 2-6%, and a confirmed upcoming ex-dividend date.`,
    },
    {
      q: `How often is this list refreshed?`,
      a: `Rating components recompute daily after market data refreshes; the list above re-ranks automatically with no manual editorial step.`,
    },
    {
      q: `Is this list investment advice?`,
      a: `No. uncoverd produces independent research and rankings; you should consult a licensed financial professional and do your own due diligence before investing.`,
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
          eyebrow={`Best Dividend Stocks ${y}`}
          title={`Best Dividend Stocks for ${y}`}
          description={`30 large-cap dividend stocks with the strongest composite ratings going into ${y}. Filters: $5B+ market cap, 2-6% forward yield, upcoming ex-dividend date confirmed.`}
          meta={`Updated automatically as ratings recompute. As of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`}
        />

        <ColumnTabs active={view} baseHref={`/best-dividend-stocks/${y}`} />

        <DividendTable
          rows={rows}
          ratings={ratings}
          upcomingDividends={upcomingDividends}
          extras={extras}
          isPremium={premium.isPremium}
          view={view}
        />

        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <h2 className="dv-section__title">FAQ</h2>
          <div className="dv-faq-list">
            {faqs.map((qa, i) => (
              <details key={i} className="dv-faq-item">
                <summary>{qa.q}</summary>
                <p>{qa.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p style={{ marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Looking for a specific theme? See{" "}
          <Link href="/picks/best-high-yield" className="dv-action-link">Best High Yield</Link>,{" "}
          <Link href="/picks/best-dividend-growth" className="dv-action-link">Best Dividend Growth</Link>,{" "}
          <Link href="/picks/best-dividend-protection" className="dv-action-link">Best Dividend Protection</Link>,{" "}
          <Link href="/picks/best-monthly-dividend" className="dv-action-link">Best Monthly Dividends</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingPriceChart } from "@/components/listing-price-chart";
import { ListingSwitcher } from "@/components/listing-switcher";
import { FinancialsSection } from "@/components/financials-section";
import { FinancialsTab } from "@/components/financials-tab";
import { Stat } from "@/components/stat";
import {
  StockDetailTabs,
  type TabDef,
  type StockPremiumProps,
} from "@/components/stock-detail-tabs";
import {
  breadcrumbList,
  stockJsonLd,
  dividendFaqs,
  faqJsonLd,
  jsonLdScript,
} from "@/lib/structured-data";
import {
  getStock,
  getCompanyListings,
  dividendHistoryBySymbol,
  newsForSymbol,
  historicalPrices,
  incomeStatementAnnual,
  incomeStatementQuarterly,
  balanceSheetAnnual,
  balanceSheetQuarterly,
  cashFlowAnnual,
  cashFlowQuarterly,
  ratiosLatest,
  getPeerStocksInSector,
  getTopEtfHoldersPreview,
  formatCurrency,
  formatPercent,
  formatDate,
} from "@/lib/data";
import { pickTitle, metaDescription } from "@/lib/seo";
import { isFundSymbol } from "@/lib/format";
import { unstable_cache } from "next/cache";

// ISR + statically cacheable: this page reads no per-request cookies (auth/
// premium moved client-side), so Vercel's CDN serves it to everyone — bots and
// logged-out visitors get instant cached HTML, eliminating the force-dynamic
// "never cached" problem that was driving Googlebot re-crawls and serverless
// cost. Premium data is fetched client-side via /api/stocks/premium and never
// enters the cached HTML. The heavy DB reads are still memoised below.
export const revalidate = 600;
export const dynamicParams = true;

// Prerender none at build (65k tickers), but exporting generateStaticParams is
// what flips this dynamic-param route into ISR mode: on-demand renders are then
// cached + revalidated (s-maxage) instead of served no-store on every request.
export function generateStaticParams() {
  return [];
}

const getStockCore = unstable_cache(
  async (symbol: string) => {
    const [
      stock,
      dividends,
      news,
      prices,
      incomeAnnual,
      incomeQuarterly,
      balanceAnnual,
      balanceQuarterly,
      cashFlowAnnualRows,
      cashFlowQuarterlyRows,
      ratios,
    ] = await Promise.all([
      getStock(symbol),
      dividendHistoryBySymbol(symbol, 40),
      newsForSymbol(symbol, 12),
      historicalPrices(symbol, 365 * 10),
      incomeStatementAnnual(symbol, 5),
      incomeStatementQuarterly(symbol, 8),
      balanceSheetAnnual(symbol, 5),
      balanceSheetQuarterly(symbol, 8),
      cashFlowAnnual(symbol, 5),
      cashFlowQuarterly(symbol, 8),
      ratiosLatest(symbol),
    ]);
    return {
      stock,
      dividends,
      news,
      prices,
      incomeAnnual,
      incomeQuarterly,
      balanceAnnual,
      balanceQuarterly,
      cashFlowAnnualRows,
      cashFlowQuarterlyRows,
      ratios,
    };
  },
  ["stock-detail-core"],
  { revalidate: 600 },
);

// All listings of the same company (multi-listing switcher + canonical). Keyed
// by company name; cheap query, cached like the rest.
const getListings = unstable_cache(
  async (name: string | null) => getCompanyListings(name),
  ["stock-company-listings"],
  { revalidate: 600 },
);

const getStockRelated = unstable_cache(
  async (symbol: string, sector: string | null) => {
    const [peerStocks, topEtfHolders] = await Promise.all([
      getPeerStocksInSector(symbol, sector, 6),
      getTopEtfHoldersPreview(symbol, 6),
    ]);
    return { peerStocks, topEtfHolders };
  },
  ["stock-detail-related"],
  { revalidate: 600 },
);

// Premium tabs are fetched + rendered client-side (StockDetailTabs); the rest
// are server-rendered into the cached HTML.
const TABS: TabDef[] = [
  { key: "overview", label: "Overview" },
  { key: "ratings", label: "Ratings", premium: true },
  { key: "recommendation", label: "Recommendation", premium: true },
  { key: "payouts", label: "Payouts" },
  { key: "div-growth", label: "Div Growth" },
  { key: "capture", label: "Capture Strategy", premium: true },
  { key: "financials", label: "Financials" },
  { key: "news", label: "News & Research" },
  { key: "profile", label: "Profile" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  // Live-data-enriched titles + descriptions dramatically improve SERP CTR
  // because the snippet shows the actual yield + ex-div date, not a generic
  // template. Fetch the bare-minimum row to avoid extra work.
  const stock = await getStock(upper).catch(() => null);
  if (!stock) {
    return {
      title: pickTitle([`${upper} Dividend — Yield, Payout & History`, `${upper} Dividend`]),
      description: metaDescription(
        `${upper} dividend history, forward yield, payout ratio, ex-dividend dates and price on uncoverd.`
      ),
      alternates: { canonical: `/stocks/${upper}` },
    };
  }
  // ETFs/funds don't get a /stocks/ page (it 404s) — noindex defensively.
  if (stock.is_etf || stock.is_fund || isFundSymbol(upper)) {
    return { title: `${upper}`, robots: { index: false, follow: false } };
  }
  const company = stock.name ?? upper;
  // Multi-listing canonical: every variation of a company points at the primary
  // listing (highest-volume sibling) so Google consolidates them into one page
  // instead of indexing dozens of thin cross-listing duplicates.
  const listings = await getListings(stock.name).catch(() => []);
  const primary = listings[0]?.symbol ?? upper;
  const canonical = `/stocks/${primary}`;
  const yld = stock.dividend_yield != null ? `${stock.dividend_yield.toFixed(2)}%` : null;
  const annual = stock.annual_dividend != null ? `$${stock.annual_dividend.toFixed(2)}` : null;
  const sector = stock.sector;
  // Richest → shortest. pickTitle returns the first that fits in 60 chars so
  // long company names (or foreign tickers like 603259.SS) don't overflow.
  const title = pickTitle([
    `${company} (${upper}) — ${yld ?? "Dividend"} Dividend Yield`,
    `${company} (${upper}) Dividend Yield`,
    `${upper} Dividend — ${yld ?? "Yield"} Yield, Payout & History`,
    `${upper} Dividend Yield & History`,
  ]);
  const description = metaDescription(
    [
      yld
        ? `${company} (${upper}) — ${yld} forward dividend yield${annual ? `, ${annual} annual payout` : ""}.`
        : `${company} (${upper}) dividend research.`,
      sector ? `Sector: ${sector}.` : "",
      "Ratings, ex-dividend calendar, payout history and full financials on uncoverd.",
    ]
      .filter(Boolean)
      .join(" ")
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const requested = ticker.toUpperCase();
  let symbol = requested;

  let core = await getStockCore(symbol);

  if (!core.stock) notFound();
  // ETFs & funds must NOT exist under /stocks — they're the wrong URL type and
  // inflate the indexable page count. 404 them so Google drops them. This also
  // catches US mutual funds mis-flagged as common stocks (5-letter …X symbols
  // like WFEMX/VFIAX). The real fund page lives at /etfs/symbol/[symbol].
  if (core.stock.is_etf || core.stock.is_fund || isFundSymbol(symbol)) notFound();

  // All listings of this company (TradingView-style switcher in the header).
  const listings = await getListings(core.stock.name).catch(() => []);
  const primarySymbol = listings[0]?.symbol ?? symbol;

  // Multi-listing v2: a thin secondary listing (US grey-market shells like
  // REPYY/REPYF) has no usable price history and no dividend of its own. Rather
  // than show an empty page, render the primary listing's full company data
  // (cached + shared across all siblings). Rich listings — REP.DE in EUR,
  // AAPL.MX in MXN — keep their own data/currency. `requested` is preserved so
  // we can show a "secondary listing" note.
  const usablePrices = core.prices.filter((p) => p.close != null).length >= 2;
  if (primarySymbol !== symbol && !usablePrices && core.stock.annual_dividend == null) {
    const primaryCore = await getStockCore(primarySymbol);
    if (primaryCore.stock && !primaryCore.stock.is_etf && !primaryCore.stock.is_fund) {
      core = primaryCore;
      symbol = primarySymbol;
    }
  }

  const {
    stock,
    dividends,
    news,
    prices,
    incomeAnnual,
    incomeQuarterly,
    balanceAnnual,
    balanceQuarterly,
    cashFlowAnnualRows,
    cashFlowQuarterlyRows,
    ratios,
  } = core;
  // Non-null after the notFound() guard above (or the primary refetch).
  if (!stock) notFound();
  const isPositive = (stock.change_percent ?? 0) >= 0;
  const isSecondaryRedirect = requested !== symbol;

  // Related-content for the bottom-of-page widget (internal linking + UX).
  const { peerStocks, topEtfHolders } = await getStockRelated(symbol, stock.sector ?? null);

  // Build the JSON-LD payloads for SEO + GEO (AI search). These render as
  // <script type="application/ld+json"> tags in the <head>-equivalent slot
  // and are parsed by Google, Bing, Perplexity, and ChatGPT.
  const upcomingDiv = dividends.find((d) => new Date(d.date) >= new Date());
  const stockSchema = stockJsonLd({
    symbol,
    name: stock.name,
    description: stock.description,
    exchange: stock.exchange,
    sector: stock.sector,
    industry: stock.industry,
    website: stock.website,
    image: stock.image,
    price: stock.price,
    currency: stock.currency,
    dividend_yield: stock.dividend_yield,
    annual_dividend: stock.annual_dividend,
  });
  const breadcrumbs = breadcrumbList([
    { name: "Home", url: "/" },
    { name: "Screener", url: "/screener" },
    { name: stock.sector ?? "Stocks", url: stock.sector ? `/sectors/${stock.sector.toLowerCase().replace(/[^a-z]/g, "-")}` : "/screener" },
    { name: `${stock.name ?? symbol} (${symbol})`, url: `/stocks/${symbol}` },
  ]);
  const faqs = dividendFaqs({
    symbol,
    name: stock.name,
    isEtf: false,
    dividend_yield: stock.dividend_yield,
    annual_dividend: stock.annual_dividend,
    currency: stock.currency,
    next_ex_date: upcomingDiv?.date ?? null,
    next_payment: upcomingDiv?.payment_date ?? null,
    next_amount: upcomingDiv?.dividend ?? null,
    frequency: upcomingDiv?.frequency ?? null,
    has_dividends: dividends.length > 0,
  });
  const faqSchema = faqJsonLd(faqs);

  // Public tab panels — server-rendered into the cached HTML. Premium tabs
  // (ratings/recommendation/capture) are handled client-side by StockDetailTabs.
  const panels: Record<string, React.ReactNode> = {
    overview: (
      <>
        <section className="dv-section">
          <div className="panel" style={{ padding: "1rem" }}>
            <ListingPriceChart
              data={prices.map((p) => ({ date: p.date, close: p.close }))}
              baseSymbol={symbol}
              baseCurrency={stock.currency}
              basePrice={stock.price}
              listings={listings.map((l) => ({ symbol: l.symbol, currency: l.currency, price: l.price }))}
            />
          </div>
        </section>
        <div className="dv-card-grid">
          <Stat label="Dividend Yield" value={formatPercent(stock.dividend_yield)} />
          <Stat label="Annual Dividend" value={formatCurrency(stock.annual_dividend, { currency: stock.currency })} />
          <Stat
            label="Payout Ratio"
            value={ratios?.dividend_payout_ratio != null ? formatPercent(ratios.dividend_payout_ratio * 100) : "—"}
          />
          <Stat label="P/E Ratio" value={ratios?.price_to_earnings_ratio?.toFixed(2) ?? "—"} />
          <Stat label="Market Cap" value={formatCurrency(stock.market_cap, { abbreviate: true, currency: stock.currency })} />
          <Stat label="Beta" value={stock.beta?.toFixed(2) ?? "—"} />
          <Stat label="52-Week Range" value={stock.range ?? "—"} />
          <Stat label="Volume" value={stock.volume ? stock.volume.toLocaleString() : "—"} />
        </div>
        {stock.description && (
          <section className="dv-section">
            <h2 className="dv-section__title">About {stock.name}</h2>
            <div className="dv-prose">
              <p>{stock.description.slice(0, 600)}{stock.description.length > 600 ? "…" : ""}</p>
              <Link href={`/stocks/${symbol}?tab=profile`} className="dv-action-link dv-action-link--accent">
                Full profile →
              </Link>
              {" · "}
              <Link href={`/etfs/holders/${symbol}`} className="dv-action-link dv-action-link--accent">
                Which ETFs own {symbol}? →
              </Link>
            </div>
          </section>
        )}
        {faqs.length > 0 && (
          <section className="dv-section">
            <h2 className="dv-section__title">Frequently asked about {symbol}</h2>
            <div className="dv-faq-list">
              {faqs.map((qa, i) => (
                <details key={i} className="dv-faq-item">
                  <summary>{qa.q}</summary>
                  <p>{qa.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
        {(peerStocks.length > 0 || topEtfHolders.length > 0) && (
          <section className="dv-section">
            <h2 className="dv-section__title">Related</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {peerStocks.length > 0 && (
                <div style={{ padding: "1rem 1.1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>
                    Other dividend stocks in {stock.sector ?? "this sector"}
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {peerStocks.map((p) => (
                      <li key={p.symbol} style={{ padding: "0.25rem 0" }}>
                        <Link href={`/stocks/${p.symbol}`} className="dv-action-link">{p.symbol}</Link>
                        {p.name && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}> — {p.name}</span>}
                        {p.dividend_yield != null && (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginLeft: "0.4rem" }}>
                            ({p.dividend_yield.toFixed(2)}%)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {topEtfHolders.length > 0 && (
                <div style={{ padding: "1rem 1.1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Top ETFs holding {symbol}</h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {topEtfHolders.map((h) => (
                      <li key={h.etf_symbol} style={{ padding: "0.25rem 0" }}>
                        <Link href={`/etfs/symbol/${h.etf_symbol}`} className="dv-action-link">{h.etf_symbol}</Link>
                        {h.etf_name && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}> — {h.etf_name}</span>}
                        {h.weight_percentage != null && (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginLeft: "0.4rem" }}>
                            ({h.weight_percentage.toFixed(2)}%)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p style={{ marginTop: "0.6rem", marginBottom: 0, fontSize: "0.82rem" }}>
                    <Link href={`/etfs/holders/${symbol}`} className="dv-action-link">See all ETFs holding {symbol} →</Link>
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </>
    ),
    payouts: <PayoutsTab symbol={symbol} dividends={dividends} stock={stock} ratios={ratios} />,
    "div-growth": <DivGrowthTab symbol={symbol} dividends={dividends} ratios={ratios} />,
    financials: (
      <FinancialsTab
        symbol={symbol}
        annual={{ income: incomeAnnual, balance: balanceAnnual, cashFlow: cashFlowAnnualRows }}
        quarterly={{ income: incomeQuarterly, balance: balanceQuarterly, cashFlow: cashFlowQuarterlyRows }}
      />
    ),
    news: (
      <section className="dv-section">
        <h2 className="dv-section__title">News &amp; Research for {symbol}</h2>
        {news.length === 0 ? (
          <div className="dv-empty">No news available for {symbol}.</div>
        ) : (
          <div className="dv-news-grid">
            {news.map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="dv-news-card">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt={n.title} className="dv-news-card__image" />
                )}
                <div className="dv-news-card__body">
                  <h3 className="dv-news-card__title">{n.title}</h3>
                  <p className="dv-news-card__meta">{n.publisher ?? n.site ?? "—"} · {formatDate(n.published_date)}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    ),
    profile: (
      <ProfileTab
        symbol={symbol}
        stock={stock}
        financialsContent={
          <FinancialsSection
            annual={{ income: incomeAnnual, balance: balanceAnnual, cashFlow: cashFlowAnnualRows }}
            quarterly={{ income: incomeQuarterly, balance: balanceQuarterly, cashFlow: cashFlowQuarterlyRows }}
          />
        }
      />
    ),
  };

  const premiumProps: StockPremiumProps = {
    symbol,
    dividendYield: stock.dividend_yield,
    currency: stock.currency,
    payoutRatio: ratios?.dividend_payout_ratio ?? null,
    peRatio: ratios?.price_to_earnings_ratio ?? null,
    lastDividend: dividends[0]
      ? { date: dividends[0].date, dividend: dividends[0].dividend, frequency: dividends[0].frequency }
      : null,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(stockSchema) }}
      />
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
        <section
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 100%)" }}
        >
          <p className="dv-eyebrow">
            {stock.exchange ?? "—"} · {stock.sector ?? "—"} · {stock.industry ?? "—"}
          </p>
          <h1>
            {stock.name ?? symbol} ({symbol})
          </h1>
          <ListingSwitcher
            listings={listings.map((l) => ({ symbol: l.symbol, exchange: l.exchange, currency: l.currency }))}
            current={symbol}
          />
          {isSecondaryRedirect && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>
              {requested} is a secondary listing of {stock.name ?? symbol}. Showing the primary
              listing ({symbol}{stock.exchange ? ` · ${stock.exchange}` : ""}).
            </p>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.25rem",
              alignItems: "baseline",
              marginTop: "0.6rem",
            }}
          >
            <div>
              <span style={{ fontSize: "2rem", fontWeight: 700 }}>
                {formatCurrency(stock.price, { currency: stock.currency })}
              </span>
              <span
                className={isPositive ? "dv-change--pos" : "dv-change--neg"}
                style={{ marginLeft: "0.75rem", fontWeight: 600 }}
              >
                {stock.change != null && `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}`}{" "}
                ({formatPercent(stock.change_percent)})
              </span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <strong>Forward Dividend:</strong> {formatCurrency(stock.annual_dividend, { currency: stock.currency })}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <strong>Yield (FWD):</strong> {formatPercent(stock.dividend_yield)}
            </div>
          </div>
        </section>

        <StockDetailTabs tabs={TABS} panels={panels} premium={premiumProps} />

        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/screener" className="dv-action-link">
            ← Back to screener
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function PayoutsTab({
  symbol,
  dividends,
  stock,
  ratios,
}: {
  symbol: string;
  dividends: Awaited<ReturnType<typeof dividendHistoryBySymbol>>;
  stock: NonNullable<Awaited<ReturnType<typeof getStock>>>;
  ratios: Awaited<ReturnType<typeof ratiosLatest>>;
}) {
  const lastDiv = dividends[0];
  // Use adj_dividend (split-adjusted) for TTM total — raw `dividend` stores
  // pre-split per-share, so any ticker with a recent split shows an
  // inflated total here (HDV showed $3.96 TTM when real is $0.79).
  const totalTtm = dividends
    .filter((d) => {
      const t = new Date(d.date).getTime();
      return t > Date.now() - 365 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, d) => sum + (Number(d.adj_dividend ?? d.dividend) || 0), 0);

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Payouts — {symbol}</h2>
      <div className="dv-card-grid">
        <Stat label="Next/Last Ex-Date" value={lastDiv ? formatDate(lastDiv.date) : "—"} />
        <Stat label="Last Dividend" value={lastDiv ? formatCurrency(lastDiv.adj_dividend ?? lastDiv.dividend, { currency: stock.currency }) : "—"} />
        <Stat label="Frequency" value={lastDiv?.frequency ?? "—"} />
        <Stat label="Trailing 12-mo Total" value={formatCurrency(totalTtm, { currency: stock.currency })} />
        <Stat
          label="Payout Ratio"
          value={ratios?.dividend_payout_ratio != null ? formatPercent(ratios.dividend_payout_ratio * 100) : "—"}
        />
        <Stat label="Yield (FWD)" value={formatPercent(stock.dividend_yield)} />
      </div>
      <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
        <div className="dv-table-scroll">
          <table className="dv-table">
            <thead>
              <tr>
                <th>Ex-Date</th>
                <th>Declaration</th>
                <th>Record Date</th>
                <th>Payment Date</th>
                <th>Frequency</th>
                <th className="dv-th--num">Dividend</th>
              </tr>
            </thead>
            <tbody>
              {dividends.slice(0, 30).map((d, i) => (
                <tr key={i}>
                  <td>{formatDate(d.date)}</td>
                  <td>{formatDate(d.declaration_date)}</td>
                  <td>{formatDate(d.record_date)}</td>
                  <td>{formatDate(d.payment_date)}</td>
                  <td>{d.frequency ?? "—"}</td>
                  <td className="dv-td--num">{formatCurrency(d.adj_dividend ?? d.dividend, { currency: stock.currency })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DivGrowthTab({
  symbol,
  dividends,
  ratios,
}: {
  symbol: string;
  dividends: Awaited<ReturnType<typeof dividendHistoryBySymbol>>;
  ratios: Awaited<ReturnType<typeof ratiosLatest>>;
}) {
  // Group dividends by year and sum. Use adj_dividend so a stock split
  // doesn't create a fake "cut year" in the CAGR — pre-split years show
  // inflated totals vs post-split if we use raw `dividend`, breaking
  // growth-rate calculations.
  const byYear = new Map<number, number>();
  for (const d of dividends) {
    const y = new Date(d.date).getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + Number(d.adj_dividend ?? d.dividend ?? 0));
  }
  const years = Array.from(byYear.entries()).sort((a, b) => a[0] - b[0]);

  function cagr(years: [number, number][], yearsBack: number): number | null {
    if (years.length < yearsBack + 1) return null;
    const latest = years[years.length - 1];
    const past = years[years.length - 1 - yearsBack];
    if (!past || past[1] <= 0) return null;
    return (Math.pow(latest[1] / past[1], 1 / yearsBack) - 1) * 100;
  }

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">{symbol} Dividend Growth CAGR</h2>
      <div className="dv-card-grid">
        <Stat label="1Y Growth" value={cagr(years, 1) != null ? formatPercent(cagr(years, 1)) : "—"} />
        <Stat label="3Y Growth" value={cagr(years, 3) != null ? formatPercent(cagr(years, 3)) : "—"} />
        <Stat label="5Y Growth" value={cagr(years, 5) != null ? formatPercent(cagr(years, 5)) : "—"} />
        <Stat label="10Y Growth" value={cagr(years, 10) != null ? formatPercent(cagr(years, 10)) : "—"} />
        <Stat
          label="Current Payout Ratio"
          value={ratios?.dividend_payout_ratio != null ? formatPercent(ratios.dividend_payout_ratio * 100) : "—"}
        />
      </div>
      <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
        <div className="dv-table-scroll">
          <table className="dv-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="dv-th--num">Total dividends</th>
                <th className="dv-th--num">YoY change</th>
              </tr>
            </thead>
            <tbody>
              {years.length === 0 && (
                <tr>
                  <td colSpan={3}>No dividend history.</td>
                </tr>
              )}
              {years
                .slice()
                .reverse()
                .map(([year, amount], idx, arr) => {
                  const prev = arr[idx + 1];
                  const yoy = prev && prev[1] > 0 ? ((amount - prev[1]) / prev[1]) * 100 : null;
                  return (
                    <tr key={year}>
                      <td>{year}</td>
                      <td className="dv-td--num">{formatCurrency(amount)}</td>
                      <td className="dv-td--num">
                        {yoy != null ? (
                          <span className={yoy >= 0 ? "dv-change--pos" : "dv-change--neg"}>
                            {yoy >= 0 ? "+" : ""}
                            {yoy.toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProfileTab({
  symbol,
  stock,
  financialsContent,
}: {
  symbol: string;
  stock: NonNullable<Awaited<ReturnType<typeof getStock>>>;
  financialsContent: React.ReactNode;
}) {
  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Profile — {symbol}</h2>
      {stock.description && (
        <div className="dv-prose">
          <p>{stock.description}</p>
        </div>
      )}
      <div className="dv-card-grid" style={{ marginTop: "1rem" }}>
        <Stat label="Sector" value={stock.sector ?? "—"} />
        <Stat label="Industry" value={stock.industry ?? "—"} />
        <Stat label="Exchange" value={stock.exchange ?? "—"} />
        <Stat label="Country" value={stock.country ?? "—"} />
        <Stat label="CEO" value={stock.ceo ?? "—"} />
        <Stat label="Employees" value={stock.full_time_employees ? stock.full_time_employees.toLocaleString() : "—"} />
        <Stat label="IPO Date" value={stock.ipo_date ? formatDate(stock.ipo_date) : "—"} />
        <Stat label="ISIN" value={stock.isin ?? "—"} />
      </div>
      {stock.website && (
        <p style={{ marginTop: "1rem" }}>
          <a href={stock.website} target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd" }}>
            {stock.website} ↗
          </a>
        </p>
      )}
      <h2 className="dv-section__title" style={{ marginTop: "2rem" }}>
        Financials
      </h2>
      {financialsContent}
    </section>
  );
}

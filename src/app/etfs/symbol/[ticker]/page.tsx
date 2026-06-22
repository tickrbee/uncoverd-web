import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingPriceChart } from "@/components/listing-price-chart";
import { ListingSwitcher } from "@/components/listing-switcher";
import { Stat } from "@/components/stat";
import { EtfDetailTabs, type TabDef } from "@/components/etf-detail-tabs";
import {
  getEtfDetailFull,
  computeEtfRating,
  formatCurrency,
  formatPercent,
  formatDate,
} from "@/lib/data";
import { pickTitle, metaDescription } from "@/lib/seo";
import { isFundSymbol } from "@/lib/format";
import { unstable_cache } from "next/cache";
import {
  breadcrumbList,
  etfJsonLd,
  dividendFaqs,
  faqJsonLd,
  jsonLdScript,
} from "@/lib/structured-data";

// ISR + statically cacheable (same approach as /stocks/[ticker]): no
// per-request cookie/searchParams reads, so the CDN serves it to bots and
// logged-out visitors. The gated ETF-rating breakdown is fetched client-side
// via /api/etfs/premium and never enters the cached HTML.
export const revalidate = 600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

// One RPC returns the entire ETF page payload — profile row, distributions,
// news, prices, holdings, sector/country weights and multi-listing siblings —
// replacing the ~7 separate Supabase queries this page used to fire on every
// cold render. Cached so the metadata pass and the body share one round-trip.
const getDetail = unstable_cache(
  async (symbol: string) => getEtfDetailFull(symbol),
  ["etf-detail-v2"],
  { revalidate: 600 },
);

const TABS: TabDef[] = [
  { key: "overview", label: "Overview" },
  { key: "holdings", label: "Holdings & Sectors" },
  { key: "distributions", label: "Distributions" },
  { key: "rating", label: "Rating", premium: true },
  { key: "news", label: "News" },
  { key: "profile", label: "Profile" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  const detail = await getDetail(upper).catch(() => null);
  const etf = detail?.etf ?? null;
  if (!etf) {
    return {
      title: pickTitle([`${upper} ETF — Yield, Holdings & Expense Ratio`, `${upper} ETF Profile`]),
      description: metaDescription(
        `${upper} ETF profile: expense ratio, AUM, holdings count, distribution yield and full distribution history on uncoverd.`
      ),
      alternates: { canonical: `/etfs/symbol/${upper}` },
    };
  }
  const name = etf.name ?? upper;
  // Canonicalize multi-listing funds to the primary (highest-volume) listing.
  const listings = detail?.listings ?? [];
  const canonical = `/etfs/symbol/${listings[0]?.symbol ?? upper}`;
  const yld = etf.dividend_yield != null ? `${etf.dividend_yield.toFixed(2)}%` : null;
  const exp = etf.expense_ratio != null ? `${etf.expense_ratio.toFixed(2)}%` : null;
  const aum = etf.aum != null ? `$${(etf.aum / 1e9).toFixed(1)}B AUM` : null;
  const title = pickTitle([
    `${name} (${upper}) ETF — ${yld ?? "Yield"} Yield`,
    `${name} (${upper}) ETF`,
    `${upper} ETF — Yield, Holdings & Expense Ratio`,
    `${upper} ETF Profile`,
  ]);
  const description = metaDescription(
    `${name} (${upper}) — ${[yld && `${yld} distribution yield`, exp && `${exp} expense ratio`, aum]
      .filter(Boolean)
      .join(", ")}. Holdings, distributions, rating and full ETF profile on uncoverd.`
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

export default async function EtfDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  const detail = await getDetail(symbol);
  if (!detail || !detail.etf) notFound();
  // Sibling listings of this fund/ETF (multi-listing switcher in the header) —
  // bundled in the same RPC payload.
  const { dividends, news, prices, holdings, sectorWeights, countryWeights, listings } = detail;
  const etf = detail.etf;
  // ETFs, flagged funds, AND mutual funds mis-flagged as stocks (5-letter …X
  // symbols like VSMPX/VITSX) all render here as their canonical fund/ETF page.
  // Only a genuine common stock bounces to /stocks.
  if (!etf.is_etf && !etf.is_fund && !isFundSymbol(symbol)) {
    return (
      <>
        <SiteHeader />
        <main className="dv-page">
          <div className="dv-empty">
            <p>{symbol} is not an ETF.</p>
            <p style={{ marginTop: "1rem" }}>
              <Link href={`/stocks/${symbol}`} className="dv-action-link dv-action-link--accent">
                Go to {symbol} stock detail →
              </Link>
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  // 1-year return from historical prices for the rating + display.
  let oneYearReturn: number | null = null;
  if (prices.length >= 2) {
    const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const yearAgoIdx = sorted.findIndex(
      (p) => new Date(p.date).getTime() >= Date.now() - 365 * 24 * 60 * 60 * 1000
    );
    const start = yearAgoIdx >= 0 ? sorted[yearAgoIdx] : sorted[0];
    const startClose = start?.close ?? null;
    const latestClose = latest?.close ?? null;
    if (startClose != null && latestClose != null && startClose > 0) {
      oneYearReturn = ((latestClose - startClose) / startClose) * 100;
    }
  }
  const rating = computeEtfRating(etf, oneYearReturn);

  const isPositive = (etf.change_percent ?? 0) >= 0;

  // SEO + GEO JSON-LD for ETF pages.
  const upcomingDiv = dividends.find((d) => new Date(d.date) >= new Date());
  const etfSchema = etfJsonLd({
    symbol,
    name: etf.name,
    description: etf.description,
    exchange: etf.exchange,
    sector: etf.sector,
    industry: etf.industry,
    website: etf.website,
    image: etf.image,
    price: etf.price,
    currency: etf.currency,
    dividend_yield: etf.dividend_yield,
    annual_dividend: etf.annual_dividend,
    expense_ratio: etf.expense_ratio,
    aum: etf.aum,
    holdings_count: etf.holdings_count,
    etf_company: etf.etf_company,
    asset_class: etf.asset_class,
  });
  const breadcrumbs = breadcrumbList([
    { name: "Home", url: "/" },
    { name: "ETF Screener", url: "/screener?type=etfs" },
    { name: `${etf.name ?? symbol} (${symbol})`, url: `/etfs/symbol/${symbol}` },
  ]);
  const faqs = dividendFaqs({
    symbol,
    name: etf.name,
    isEtf: true,
    dividend_yield: etf.dividend_yield,
    annual_dividend: etf.annual_dividend,
    currency: etf.currency,
    next_ex_date: upcomingDiv?.date ?? null,
    next_payment: upcomingDiv?.payment_date ?? null,
    next_amount: upcomingDiv?.dividend ?? null,
    frequency: upcomingDiv?.frequency ?? null,
    has_dividends: dividends.length > 0,
  });
  const faqSchema = faqJsonLd(faqs);

  // Public tab panels — server-rendered into the cached HTML. The premium
  // "rating" tab is handled client-side by EtfDetailTabs.
  const panels: Record<string, React.ReactNode> = {
    overview: (
      <>
        <section className="dv-section">
          <div className="panel" style={{ padding: "1rem" }}>
            <ListingPriceChart
              data={prices.map((p) => ({ date: p.date, close: p.close }))}
              baseSymbol={symbol}
              baseCurrency={etf.currency}
              basePrice={etf.price}
              listings={listings.map((l) => ({ symbol: l.symbol, currency: l.currency, price: l.price }))}
            />
          </div>
        </section>
        <div className="dv-card-grid">
          <Stat label="AUM" value={formatCurrency(etf.aum, { abbreviate: true, currency: etf.currency })} />
          <Stat label="Expense ratio" value={etf.expense_ratio != null ? formatPercent(etf.expense_ratio) : "—"} />
          <Stat label="Holdings" value={etf.holdings_count != null ? etf.holdings_count.toLocaleString() : "—"} />
          <Stat label="Asset class" value={etf.asset_class ?? "—"} />
          <Stat label="Category" value={etf.etf_category ?? "—"} />
          <Stat label="Issuer" value={etf.etf_company ?? "—"} />
          <Stat label="Inception" value={etf.ipo_date ? formatDate(etf.ipo_date) : "—"} />
          <Stat label="1-Year return" value={oneYearReturn != null ? formatPercent(oneYearReturn) : "—"} />
        </div>
        {etf.description && (
          <section className="dv-section">
            <h2 className="dv-section__title">About {etf.name}</h2>
            <div className="dv-prose">
              <p>{etf.description.slice(0, 700)}{etf.description.length > 700 ? "…" : ""}</p>
              <Link href={`/etfs/symbol/${symbol}?tab=profile`} className="dv-action-link dv-action-link--accent">
                Full profile →
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
      </>
    ),
    holdings: (
      <section className="dv-section">
        <h2 className="dv-section__title">Holdings &amp; Sector Exposure — {symbol}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Total positions:{" "}
          <strong>{etf.holdings_count != null ? etf.holdings_count.toLocaleString() : "—"}</strong>
          {etf.asset_class ? ` · ${etf.asset_class}` : ""}
          {etf.etf_category ? ` · ${etf.etf_category}` : ""}
        </p>
        {sectorWeights.length > 0 && (
          <div className="dv-card" style={{ padding: "1rem", marginTop: "1rem" }}>
            <h3 style={{ margin: "0 0 0.75rem" }}>Sector breakdown</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {sectorWeights.map((s) => {
                const w = s.weight_percentage ?? 0;
                return (
                  <div key={s.sector} style={{ display: "grid", gridTemplateColumns: "180px 1fr 70px", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{s.sector}</span>
                    <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, w)}%`, height: "100%", background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)" }} />
                    </div>
                    <span className="dv-td--num" style={{ fontSize: "0.82rem" }}>{w.toFixed(2)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {countryWeights.length > 0 && (
          <div className="dv-card" style={{ padding: "1rem", marginTop: "1rem" }}>
            <h3 style={{ margin: "0 0 0.75rem" }}>Country allocation</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {countryWeights.map((c) => {
                const w = c.weight_percentage ?? 0;
                return (
                  <div key={c.country} style={{ display: "grid", gridTemplateColumns: "180px 1fr 70px", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{c.country}</span>
                    <div style={{ background: "rgba(255,255,255,0.05)", height: 8, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, w)}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)" }} />
                    </div>
                    <span className="dv-td--num" style={{ fontSize: "0.82rem" }}>{w.toFixed(2)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {holdings.length > 0 ? (
          <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Asset</th>
                    <th>Name</th>
                    <th className="dv-th--num">Weight</th>
                    <th className="dv-th--num">Shares</th>
                    <th className="dv-th--num">Market value</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={h.asset}>
                      <td>{i + 1}</td>
                      <td>
                        <Link href={`/stocks/${h.asset}`} className="dv-ticker">
                          <span className="dv-ticker__name">{h.asset}</span>
                        </Link>
                      </td>
                      <td>{h.name ?? "—"}</td>
                      <td className="dv-td--num">{h.weight_percentage != null ? `${h.weight_percentage.toFixed(2)}%` : "—"}</td>
                      <td className="dv-td--num">{h.shares_number != null ? h.shares_number.toLocaleString() : "—"}</td>
                      <td className="dv-td--num">{h.market_value != null ? formatCurrency(h.market_value, { abbreviate: true, currency: etf.currency }) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="dv-empty" style={{ marginTop: "1rem" }}>
            Holdings data not yet ingested for {symbol}. The next ETF refresh will populate it.
          </div>
        )}
      </section>
    ),
    distributions: (
      <section className="dv-section">
        <h2 className="dv-section__title">Distribution history — {symbol}</h2>
        {dividends.length === 0 ? (
          <div className="dv-empty">No distribution history on file for {symbol} yet.</div>
        ) : (
          <div className="dv-table-wrap">
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>Ex-Date</th>
                    <th>Declaration</th>
                    <th>Record Date</th>
                    <th>Payment Date</th>
                    <th>Frequency</th>
                    <th className="dv-th--num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dividends.slice(0, 60).map((d, i) => (
                    <tr key={i}>
                      <td>{formatDate(d.date)}</td>
                      <td>{formatDate(d.declaration_date)}</td>
                      <td>{formatDate(d.record_date)}</td>
                      <td>{formatDate(d.payment_date)}</td>
                      <td>{d.frequency ?? "—"}</td>
                      <td className="dv-td--num">{formatCurrency(d.dividend, { currency: etf.currency })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    ),
    news: (
      <section className="dv-section">
        <h2 className="dv-section__title">News for {symbol}</h2>
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
      <section className="dv-section">
        <h2 className="dv-section__title">Profile — {symbol}</h2>
        {etf.description && (
          <div className="dv-prose">
            <p>{etf.description}</p>
          </div>
        )}
        <div className="dv-card-grid" style={{ marginTop: "1rem" }}>
          <Stat label="Issuer" value={etf.etf_company ?? "—"} />
          <Stat label="Asset class" value={etf.asset_class ?? "—"} />
          <Stat label="Category" value={etf.etf_category ?? "—"} />
          <Stat label="Exchange" value={etf.exchange ?? "—"} />
          <Stat label="Country" value={etf.country ?? "—"} />
          <Stat label="Currency" value={etf.currency ?? "—"} />
          <Stat label="Inception" value={etf.ipo_date ? formatDate(etf.ipo_date) : "—"} />
          <Stat label="ISIN" value={etf.isin ?? "—"} />
        </div>
        {etf.website && (
          <p style={{ marginTop: "1rem" }}>
            <a href={etf.website} target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd" }}>
              {etf.website} ↗
            </a>
          </p>
        )}
      </section>
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(etfSchema) }}
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
          style={{ background: "linear-gradient(135deg, #0f3a2e 0%, #064e3b 100%)" }}
        >
          <p className="dv-eyebrow">
            ETF · {etf.etf_company ?? etf.exchange ?? "—"} · {etf.etf_category ?? etf.asset_class ?? "—"}
          </p>
          <h1>
            {etf.name ?? symbol} ({symbol})
          </h1>
          <ListingSwitcher
            listings={listings.map((l) => ({ symbol: l.symbol, exchange: l.exchange, currency: l.currency }))}
            current={symbol}
          />
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
                {formatCurrency(etf.price, { currency: etf.currency })}
              </span>
              <span
                className={isPositive ? "dv-change--pos" : "dv-change--neg"}
                style={{ marginLeft: "0.75rem", fontWeight: 600 }}
              >
                {etf.change != null && `${etf.change >= 0 ? "+" : ""}${etf.change.toFixed(2)}`} (
                {formatPercent(etf.change_percent)})
              </span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <strong>NAV:</strong> {formatCurrency(etf.nav ?? etf.price, { currency: etf.currency })}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <strong>Yield (FWD):</strong> {formatPercent(etf.dividend_yield)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <strong>Expense ratio:</strong>{" "}
              {etf.expense_ratio != null ? formatPercent(etf.expense_ratio) : "—"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <strong>Rating:</strong>
              {/* Grade only — the composite breakdown is part of the gated
                  Rating tab and shouldn't leak into the public banner. */}
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "1.9rem", padding: "0.1rem 0.45rem", borderRadius: "0.5rem", background: "rgba(47,227,160,0.16)", border: "1px solid rgba(47,227,160,0.45)", color: "#2fe3a0", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.4 }}>{rating.grade}</span>
            </div>
          </div>
        </section>

        <EtfDetailTabs tabs={TABS} panels={panels} symbol={symbol} />

        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/screener?type=etfs" className="dv-action-link">
            ← Back to ETF screener
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}


import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PriceChart } from "@/components/price-chart";
import {
  getEtfDetail,
  computeEtfRating,
  dividendHistoryBySymbol,
  newsForSymbol,
  historicalPrices,
  getEtfHoldings,
  getEtfSectorWeights,
  formatCurrency,
  formatPercent,
  formatDate,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "holdings", label: "Holdings & Sectors" },
  { key: "distributions", label: "Distributions" },
  { key: "rating", label: "Rating" },
  { key: "news", label: "News" },
  { key: "profile", label: "Profile" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  return {
    title: `${upper} ETF — Expense Ratio, Holdings, Yield & Distributions`,
    description: `${upper} ETF profile: expense ratio, AUM, holdings count, yield and distribution history.`,
  };
}

export default async function EtfDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { ticker } = await params;
  const { tab } = await searchParams;
  const symbol = ticker.toUpperCase();
  const active: TabKey = (TABS.find((t) => t.key === tab)?.key ?? "overview") as TabKey;

  const [etf, dividends, news, prices, holdings, sectorWeights] = await Promise.all([
    getEtfDetail(symbol),
    dividendHistoryBySymbol(symbol, 60),
    newsForSymbol(symbol, 12),
    historicalPrices(symbol, 365 * 5),
    getEtfHoldings(symbol, 50),
    getEtfSectorWeights(symbol),
  ]);

  if (!etf) notFound();
  if (!etf.is_etf && !etf.is_fund) {
    // Not an ETF — bounce to the stock detail page.
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

  const premium = await getPremiumStatus();

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

  return (
    <>
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
              {etf.expense_ratio != null ? formatPercent(etf.expense_ratio * 100) : "—"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)" }}>
              <strong>Rating:</strong>{" "}
              <span style={{ fontWeight: 700 }}>{rating.grade}</span>
              {rating.composite != null && ` (${rating.composite.toFixed(2)} / 5)`}
            </div>
          </div>
        </section>

        <nav className="dv-tabs" aria-label="ETF detail tabs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/etfs/symbol/${symbol}${t.key === "overview" ? "" : `?tab=${t.key}`}`}
              className={`dv-tab ${active === t.key ? "dv-tab--active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {active === "overview" && (
          <>
            <section className="dv-section">
              <div className="panel" style={{ padding: "1rem" }}>
                <PriceChart
                  data={prices.map((p) => ({ date: p.date, close: p.close }))}
                  defaultRange="1Y"
                />
              </div>
            </section>
            <div className="dv-card-grid">
              <Stat label="AUM" value={formatCurrency(etf.aum, { abbreviate: true, currency: etf.currency })} />
              <Stat
                label="Expense ratio"
                value={etf.expense_ratio != null ? formatPercent(etf.expense_ratio * 100) : "—"}
              />
              <Stat
                label="Holdings"
                value={etf.holdings_count != null ? etf.holdings_count.toLocaleString() : "—"}
              />
              <Stat label="Asset class" value={etf.asset_class ?? "—"} />
              <Stat label="Category" value={etf.etf_category ?? "—"} />
              <Stat label="Issuer" value={etf.etf_company ?? "—"} />
              <Stat
                label="Inception"
                value={etf.ipo_date ? formatDate(etf.ipo_date) : "—"}
              />
              <Stat
                label="1-Year return"
                value={oneYearReturn != null ? formatPercent(oneYearReturn) : "—"}
              />
            </div>
            {etf.description && (
              <section className="dv-section">
                <h2 className="dv-section__title">About {etf.name}</h2>
                <div className="dv-prose">
                  <p>
                    {etf.description.slice(0, 700)}
                    {etf.description.length > 700 ? "…" : ""}
                  </p>
                  <Link href={`/etfs/symbol/${symbol}?tab=profile`} className="dv-action-link dv-action-link--accent">
                    Full profile →
                  </Link>
                </div>
              </section>
            )}
          </>
        )}

        {active === "holdings" && (
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
                          <div
                            style={{
                              width: `${Math.min(100, w)}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                            }}
                          />
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
                          <td className="dv-td--num">
                            {h.weight_percentage != null ? `${h.weight_percentage.toFixed(2)}%` : "—"}
                          </td>
                          <td className="dv-td--num">
                            {h.shares_number != null ? h.shares_number.toLocaleString() : "—"}
                          </td>
                          <td className="dv-td--num">
                            {h.market_value != null
                              ? formatCurrency(h.market_value, { abbreviate: true, currency: etf.currency })
                              : "—"}
                          </td>
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
        )}

        {active === "distributions" && (
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
        )}

        {active === "rating" && (
          <section className="dv-section">
            <h2 className="dv-section__title">ETF rating — {symbol}</h2>
            {!premium.isPremium ? (
              <div className="dv-premium-gate">
                <span className="dv-premium-badge">Premium</span>
                <h2>ETF ratings are a Premium feature</h2>
                <p>
                  See the composite ETF score plus the individual yield, AUM, expense-ratio
                  and return components.
                </p>
                <div className="dv-premium-gate__actions">
                  <Link href="/pricing" className="btn">
                    See Premium Plans
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="dv-card-grid">
                  <RatingCell
                    label="Composite"
                    value={rating.composite}
                    grade={rating.grade}
                    max={5}
                    blurb="Average of the four components below. A ≥ 4, B ≥ 3, C ≥ 2, D ≥ 1, otherwise F. Missing inputs are dropped from the average rather than penalized."
                  />
                  <RatingCell
                    label="Yield"
                    value={rating.yieldScore}
                    max={5}
                    blurb="Distribution yield over the trailing 12 months. 0% → 0, 4% → 3, 6%+ → 5 (capped to avoid rewarding yield traps)."
                  />
                  <RatingCell
                    label="AUM / size"
                    value={rating.aumScore}
                    max={5}
                    blurb="Asset base — proxy for liquidity and survivorship risk. Below $100M → 0.5, $1B → ~3, $50B+ → 5."
                  />
                  <RatingCell
                    label="Cost (expense ratio)"
                    value={rating.costScore}
                    max={5}
                    blurb="Annual fee drag. Below 0.10% → 5, 0.50% → 3, above 1.00% → 1. Lower fees compound to higher long-run returns."
                  />
                  <RatingCell
                    label="1-Year return"
                    value={rating.returnScore}
                    max={5}
                    blurb="Trailing 12-month total return (price + distributions). Negative → 0, 8% → 3, 20%+ → 5."
                  />
                </div>
                <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Full methodology:{" "}
                  <Link href="/methodology" className="dv-action-link">
                    How uncoverd ratings are calculated →
                  </Link>
                </p>
              </>
            )}
          </section>
        )}

        {active === "news" && (
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
                      <img src={n.image} alt="" className="dv-news-card__image" />
                    )}
                    <div className="dv-news-card__body">
                      <h3 className="dv-news-card__title">{n.title}</h3>
                      <p className="dv-news-card__meta">
                        {n.publisher ?? n.site ?? "—"} · {formatDate(n.published_date)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {active === "profile" && (
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
        )}

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value">{value}</p>
    </div>
  );
}

function RatingCell({
  label,
  value,
  grade,
  max,
  blurb,
}: {
  label: string;
  value: number | null;
  grade?: string;
  max: number;
  blurb?: string;
}) {
  if (value == null) {
    return (
      <div className="dv-stat-card">
        <p className="dv-stat-card__label">{label}</p>
        <p className="dv-stat-card__value" style={{ color: "var(--text-muted)" }}>
          —
        </p>
        {blurb && (
          <p style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            {blurb}
          </p>
        )}
      </div>
    );
  }
  const ratio = value / max;
  const color =
    ratio >= 0.8
      ? "var(--positive)"
      : ratio >= 0.6
      ? "#34d399"
      : ratio >= 0.45
      ? "#fbbf24"
      : "var(--negative)";
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value" style={{ color }}>
        {grade ?? value.toFixed(2)}
      </p>
      <p className="dv-stat-card__label" style={{ marginTop: "0.25rem" }}>
        {value.toFixed(2)} / {max}
      </p>
      {blurb && (
        <p
          style={{
            marginTop: "0.6rem",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            lineHeight: 1.4,
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "0.5rem",
          }}
        >
          {blurb}
        </p>
      )}
    </div>
  );
}

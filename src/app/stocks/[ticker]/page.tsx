import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PriceChart } from "@/components/price-chart";
import { FinancialsSection } from "@/components/financials-section";
import { FinancialsTab } from "@/components/financials-tab";
import { PremiumLock } from "@/components/premium-lock";
import {
  getStock,
  getStockRating,
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
  avgRecoveryDays,
  formatCurrency,
  formatPercent,
  formatDate,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ratings", label: "Ratings" },
  { key: "recommendation", label: "Recommendation" },
  { key: "payouts", label: "Payouts" },
  { key: "div-growth", label: "Div Growth" },
  { key: "capture", label: "Capture Strategy" },
  { key: "financials", label: "Financials" },
  { key: "news", label: "News & Research" },
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
    title: `${upper} — Dividend, Yield, Payout & Price`,
    description: `${upper} dividend history, yield, payout ratio, price and news.`,
  };
}

export default async function StockPage({
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

  const [
    stock,
    rating,
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
    recoveryDays,
  ] = await Promise.all([
    getStock(symbol),
    getStockRating(symbol),
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
    active === "capture" ? avgRecoveryDays(symbol, 8) : Promise.resolve(null),
  ]);

  if (!stock) notFound();
  const premium = await getPremiumStatus();
  const isPositive = (stock.change_percent ?? 0) >= 0;

  return (
    <>
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

        <nav className="dv-tabs" aria-label="Stock detail tabs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/stocks/${symbol}${t.key === "overview" ? "" : `?tab=${t.key}`}`}
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
                <PriceChart data={prices.map((p) => ({ date: p.date, close: p.close }))} defaultRange="1Y" />
              </div>
            </section>
            <div className="dv-card-grid">
              <Stat label="Dividend Yield" value={formatPercent(stock.dividend_yield)} />
              <Stat label="Annual Dividend" value={formatCurrency(stock.annual_dividend, { currency: stock.currency })} />
              <Stat
                label="Payout Ratio"
                value={
                  ratios?.dividend_payout_ratio != null
                    ? formatPercent(ratios.dividend_payout_ratio * 100)
                    : "—"
                }
              />
              <Stat label="P/E Ratio" value={ratios?.price_to_earnings_ratio?.toFixed(2) ?? "—"} />
              <Stat
                label="Market Cap"
                value={formatCurrency(stock.market_cap, { abbreviate: true, currency: stock.currency })}
              />
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
          </>
        )}

        {active === "ratings" && (
          <RatingsTab symbol={symbol} rating={rating} isPremium={premium.isPremium} />
        )}

        {active === "recommendation" && (
          <RecommendationTab symbol={symbol} rating={rating} ratios={ratios} stock={stock} isPremium={premium.isPremium} />
        )}

        {active === "payouts" && (
          <PayoutsTab symbol={symbol} dividends={dividends} stock={stock} ratios={ratios} />
        )}

        {active === "div-growth" && (
          <DivGrowthTab symbol={symbol} dividends={dividends} ratios={ratios} />
        )}

        {active === "capture" && (
          <CaptureTab
            symbol={symbol}
            dividends={dividends}
            stock={stock}
            recoveryDays={recoveryDays}
            isPremium={premium.isPremium}
          />
        )}

        {active === "financials" && (
          <FinancialsTab
            symbol={symbol}
            annual={{ income: incomeAnnual, balance: balanceAnnual, cashFlow: cashFlowAnnualRows }}
            quarterly={{ income: incomeQuarterly, balance: balanceQuarterly, cashFlow: cashFlowQuarterlyRows }}
            isPremium={premium.isPremium}
          />
        )}

        {active === "news" && (
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
        )}

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value">{value}</p>
    </div>
  );
}

function RatingsTab({
  symbol,
  rating,
  isPremium,
}: {
  symbol: string;
  rating: Awaited<ReturnType<typeof getStockRating>>;
  isPremium: boolean;
}) {
  if (!rating || rating.composite_total == null) {
    return <div className="dv-empty">No ratings available yet for {symbol}.</div>;
  }
  const cards = [
    {
      key: "overall",
      label: "Overall",
      grade: rating.composite_grade,
      score: rating.composite_total,
      max: 20,
      blurb:
        "Composite of the five pillars below (Value + Growth + Profitability + Momentum + Health, each 0–4). 17–20 = A, 14–16 = B, 12–13 = C, 10–11 = D, below = F.",
    },
    {
      key: "value",
      label: "Value",
      score: rating.value_score,
      max: 5,
      blurb: "How cheap the stock looks vs peers in its industry — combines P/E, P/B and dividend-yield percentile.",
    },
    {
      key: "growth",
      label: "Growth",
      score: rating.growth_score,
      max: 5,
      blurb: "5-year revenue + EPS + dividend CAGR scored against industry peers. Rewards consistent compounding.",
    },
    {
      key: "profit",
      label: "Profitability",
      score: rating.profit_score,
      max: 5,
      blurb: "Net margin, ROE and return on invested capital — how much profit the business squeezes out of its sales and capital.",
    },
    {
      key: "momentum",
      label: "Momentum",
      score: rating.momentum_score,
      max: 5,
      blurb: "1-year and 3-month total return percentile vs peers. High momentum = market is bidding the stock up.",
    },
    {
      key: "health",
      label: "Health",
      score: rating.health_score,
      max: 5,
      blurb: "Balance-sheet strength: net debt / EBITDA, interest coverage, dividend payout ratio. Lower-leverage and well-covered dividends score higher.",
    },
  ];
  return (
    <section className="dv-section">
      <h2 className="dv-section__title">uncoverd Ratings — {symbol}</h2>
      <div className="dv-card-grid">
        {cards.map((c) => (
          <RatingCard
            key={c.key}
            label={c.label}
            score={c.score ?? null}
            grade={c.grade}
            max={c.max}
            blur={!isPremium}
            blurb={c.blurb}
          />
        ))}
      </div>
      <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        Full methodology:{" "}
        <Link href="/methodology" className="dv-action-link">
          How uncoverd ratings are calculated →
        </Link>
      </p>
      {!isPremium && (
        <div className="dv-premium-gate" style={{ marginTop: "1rem" }}>
          <span className="dv-premium-badge">Premium</span>
          <h2>Unlock the ratings for {symbol}</h2>
          <p>See Value, Growth, Profitability, Momentum, and Health scores plus the composite grade.</p>
          <div className="dv-premium-gate__actions">
            <Link href="/pricing" className="btn">
              See Premium Plans
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function RecommendationTab({
  symbol,
  rating,
  ratios,
  stock,
  isPremium,
}: {
  symbol: string;
  rating: Awaited<ReturnType<typeof getStockRating>>;
  ratios: Awaited<ReturnType<typeof ratiosLatest>>;
  stock: NonNullable<Awaited<ReturnType<typeof getStock>>>;
  isPremium: boolean;
}) {
  const score = rating?.composite_total ?? null;
  const verdict =
    score == null
      ? "Insufficient data"
      : score >= 17
      ? "Strong Buy"
      : score >= 14
      ? "Buy"
      : score >= 12
      ? "Hold"
      : score >= 10
      ? "Reduce"
      : "Avoid";
  const verdictColor =
    score == null
      ? "var(--text-muted)"
      : score >= 14
      ? "var(--positive)"
      : score >= 12
      ? "#fbbf24"
      : "var(--negative)";

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Recommendation — {symbol}</h2>
      {!isPremium ? (
        <div className="dv-premium-gate">
          <span className="dv-premium-badge">Premium</span>
          <h2>Buy/Sell recommendations are a Premium feature</h2>
          <p>
            Premium subscribers see an actionable verdict (Strong Buy / Buy / Hold / Reduce / Avoid) derived from
            uncoverd&apos;s composite rating and key fundamentals.
          </p>
          <div className="dv-premium-gate__actions">
            <Link href="/pricing" className="btn">See Premium Plans</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="dv-stat-card" style={{ maxWidth: 320, padding: "1.25rem" }}>
            <p className="dv-stat-card__label">Current verdict</p>
            <p className="dv-stat-card__value" style={{ color: verdictColor, fontSize: "1.75rem" }}>
              {verdict}
            </p>
            <p className="dv-stat-card__label" style={{ marginTop: "0.35rem" }}>
              Based on uncoverd composite {score ?? "—"} / 20
            </p>
          </div>
          <div className="dv-prose" style={{ marginTop: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Why?</h3>
            <ul>
              <li>
                Composite rating: <strong>{rating?.composite_grade ?? "—"}</strong> ({score ?? "—"} / 20)
              </li>
              <li>
                Current yield: <strong>{formatPercent(stock.dividend_yield)}</strong>
              </li>
              <li>
                Payout ratio:{" "}
                <strong>
                  {ratios?.dividend_payout_ratio != null
                    ? formatPercent(ratios.dividend_payout_ratio * 100)
                    : "—"}
                </strong>
              </li>
              <li>
                P/E: <strong>{ratios?.price_to_earnings_ratio?.toFixed(2) ?? "—"}</strong>
              </li>
            </ul>
            <p>
              This view is a rules-based summary of uncoverd&apos;s ratings — not personalized investment advice.
            </p>
          </div>
        </>
      )}
    </section>
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
  const totalTtm = dividends
    .filter((d) => {
      const t = new Date(d.date).getTime();
      return t > Date.now() - 365 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, d) => sum + (Number(d.dividend) || 0), 0);

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Payouts — {symbol}</h2>
      <div className="dv-card-grid">
        <Stat label="Next/Last Ex-Date" value={lastDiv ? formatDate(lastDiv.date) : "—"} />
        <Stat label="Last Dividend" value={lastDiv ? formatCurrency(lastDiv.dividend, { currency: stock.currency }) : "—"} />
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
                  <td className="dv-td--num">{formatCurrency(d.dividend, { currency: stock.currency })}</td>
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
  // Group dividends by year and sum
  const byYear = new Map<number, number>();
  for (const d of dividends) {
    const y = new Date(d.date).getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + Number(d.dividend || 0));
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

function CaptureTab({
  symbol,
  dividends,
  stock,
  recoveryDays,
  isPremium,
}: {
  symbol: string;
  dividends: Awaited<ReturnType<typeof dividendHistoryBySymbol>>;
  stock: NonNullable<Awaited<ReturnType<typeof getStock>>>;
  recoveryDays: number | null;
  isPremium: boolean;
}) {
  if (!isPremium) {
    return (
      <section className="dv-section">
        <h2 className="dv-section__title">Dividend Capture Strategy — {symbol}</h2>
        <div className="dv-premium-gate">
          <span className="dv-premium-badge">Premium</span>
          <h2>Capture-strategy analysis is a Premium feature</h2>
          <p>
            Premium subscribers see the average post-ex-dividend price-recovery days for{" "}
            {symbol} plus an actionable verdict on whether this stock is a good
            capture-trading candidate.
          </p>
          <div className="dv-premium-gate__actions">
            <Link href="/pricing" className="btn">
              See Premium Plans
            </Link>
          </div>
        </div>
      </section>
    );
  }
  const lastDiv = dividends[0];
  // Verdict based on actual computed recovery days
  let verdict = "—";
  let verdictColor = "var(--text-muted)";
  if (recoveryDays != null) {
    if (recoveryDays <= 5) {
      verdict = "Excellent candidate";
      verdictColor = "var(--positive)";
    } else if (recoveryDays <= 15) {
      verdict = "Good candidate";
      verdictColor = "#34d399";
    } else if (recoveryDays <= 40) {
      verdict = "Moderate";
      verdictColor = "#fbbf24";
    } else {
      verdict = "Poor candidate";
      verdictColor = "var(--negative)";
    }
  }

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Dividend Capture Strategy — {symbol}</h2>
      <div className="dv-card-grid">
        <Stat label="Next/Last Ex-Date" value={lastDiv ? formatDate(lastDiv.date) : "—"} />
        <Stat
          label="Last Dividend"
          value={lastDiv ? formatCurrency(lastDiv.dividend, { currency: stock.currency }) : "—"}
        />
        <Stat label="Yield (FWD)" value={formatPercent(stock.dividend_yield)} />
        <Stat
          label="Avg Recovery (last 8 ex-dates)"
          value={recoveryDays != null ? `${recoveryDays} trading days` : "—"}
        />
        <div className="dv-stat-card">
          <p className="dv-stat-card__label">Capture Verdict</p>
          <p className="dv-stat-card__value" style={{ color: verdictColor, fontSize: "1.15rem" }}>
            {verdict}
          </p>
        </div>
        <Stat label="Frequency" value={lastDiv?.frequency ?? "—"} />
      </div>
      <div className="dv-prose" style={{ marginTop: "1rem" }}>
        <p>
          The dividend-capture strategy is to buy just before the ex-dividend date, collect the dividend, then sell
          once the price recovers. The recovery days shown above are computed from the actual price action across the
          last 8 ex-dividend events for {symbol}: number of trading days until the close returned to the pre-ex price.
        </p>
        <p>
          Lower is better. Under 5 days is excellent; over 40 days suggests the dividend isn&apos;t being absorbed
          quickly by the market and capture trading is risky.
        </p>
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

function RatingCard({
  label,
  score,
  grade,
  max,
  blur,
  blurb,
}: {
  label: string;
  score: number | null;
  grade?: string | null;
  max: number;
  blur?: boolean;
  blurb?: string;
}) {
  if (score == null) {
    return (
      <div className="dv-stat-card">
        <p className="dv-stat-card__label">{label}</p>
        <p className="dv-stat-card__value" style={{ color: "var(--text-muted)" }}>
          —
        </p>
        {blurb && (
          <p className="dv-stat-card__blurb" style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
            {blurb}
          </p>
        )}
      </div>
    );
  }
  const ratio = score / max;
  const color = ratio >= 0.8 ? "var(--positive)" : ratio >= 0.6 ? "#34d399" : ratio >= 0.45 ? "#fbbf24" : "var(--negative)";
  const gradeNode = (
    <span className="dv-stat-card__value" style={{ color, display: "inline-block" }}>
      {grade ?? score.toFixed(0)}
    </span>
  );
  const scoreNode = (
    <span className="dv-stat-card__label" style={{ display: "inline-block" }}>
      {score.toFixed(0)} / {max}
    </span>
  );
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p style={{ margin: 0 }}>
        {blur ? <PremiumLock isPremium={false} inline>{gradeNode}</PremiumLock> : gradeNode}
      </p>
      <p style={{ marginTop: "0.25rem", marginBottom: 0 }}>
        {blur ? <PremiumLock isPremium={false} inline>{scoreNode}</PremiumLock> : scoreNode}
      </p>
      {blurb && (
        <p
          className="dv-stat-card__blurb"
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

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Stat } from "@/components/stat";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";

// Client-side tab controller for the stock detail page. The page itself is now
// statically cached (no per-request auth), so:
//  - public panels are rendered on the server and passed in as `panels` (they
//    live in the cached HTML and are toggled by visibility here);
//  - premium panels (Ratings / Recommendation / Capture) are NOT in the HTML —
//    this component fetches them from the authenticated /api/stocks/premium
//    endpoint, so paying users see real data and the cached page never leaks it.

export type TabDef = { key: string; label: string; premium?: boolean };

type Rating = {
  composite_total: number | null;
  composite_grade: string | null;
  value_score: number | null;
  growth_score: number | null;
  profit_score: number | null;
  momentum_score: number | null;
  health_score: number | null;
} | null;

type PremiumPayload = { isPremium: boolean; rating: Rating; recoveryDays: number | null };

export type StockPremiumProps = {
  symbol: string;
  dividendYield: number | null;
  currency: string | null;
  payoutRatio: number | null;
  peRatio: number | null;
  lastDividend: { date: string; dividend: number | null; frequency: string | null } | null;
};

const VALID = new Set<string>();

export function StockDetailTabs({
  tabs,
  panels,
  premium,
}: {
  tabs: TabDef[];
  panels: Record<string, React.ReactNode>;
  premium: StockPremiumProps;
}) {
  for (const t of tabs) VALID.add(t.key);
  const [active, setActive] = useState<string>("overview");
  const premiumTabs = new Set(tabs.filter((t) => t.premium).map((t) => t.key));

  // Deep-link support without a server round-trip: read ?tab= on mount (not
  // during render), so SSR/first paint matches the server default "overview"
  // and there's no hydration mismatch.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab && VALID.has(tab)) setActive(tab);
  }, []);

  function select(key: string) {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <>
      <nav className="dv-tabs" aria-label="Stock detail tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={`dv-tab ${active === t.key ? "dv-tab--active" : ""}`}
            aria-current={active === t.key ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Public panels: all server-rendered into the cached HTML, shown/hidden
          client-side (good for SEO + instant switching). */}
      {tabs
        .filter((t) => !t.premium)
        .map((t) => (
          <div key={t.key} hidden={active !== t.key}>
            {panels[t.key]}
          </div>
        ))}

      {/* Premium panels: fetched + rendered only client-side. */}
      {premiumTabs.has(active) && <PremiumPanels active={active} premium={premium} />}
    </>
  );
}

function PremiumPanels({ active, premium }: { active: string; premium: StockPremiumProps }) {
  const [data, setData] = useState<PremiumPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/stocks/premium?symbol=${encodeURIComponent(premium.symbol)}`)
      .then((r) => r.json())
      .then((d: PremiumPayload) => setData(d))
      .catch(() => setData({ isPremium: false, rating: null, recoveryDays: null }))
      .finally(() => setLoading(false));
  }, [premium.symbol]);

  const isPremium = data?.isPremium ?? false;

  if (active === "ratings") {
    return <RatingsPanel symbol={premium.symbol} rating={data?.rating ?? null} isPremium={isPremium} loading={loading} />;
  }
  if (active === "recommendation") {
    return (
      <RecommendationPanel
        symbol={premium.symbol}
        rating={data?.rating ?? null}
        premium={premium}
        isPremium={isPremium}
        loading={loading}
      />
    );
  }
  if (active === "capture") {
    return (
      <CapturePanel
        symbol={premium.symbol}
        recoveryDays={data?.recoveryDays ?? null}
        premium={premium}
        isPremium={isPremium}
        loading={loading}
      />
    );
  }
  return null;
}

function PremiumGate({ title, body }: { title: string; body: string }) {
  return (
    <div className="dv-premium-gate" style={{ marginTop: "1rem" }}>
      <span className="dv-premium-badge">Premium</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="dv-premium-gate__actions">
        <Link href="/pricing" className="btn">
          See Premium Plans
        </Link>
      </div>
    </div>
  );
}

function RatingsPanel({
  symbol,
  rating,
  isPremium,
  loading,
}: {
  symbol: string;
  rating: Rating;
  isPremium: boolean;
  loading: boolean;
}) {
  const cards = [
    { key: "overall", label: "Overall", grade: rating?.composite_grade, score: rating?.composite_total ?? null, max: 20, blurb: "Composite of the five pillars below (Value + Growth + Profitability + Momentum + Health, each 0–4). 17–20 = A, 14–16 = B, 12–13 = C, 10–11 = D, below = F." },
    { key: "value", label: "Value", score: rating?.value_score ?? null, max: 5, blurb: "How cheap the stock looks vs peers in its industry — combines P/E, P/B and dividend-yield percentile." },
    { key: "growth", label: "Growth", score: rating?.growth_score ?? null, max: 5, blurb: "5-year revenue + EPS + dividend CAGR scored against industry peers. Rewards consistent compounding." },
    { key: "profit", label: "Profitability", score: rating?.profit_score ?? null, max: 5, blurb: "Net margin, ROE and return on invested capital — how much profit the business squeezes out of its sales and capital." },
    { key: "momentum", label: "Momentum", score: rating?.momentum_score ?? null, max: 5, blurb: "1-year and 3-month total return percentile vs peers. High momentum = market is bidding the stock up." },
    { key: "health", label: "Health", score: rating?.health_score ?? null, max: 5, blurb: "Balance-sheet strength: net debt / EBITDA, interest coverage, dividend payout ratio. Lower-leverage and well-covered dividends score higher." },
  ];
  return (
    <section className="dv-section">
      <h2 className="dv-section__title">uncoverd Ratings — {symbol}</h2>
      {loading ? (
        <div className="dv-empty">Loading…</div>
      ) : (
        <>
          <div className="dv-card-grid">
            {cards.map((c) => (
              <RatingCard key={c.key} label={c.label} score={c.score} grade={c.grade} max={c.max} blurb={c.blurb} />
            ))}
          </div>
          <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Full methodology:{" "}
            <Link href="/methodology" className="dv-action-link">
              How uncoverd ratings are calculated →
            </Link>
          </p>
          {!isPremium && (
            <PremiumGate
              title={`Unlock the ratings for ${symbol}`}
              body="See Value, Growth, Profitability, Momentum, and Health scores plus the composite grade."
            />
          )}
        </>
      )}
    </section>
  );
}

function RecommendationPanel({
  symbol,
  rating,
  premium,
  isPremium,
  loading,
}: {
  symbol: string;
  rating: Rating;
  premium: StockPremiumProps;
  isPremium: boolean;
  loading: boolean;
}) {
  const score = rating?.composite_total ?? null;
  const verdict =
    score == null ? "Insufficient data" : score >= 17 ? "Strong Buy" : score >= 14 ? "Buy" : score >= 12 ? "Hold" : score >= 10 ? "Reduce" : "Avoid";
  const verdictColor =
    score == null ? "var(--text-muted)" : score >= 14 ? "var(--positive)" : score >= 12 ? "#fbbf24" : "var(--negative)";

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Recommendation — {symbol}</h2>
      {loading ? (
        <div className="dv-empty">Loading…</div>
      ) : !isPremium ? (
        <PremiumGate
          title="Buy/Sell recommendations are a Premium feature"
          body="Premium subscribers see an actionable verdict (Strong Buy / Buy / Hold / Reduce / Avoid) derived from uncoverd's composite rating and key fundamentals."
        />
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
              <li>Composite rating: <strong>{rating?.composite_grade ?? "—"}</strong> ({score ?? "—"} / 20)</li>
              <li>Current yield: <strong>{formatPercent(premium.dividendYield)}</strong></li>
              <li>Payout ratio: <strong>{premium.payoutRatio != null ? formatPercent(premium.payoutRatio * 100) : "—"}</strong></li>
              <li>P/E: <strong>{premium.peRatio?.toFixed(2) ?? "—"}</strong></li>
            </ul>
            <p>This view is a rules-based summary of uncoverd&apos;s ratings — not personalized investment advice.</p>
          </div>
        </>
      )}
    </section>
  );
}

function CapturePanel({
  symbol,
  recoveryDays,
  premium,
  isPremium,
  loading,
}: {
  symbol: string;
  recoveryDays: number | null;
  premium: StockPremiumProps;
  isPremium: boolean;
  loading: boolean;
}) {
  const lastDiv = premium.lastDividend;
  let verdict = "—";
  let verdictColor = "var(--text-muted)";
  if (recoveryDays != null) {
    if (recoveryDays <= 5) { verdict = "Excellent candidate"; verdictColor = "var(--positive)"; }
    else if (recoveryDays <= 15) { verdict = "Good candidate"; verdictColor = "#34d399"; }
    else if (recoveryDays <= 40) { verdict = "Moderate"; verdictColor = "#fbbf24"; }
    else { verdict = "Poor candidate"; verdictColor = "var(--negative)"; }
  }

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Dividend Capture Strategy — {symbol}</h2>
      {loading ? (
        <div className="dv-empty">Loading…</div>
      ) : !isPremium ? (
        <PremiumGate
          title="Capture-strategy analysis is a Premium feature"
          body={`Premium subscribers see the average post-ex-dividend price-recovery days for ${symbol} plus an actionable verdict on whether this stock is a good capture-trading candidate.`}
        />
      ) : (
        <>
          <div className="dv-card-grid">
            <Stat label="Next/Last Ex-Date" value={lastDiv ? formatDate(lastDiv.date) : "—"} />
            <Stat label="Last Dividend" value={lastDiv ? formatCurrency(lastDiv.dividend, { currency: premium.currency }) : "—"} />
            <Stat label="Yield (FWD)" value={formatPercent(premium.dividendYield)} />
            <Stat label="Avg Recovery (last 8 ex-dates)" value={recoveryDays != null ? `${recoveryDays} trading days` : "—"} />
            <div className="dv-stat-card">
              <p className="dv-stat-card__label">Capture Verdict</p>
              <p className="dv-stat-card__value" style={{ color: verdictColor, fontSize: "1.15rem" }}>{verdict}</p>
            </div>
            <Stat label="Frequency" value={lastDiv?.frequency ?? "—"} />
          </div>
          <div className="dv-prose" style={{ marginTop: "1rem" }}>
            <p>
              The dividend-capture strategy is to buy just before the ex-dividend date, collect the dividend, then sell
              once the price recovers. The recovery days shown above are computed from the actual price action across the
              last 8 ex-dividend events for {symbol}: number of trading days until the close returned to the pre-ex price.
            </p>
            <p>Lower is better. Under 5 days is excellent; over 40 days suggests the dividend isn&apos;t being absorbed quickly by the market and capture trading is risky.</p>
          </div>
        </>
      )}
    </section>
  );
}

function RatingCard({
  label,
  score,
  grade,
  max,
  blurb,
}: {
  label: string;
  score: number | null;
  grade?: string | null;
  max: number;
  blurb?: string;
}) {
  if (score == null) {
    return (
      <div className="dv-stat-card">
        <p className="dv-stat-card__label">{label}</p>
        <p className="dv-stat-card__value" style={{ color: "var(--text-muted)" }}>—</p>
        {blurb && (
          <p className="dv-stat-card__blurb" style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.35 }}>{blurb}</p>
        )}
      </div>
    );
  }
  const ratio = score / max;
  const color = ratio >= 0.8 ? "var(--positive)" : ratio >= 0.6 ? "#34d399" : ratio >= 0.45 ? "#fbbf24" : "var(--negative)";
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p style={{ margin: 0 }}>
        <span className="dv-stat-card__value" style={{ color, display: "inline-block" }}>{grade ?? score.toFixed(0)}</span>
      </p>
      <p style={{ marginTop: "0.25rem", marginBottom: 0 }}>
        <span className="dv-stat-card__label" style={{ display: "inline-block" }}>{score.toFixed(0)} / {max}</span>
      </p>
      {blurb && (
        <p className="dv-stat-card__blurb" style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4, borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>{blurb}</p>
      )}
    </div>
  );
}

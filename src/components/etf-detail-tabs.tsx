"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/use-locale";
import { dLabel } from "@/lib/detail-i18n";

// Client-side tab controller for the ETF detail page (mirrors StockDetailTabs).
// Public panels are server-rendered into the cached HTML and toggled here; the
// premium "rating" breakdown is fetched from the authenticated
// /api/etfs/premium so it never lands in the cached HTML.

export type TabDef = { key: string; label: string; premium?: boolean };

type EtfRating = {
  composite: number | null;
  grade: string;
  yieldScore: number | null;
  aumScore: number | null;
  costScore: number | null;
  returnScore: number | null;
} | null;

type PremiumPayload = { isPremium: boolean; rating: EtfRating };

const VALID = new Set<string>();

export function EtfDetailTabs({
  tabs,
  panels,
  symbol,
}: {
  tabs: TabDef[];
  panels: Record<string, React.ReactNode>;
  symbol: string;
}) {
  for (const t of tabs) VALID.add(t.key);
  const locale = useLocale();
  const [active, setActive] = useState<string>("overview");
  const premiumTabs = new Set(tabs.filter((t) => t.premium).map((t) => t.key));

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
      <nav className="dv-tabs" aria-label="ETF detail tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={`dv-tab ${active === t.key ? "dv-tab--active" : ""}`}
            aria-current={active === t.key ? "page" : undefined}
          >
            {dLabel(t.label, locale)}
          </button>
        ))}
      </nav>

      {tabs
        .filter((t) => !t.premium)
        .map((t) => (
          <div key={t.key} hidden={active !== t.key}>
            {panels[t.key]}
          </div>
        ))}

      {premiumTabs.has(active) && <RatingPanel symbol={symbol} />}
    </>
  );
}

function RatingPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<PremiumPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch(`/api/etfs/premium?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d: PremiumPayload) => setData(d))
      .catch(() => setData({ isPremium: false, rating: null }))
      .finally(() => setLoading(false));
  }, [symbol]);

  const rating = data?.rating ?? null;

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">ETF rating — {symbol}</h2>
      {loading ? (
        <div className="dv-empty">Loading…</div>
      ) : !data?.isPremium ? (
        <div className="dv-premium-gate">
          <span className="dv-premium-badge">Premium</span>
          <h2>ETF ratings are a Premium feature</h2>
          <p>See the composite ETF score plus the individual yield, AUM, expense-ratio and return components.</p>
          <div className="dv-premium-gate__actions">
            <Link href="/pricing" className="btn">See Premium Plans</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="dv-card-grid">
            <RatingCell label="Composite" value={rating?.composite ?? null} grade={rating?.grade} max={5} blurb="Average of the four components below. A ≥ 4, B ≥ 3, C ≥ 2, D ≥ 1, otherwise F. Missing inputs are dropped from the average rather than penalized." />
            <RatingCell label="Yield" value={rating?.yieldScore ?? null} max={5} blurb="Distribution yield over the trailing 12 months. 0% → 0, 4% → 3, 6%+ → 5 (capped to avoid rewarding yield traps)." />
            <RatingCell label="AUM / size" value={rating?.aumScore ?? null} max={5} blurb="Asset base — proxy for liquidity and survivorship risk. Below $100M → 0.5, $1B → ~3, $50B+ → 5." />
            <RatingCell label="Cost (expense ratio)" value={rating?.costScore ?? null} max={5} blurb="Annual fee drag. Below 0.10% → 5, 0.50% → 3, above 1.00% → 1. Lower fees compound to higher long-run returns." />
            <RatingCell label="1-Year return" value={rating?.returnScore ?? null} max={5} blurb="Trailing 12-month total return (price + distributions). Negative → 0, 8% → 3, 20%+ → 5." />
          </div>
          <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Full methodology:{" "}
            <Link href="/methodology" className="dv-action-link">How uncoverd ratings are calculated →</Link>
          </p>
        </>
      )}
    </section>
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
        <p className="dv-stat-card__value" style={{ color: "var(--text-muted)" }}>—</p>
        {blurb && (
          <p style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{blurb}</p>
        )}
      </div>
    );
  }
  const ratio = value / max;
  const color = ratio >= 0.8 ? "var(--positive)" : ratio >= 0.6 ? "#34d399" : ratio >= 0.45 ? "#fbbf24" : "var(--negative)";
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value" style={{ color }}>{grade ?? value.toFixed(2)}</p>
      <p className="dv-stat-card__label" style={{ marginTop: "0.25rem" }}>{value.toFixed(2)} / {max}</p>
      {blurb && (
        <p style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4, borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>{blurb}</p>
      )}
    </div>
  );
}

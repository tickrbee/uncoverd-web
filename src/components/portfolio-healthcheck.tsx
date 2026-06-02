"use client";

import { useEffect, useRef, useState } from "react";
import type { HealthResult } from "@/lib/portfolio-health";

type Suggestion = { symbol: string; name: string | null; is_etf?: boolean | null };

function fmtPct(v: number | null): string {
  return v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function fmtNum(v: number | null): string {
  return v == null ? "—" : v.toFixed(2);
}
// Correlation cell colour: 1 = strong (red), 0 = neutral, <0 = diversifying (green).
function corrColor(v: number | null): string {
  if (v == null) return "transparent";
  if (v >= 0.7) return "rgba(248,113,113,0.30)";
  if (v >= 0.4) return "rgba(251,191,36,0.25)";
  if (v >= 0.1) return "rgba(148,163,184,0.18)";
  return "rgba(52,211,153,0.28)";
}

export function PortfolioHealthcheck() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<{ symbol: string; name: string | null }[]>([]);
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 1) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        setSuggestions(data.results ?? []);
      } catch { /* best effort */ }
    }, 150);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  function add(s: Suggestion) {
    if (selected.length >= 25 || selected.some((x) => x.symbol === s.symbol)) return;
    setSelected((prev) => [...prev, { symbol: s.symbol, name: s.name }]);
    setQuery("");
    setSuggestions([]);
  }
  function remove(symbol: string) {
    setSelected((prev) => prev.filter((x) => x.symbol !== symbol));
  }

  async function analyze() {
    if (selected.length < 1) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/portfolio/healthcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: selected.map((s) => s.symbol) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Something went wrong."); return; }
      setResult(data as HealthResult);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dv-section" style={{ maxWidth: 920 }}>
      {/* Picker */}
      <div className="panel stack" style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a holding — e.g. SCHD, AAPL, JEPI, O"
          className="login-input"
          aria-label="Search holdings"
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <ul className="dv-search-suggestions" role="listbox" style={{ position: "absolute", top: "3.2rem", left: 0, right: 0, zIndex: 20 }}>
            {suggestions.slice(0, 8).map((s) => (
              <li key={s.symbol} className="dv-search-suggestion" onMouseDown={(e) => { e.preventDefault(); add(s); }}>
                <span className="dv-search-suggestion__symbol">{s.symbol}</span>
                <span className="dv-search-suggestion__name">{s.name ?? ""}</span>
              </li>
            ))}
          </ul>
        )}

        {selected.length > 0 && (
          <div className="dv-filters" style={{ marginTop: "0.75rem" }}>
            {selected.map((s) => (
              <button key={s.symbol} type="button" className="dv-chip dv-chip--active" onClick={() => remove(s.symbol)} title="Remove">
                {s.symbol} ✕
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          <button type="button" className="btn" onClick={analyze} disabled={selected.length < 1 || loading}>
            {loading ? "Analyzing…" : `Analyze ${selected.length || ""} holding${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      {error && <p className="notice notice--error" style={{ marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.5rem", display: "grid", gap: "1.5rem" }}>
          {/* Summary */}
          <section>
            <h2 className="dv-section__title">Portfolio summary <span style={{ float: "right", fontWeight: 700 }}>Grade {result.portfolio.grade}</span></h2>
            <div className="dv-card-grid">
              <Stat label="Annual return (est.)" value={fmtPct(result.portfolio.annualReturn)} />
              <Stat label="Volatility (annual)" value={fmtPct(result.portfolio.annualVol)} />
              <Stat label="Blended dividend yield" value={fmtPct(result.portfolio.blendedYield)} />
              <Stat label="Diversification ratio" value={fmtNum(result.portfolio.diversificationRatio)} hint=">1 = diversification benefit" />
              <Stat label="Avg. correlation" value={fmtNum(result.portfolio.avgCorrelation)} hint="lower = better diversified" />
              <Stat label="Weighted beta" value={fmtNum(result.portfolio.weightedBeta)} />
            </div>
          </section>

          {/* Correlation heatmap */}
          {result.correlation.symbols.length >= 2 && (
            <section>
              <h2 className="dv-section__title">Correlation matrix</h2>
              <div className="dv-table-scroll">
                <table className="dv-table dv-corr">
                  <thead>
                    <tr>
                      <th></th>
                      {result.correlation.symbols.map((s) => <th key={s} className="dv-th--num">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.correlation.matrix.map((row, i) => (
                      <tr key={result.correlation.symbols[i]}>
                        <td><strong>{result.correlation.symbols[i]}</strong></td>
                        {row.map((v, j) => (
                          <td key={j} className="dv-td--num" style={{ background: corrColor(v) }}>{v == null ? "—" : v.toFixed(2)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
                Green = low/negative correlation (diversifying); red = highly correlated (moves together).
              </p>
            </section>
          )}

          {/* Sector concentration */}
          {result.sectorWeights.length > 0 && (
            <section>
              <h2 className="dv-section__title">Sector concentration</h2>
              <div style={{ display: "grid", gap: "0.4rem" }}>
                {result.sectorWeights.map((s) => (
                  <div key={s.sector} style={{ display: "grid", gridTemplateColumns: "180px 1fr 48px", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "0.85rem" }}>{s.sector}</span>
                    <span style={{ background: "var(--border-subtle)", borderRadius: 4, height: 10 }}>
                      <span style={{ display: "block", width: `${Math.round(s.weight * 100)}%`, height: "100%", background: "var(--positive,#34d399)", borderRadius: 4 }} />
                    </span>
                    <span style={{ fontSize: "0.8rem", textAlign: "right" }}>{Math.round(s.weight * 100)}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Per-holding */}
          <section>
            <h2 className="dv-section__title">Holdings</h2>
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr><th>Symbol</th><th>Name</th><th>Sector</th><th className="dv-th--num">Return (1Y est.)</th><th className="dv-th--num">Volatility</th><th className="dv-th--num">Yield</th><th className="dv-th--num">Beta</th></tr>
                </thead>
                <tbody>
                  {result.holdings.map((h) => (
                    <tr key={h.symbol}>
                      <td><strong>{h.symbol}</strong></td>
                      <td>{h.name ?? "—"}</td>
                      <td>{h.sector ?? "—"}</td>
                      <td className="dv-td--num">{fmtPct(h.annualReturn)}</td>
                      <td className="dv-td--num">{fmtPct(h.annualVol)}</td>
                      <td className="dv-td--num">{fmtPct(h.dividendYield)}</td>
                      <td className="dv-td--num">{fmtNum(h.beta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {result.notes.length > 0 && (
            <ul style={{ color: "var(--text-muted)", fontSize: "0.82rem", paddingLeft: "1.1rem" }}>
              {result.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            Equal-weighted estimates from ~1 year of daily prices. For research only — not investment advice.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value">{value}</p>
      {hint && <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{hint}</p>}
    </div>
  );
}

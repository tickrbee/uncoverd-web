"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import type { HealthResult } from "@/lib/portfolio-health";

type Suggestion = { symbol: string; name: string | null; is_etf?: boolean | null };
type Picked = { symbol: string; name: string | null; weight: string };

const POS = "#34d399";
const NEG = "#f87171";
const ACCENT = "#60a5fa";
const MUTED = "#94a3b8";

const fmtPct = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
const fmtPctPlain = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtNum = (v: number | null) => (v == null ? "—" : v.toFixed(2));

function corrColor(v: number | null): string {
  if (v == null) return "transparent";
  if (v >= 0.7) return "rgba(248,113,113,0.30)";
  if (v >= 0.4) return "rgba(251,191,36,0.25)";
  if (v >= 0.1) return "rgba(148,163,184,0.18)";
  return "rgba(52,211,153,0.28)";
}
function gradeColor(g: string | null): string {
  if (!g) return MUTED;
  if (g.startsWith("A")) return POS;
  if (g.startsWith("B")) return "#a3e635";
  if (g.startsWith("C")) return "#fbbf24";
  return NEG;
}

export function PortfolioHealthcheck() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Picked[]>([]);
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
    setSelected((prev) => [...prev, { symbol: s.symbol, name: s.name, weight: "" }]);
    setQuery(""); setSuggestions([]);
  }
  function remove(symbol: string) { setSelected((prev) => prev.filter((x) => x.symbol !== symbol)); }
  function setWeight(symbol: string, weight: string) {
    setSelected((prev) => prev.map((x) => (x.symbol === symbol ? { ...x, weight } : x)));
  }

  const weightSum = selected.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0);
  const anyWeights = selected.some((s) => parseFloat(s.weight) > 0);

  async function analyze() {
    if (selected.length < 1) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const body = anyWeights
        ? { holdings: selected.map((s) => ({ symbol: s.symbol, weight: parseFloat(s.weight) || 0 })) }
        : { symbols: selected.map((s) => s.symbol) };
      const res = await fetch("/api/portfolio/healthcheck", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Something went wrong."); return; }
      setResult(data as HealthResult);
    } catch {
      setError("Network error — please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="dv-section" style={{ maxWidth: 1080 }}>
      {/* Builder */}
      <div className="panel stack" style={{ position: "relative" }}>
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a holding — e.g. SCHD, AAPL, JEPI, O"
          className="login-input" aria-label="Search holdings" autoComplete="off"
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
          <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.4rem" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
              Optional: enter a weight (% or $) per holding for a weighted analysis. Leave blank for equal-weight.
            </p>
            {selected.map((s) => (
              <div key={s.symbol} style={{ display: "grid", gridTemplateColumns: "auto 1fr 92px auto", alignItems: "center", gap: "0.6rem" }}>
                <strong style={{ minWidth: 56 }}>{s.symbol}</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name ?? ""}</span>
                <input
                  type="number" min="0" step="any" value={s.weight} onChange={(e) => setWeight(s.symbol, e.target.value)}
                  placeholder="wt" className="login-input" style={{ padding: "0.35rem 0.5rem", textAlign: "right" }} aria-label={`Weight for ${s.symbol}`}
                />
                <button type="button" className="dv-chip" onClick={() => remove(s.symbol)} title="Remove" style={{ padding: "0.2rem 0.5rem" }}>✕</button>
              </div>
            ))}
            {anyWeights && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                Weights are normalised to 100% (you entered {Math.round(weightSum * 100) / 100}).
              </p>
            )}
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
        <div style={{ marginTop: "1.5rem", display: "grid", gap: "1.75rem" }}>
          <ScoreHeader result={result} />
          {result.insights.length > 0 && <Insights result={result} />}
          {result.benchmark && <Performance result={result} />}
          <RiskCards result={result} />
          {result.subscores.length > 0 && <Subscores result={result} />}
          {result.factors.some((f) => f.port !== 50) && <FactorRadar result={result} />}
          <Holdings result={result} />
          {result.sectorWeights.length > 0 && <Sectors result={result} />}
          {result.correlation.symbols.length >= 2 && <Correlation result={result} />}
          {result.optimize?.ok && <Frontier result={result} />}

          {result.notes.length > 0 && (
            <ul style={{ color: "var(--text-muted)", fontSize: "0.82rem", paddingLeft: "1.1rem" }}>
              {result.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            Estimates from ~1 year of daily prices and uncoverd ratings. Benchmark: S&P 500 (SPY). For research only — not investment advice.
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- sections ----------------------------- */

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section>
      <h2 className="dv-section__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>{title}</span>{aside}
      </h2>
      {children}
    </section>
  );
}

function ScoreHeader({ result }: { result: HealthResult }) {
  const score = result.overall ?? 0;
  const grade = result.portfolio.grade;
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  return (
    <section className="panel" style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
        <svg width={130} height={130}>
          <circle cx={65} cy={65} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={11} />
          <circle cx={65} cy={65} r={r} fill="none" stroke={gradeColor(grade)} strokeWidth={11} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 65 65)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>{result.overall ?? "—"}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>/ 100</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <p className="dv-eyebrow" style={{ margin: 0 }}>Portfolio health</p>
        <h2 style={{ margin: "0.2rem 0 0.6rem", fontSize: "1.6rem" }}>
          Grade <span style={{ color: gradeColor(grade) }}>{grade}</span>
        </h2>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <KV label="Est. annual return" value={fmtPct(result.portfolio.annualReturn)} />
          <KV label="Volatility" value={fmtPctPlain(result.portfolio.annualVol)} />
          <KV label="Blended yield" value={fmtPctPlain(result.portfolio.blendedYield)} />
          <KV label="Weighted beta" value={fmtNum(result.portfolio.weightedBeta)} />
        </div>
      </div>
    </section>
  );
}

function Insights({ result }: { result: HealthResult }) {
  const color = (s: string) => (s === "critical" ? NEG : s === "warning" ? "#fbbf24" : POS);
  return (
    <Section title="What stands out">
      <div style={{ display: "grid", gap: "0.6rem" }}>
        {result.insights.map((ins, i) => (
          <div key={i} className="panel" style={{ borderLeft: `3px solid ${color(ins.severity)}`, padding: "0.8rem 1rem" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{ins.title}</p>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5 }}>{ins.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Performance({ result }: { result: HealthResult }) {
  const b = result.benchmark!;
  return (
    <Section title="Performance vs S&P 500">
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={b.curve} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <XAxis dataKey="i" tick={false} stroke={MUTED} label={{ value: "~1 year", position: "insideBottom", fill: MUTED, fontSize: 11 }} />
            <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #243049", borderRadius: 8 }} formatter={(v) => `$${v}`} labelFormatter={() => ""} />
            <Legend />
            <Line type="monotone" dataKey="port" name="Your portfolio" stroke={ACCENT} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="bench" name="S&P 500" stroke={MUTED} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="dv-card-grid" style={{ marginTop: "0.75rem" }}>
        <Stat label="Portfolio CAGR" value={fmtPct(b.cagr)} />
        <Stat label="S&P CAGR" value={fmtPct(b.benchCagr)} />
        <Stat label="Up capture" value={b.upCapture == null ? "—" : `${b.upCapture}%`} />
        <Stat label="Down capture" value={b.downCapture == null ? "—" : `${b.downCapture}%`} hint="lower is better" />
        <Stat label="Tracking error" value={fmtPctPlain(b.trackingError)} />
        <Stat label="R² to market" value={fmtNum(b.r2)} />
      </div>
    </Section>
  );
}

function RiskCards({ result }: { result: HealthResult }) {
  const r = result.risk;
  return (
    <Section title="Risk metrics">
      <div className="dv-card-grid">
        <Stat label="Sharpe ratio" value={fmtNum(r.sharpe)} hint="return per unit of risk" />
        <Stat label="Sortino ratio" value={fmtNum(r.sortino)} hint="downside-risk adjusted" />
        <Stat label="Max drawdown" value={fmtPctPlain(r.maxDrawdown)} hint="worst peak-to-trough" />
        <Stat label="1-day VaR (95%)" value={fmtPctPlain(r.var1d)} hint="typical bad day" />
        <Stat label="Volatility" value={fmtPctPlain(result.portfolio.annualVol)} />
        <Stat label="Diversification" value={fmtNum(result.portfolio.diversificationRatio)} hint=">1 = benefit" />
      </div>
    </Section>
  );
}

function Subscores({ result }: { result: HealthResult }) {
  return (
    <Section title="Score breakdown">
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {result.subscores.map((s) => (
          <div key={s.key} style={{ display: "grid", gridTemplateColumns: "190px 1fr 40px", alignItems: "center", gap: "0.7rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{s.key}<br /><span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{s.note}</span></span>
            <span style={{ background: "var(--border-subtle)", borderRadius: 4, height: 9 }}>
              <span style={{ display: "block", width: `${s.score}%`, height: "100%", background: s.score >= 70 ? POS : s.score >= 50 ? "#fbbf24" : NEG, borderRadius: 4 }} />
            </span>
            <span style={{ fontSize: "0.82rem", textAlign: "right", fontWeight: 700 }}>{s.score}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FactorRadar({ result }: { result: HealthResult }) {
  return (
    <Section title="Factor exposure">
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <RadarChart data={result.factors} outerRadius="72%">
            <PolarGrid stroke="var(--border-subtle)" />
            <PolarAngleAxis dataKey="factor" tick={{ fill: MUTED, fontSize: 12 }} />
            <Radar name="S&P 500" dataKey="bench" stroke={MUTED} fill={MUTED} fillOpacity={0.12} />
            <Radar name="Your portfolio" dataKey="port" stroke={ACCENT} fill={ACCENT} fillOpacity={0.32} />
            <Legend />
            <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #243049", borderRadius: 8 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.3rem" }}>
        Factor tilts vs a neutral market baseline (50), from uncoverd ratings, yield and volatility.
      </p>
    </Section>
  );
}

function Holdings({ result }: { result: HealthResult }) {
  return (
    <Section title="Holdings">
      <div className="dv-table-scroll">
        <table className="dv-table">
          <thead>
            <tr>
              <th>Symbol</th><th>Name</th><th className="dv-th--num">Weight</th><th className="dv-th--num">Rating</th>
              <th className="dv-th--num">Return 1Y</th><th className="dv-th--num">Vol</th><th className="dv-th--num">Yield</th><th className="dv-th--num">Beta</th>
            </tr>
          </thead>
          <tbody>
            {result.holdings.map((h) => (
              <tr key={h.symbol}>
                <td><strong>{h.symbol}</strong></td>
                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name ?? "—"}</td>
                <td className="dv-td--num">{Math.round(h.weight * 1000) / 10}%</td>
                <td className="dv-td--num">{h.grade ? <span style={{ color: gradeColor(h.grade), fontWeight: 700 }}>{h.grade}</span> : "—"}</td>
                <td className="dv-td--num">{fmtPct(h.annualReturn)}</td>
                <td className="dv-td--num">{fmtPctPlain(h.annualVol)}</td>
                <td className="dv-td--num">{fmtPctPlain(h.dividendYield)}</td>
                <td className="dv-td--num">{fmtNum(h.beta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Sectors({ result }: { result: HealthResult }) {
  return (
    <Section title="Sector concentration">
      <div style={{ display: "grid", gap: "0.4rem" }}>
        {result.sectorWeights.map((s) => (
          <div key={s.sector} style={{ display: "grid", gridTemplateColumns: "180px 1fr 48px", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "0.85rem" }}>{s.sector}</span>
            <span style={{ background: "var(--border-subtle)", borderRadius: 4, height: 10 }}>
              <span style={{ display: "block", width: `${Math.round(s.weight * 100)}%`, height: "100%", background: s.weight > 0.4 ? "#fbbf24" : POS, borderRadius: 4 }} />
            </span>
            <span style={{ fontSize: "0.8rem", textAlign: "right" }}>{Math.round(s.weight * 100)}%</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Correlation({ result }: { result: HealthResult }) {
  return (
    <Section title="Correlation matrix">
      <div className="dv-table-scroll">
        <table className="dv-table dv-corr">
          <thead>
            <tr><th></th>{result.correlation.symbols.map((s) => <th key={s} className="dv-th--num">{s}</th>)}</tr>
          </thead>
          <tbody>
            {result.correlation.matrix.map((row, i) => (
              <tr key={result.correlation.symbols[i]}>
                <td><strong>{result.correlation.symbols[i]}</strong></td>
                {row.map((v, j) => <td key={j} className="dv-td--num" style={{ background: corrColor(v) }}>{v == null ? "—" : v.toFixed(2)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
        Green = diversifying (low/negative correlation); red = moves together.
      </p>
    </Section>
  );
}

function Frontier({ result }: { result: HealthResult }) {
  const o = result.optimize!;
  const cur = { x: o.current?.vol ?? 0, y: o.current?.ret ?? 0 };
  const min = { x: o.minVariance.vol, y: o.minVariance.ret };
  const max = { x: o.maxSharpe.vol, y: o.maxSharpe.ret };
  return (
    <Section title="Efficient frontier & optimisation">
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 16, bottom: 16, left: -4 }}>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Volatility" unit="%" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }}
              label={{ value: "Risk (annual volatility %)", position: "insideBottom", offset: -6, fill: MUTED, fontSize: 11 }} domain={["auto", "auto"]} />
            <YAxis type="number" dataKey="y" name="Return" unit="%" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }}
              label={{ value: "Return %", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 11 }} domain={["auto", "auto"]} />
            <ZAxis range={[40, 40]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#0b1220", border: "1px solid #243049", borderRadius: 8 }}
              formatter={(v, n) => [`${v}%`, n]} />
            <Scatter name="Possible portfolios" data={o.cloud} fill={MUTED} fillOpacity={0.28} />
            <Scatter name="Efficient frontier" data={o.frontier} fill={ACCENT} line={{ stroke: ACCENT, strokeWidth: 2 }} shape={() => <g />} />
            <Scatter name="Your portfolio" data={[cur]} fill="#fff" shape="circle" />
            <Scatter name="Min-risk" data={[min]} fill={POS} shape="triangle" />
            <Scatter name="Max-Sharpe" data={[max]} fill="#fbbf24" shape="star" />
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="dv-card-grid" style={{ marginTop: "0.5rem" }}>
        <Stat label="Your portfolio" value={`${o.current?.ret ?? "—"}% / ${o.current?.vol ?? "—"}%`} hint={`Sharpe ${o.current?.sharpe ?? "—"}`} />
        <Stat label="Min-risk mix" value={`${o.minVariance.ret}% / ${o.minVariance.vol}%`} hint={`Sharpe ${o.minVariance.sharpe}`} />
        <Stat label="Max-Sharpe mix" value={`${o.maxSharpe.ret}% / ${o.maxSharpe.vol}%`} hint={`Sharpe ${o.maxSharpe.sharpe}`} />
      </div>

      {o.suggestions.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ fontWeight: 700, margin: "0 0 0.4rem", fontSize: "0.95rem" }}>Rebalance toward the max-Sharpe mix</p>
          <div className="dv-table-scroll">
            <table className="dv-table">
              <thead><tr><th>Holding</th><th className="dv-th--num">Current</th><th className="dv-th--num">Suggested</th><th className="dv-th--num">Change</th></tr></thead>
              <tbody>
                {o.suggestions.map((s) => (
                  <tr key={s.symbol}>
                    <td><strong>{s.symbol}</strong></td>
                    <td className="dv-td--num">{s.from}%</td>
                    <td className="dv-td--num">{s.to}%</td>
                    <td className="dv-td--num" style={{ color: s.delta > 0 ? POS : NEG, fontWeight: 700 }}>{s.delta > 0 ? "+" : ""}{s.delta}pt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.3rem" }}>
            Long-only mean-variance optimisation on ~1y of returns. Expected returns are noisy — treat as a starting point, not a trade list.
          </p>
        </div>
      )}
    </Section>
  );
}

/* ----------------------------- small bits ----------------------------- */

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value">{value}</p>
      {hint && <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{hint}</p>}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

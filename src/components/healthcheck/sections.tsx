/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  ScatterChart, Scatter, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  CartesianGrid, XAxis, YAxis, ZAxis, Tooltip, Cell,
} from "recharts";
import {
  T, display, body, mono, Icon, Panel, Eyebrow, Stat, Pill, Chip, Tip,
  HealthGauge, ScoreBar, scoreColor, gradeOf, usd, pct,
} from "./theme";
import { typeColor, typeLabel } from "./ui";
import { isRealSector } from "./data";

/* ============================== COMPARE MODAL ============================== */
// Index proxies (ETFs that exist in the DB) + free search for any stock/ETF.
const INDEX_PRESETS: { label: string; sym: string }[] = [
  { label: "S&P 500", sym: "SPY" }, { label: "Nasdaq 100", sym: "QQQ" }, { label: "Dow Jones", sym: "DIA" },
  { label: "Russell 2000", sym: "IWM" }, { label: "CAC 40", sym: "EWQ" }, { label: "DAX (Germany)", sym: "EWG" },
  { label: "FTSE 100", sym: "EWU" }, { label: "Euro Stoxx 50", sym: "FEZ" }, { label: "Nikkei (Japan)", sym: "EWJ" },
  { label: "Emerging Mkts", sym: "EEM" }, { label: "World", sym: "URTH" },
];

function CompareModal({ open, onClose, cmps, onAdd, onRemove }: any) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const deb = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!open) return;
    if (deb.current) clearTimeout(deb.current);
    const term = q.trim();
    if (term.length < 1) { setResults([]); return; }
    setLoading(true);
    deb.current = setTimeout(async () => {
      try { const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`); const d = await r.json(); setResults(Array.isArray(d.results) ? d.results : []); }
      catch { setResults([]); } finally { setLoading(false); }
    }, 180);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, open]);
  if (!open || typeof document === "undefined") return null;
  const has = (s: string) => cmps.some((c: any) => c.symbol === s);

  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(3,6,12,0.82)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 18px 18px", fontFamily: body }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(560px, 100%)", background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: 22, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color: T.ink, margin: 0 }}>Compare against…</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex" }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint, marginBottom: 9 }}>Indices</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
          {INDEX_PRESETS.map((ix) => {
            const on = has(ix.sym);
            return <button key={ix.sym} onClick={() => (on ? onRemove(ix.sym) : onAdd(ix.sym, ix.label))} className="hc-sampleChip" style={{ background: on ? T.green : T.panel2, color: on ? T.bg : T.muted, border: `1px solid ${on ? T.green : T.line2}`, borderRadius: 18, padding: "6px 12px", cursor: "pointer", fontFamily: body, fontSize: 12.5, fontWeight: on ? 700 : 500 }}>{on ? "✓ " : "+ "}{ix.label}</button>;
          })}
        </div>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", display: "flex" }}><Icon name="search" size={16} color={T.faint} /></span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="…or search any stock or ETF" style={{ width: "100%", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "12px 14px 12px 38px", color: T.ink, fontFamily: body, fontSize: 14, outline: "none" }} />
        </div>
        <div style={{ overflowY: "auto", flex: 1, border: q.trim() ? `1px solid ${T.line}` : "none", borderRadius: 12 }}>
          {q.trim().length < 1 ? null
            : loading ? <div style={{ padding: 16, fontSize: 13, color: T.faint, textAlign: "center" }}>Searching…</div>
            : results.length === 0 ? <div style={{ padding: 16, fontSize: 13, color: T.faint, textAlign: "center" }}>No matches.</div>
            : results.map((r, i) => {
              const on = has(r.symbol);
              return (
                <button key={r.symbol} onClick={() => (on ? onRemove(r.symbol) : onAdd(r.symbol, r.symbol))} className="hc-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", cursor: "pointer", background: "transparent", border: "none", borderTop: i ? `1px solid ${T.line}` : "none", textAlign: "left" }}>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink, width: 64 }}>{r.symbol}</span>
                  <span style={{ flex: 1, fontSize: 13, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ fontFamily: body, fontSize: 12, fontWeight: 700, color: on ? T.faint : T.green }}>{on ? "Added" : "+ Add"}</span>
                </button>
              );
            })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} className="hc-btnPrimary" style={{ background: T.green, color: T.bg, border: "none", borderRadius: 10, padding: "10px 20px", fontFamily: body, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Done</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ============================== OVERVIEW ============================== */
export function Overview({ p, onRemove }: any) {
  const up = p.dayChg >= 0;
  const [cmps, setCmps] = React.useState<{ symbol: string; label: string; vals: number[] }[]>([]);
  const [cmpOpen, setCmpOpen] = React.useState(false);
  const eqLen = p.equity.length;
  const cmpColors = [T.violet, T.gold, T.teal, T.red, T.blue];
  const addCompare = async (sym: string, label?: string) => {
    const s = (sym || "").trim().toUpperCase();
    if (!s || cmps.some((c) => c.symbol === s)) return;
    try {
      const res = await fetch(`/api/prices?symbol=${encodeURIComponent(s)}&days=420`);
      const data = await res.json();
      const pts: any[] = data.points || [];
      if (pts.length < 5) return;
      const base = pts[0].close;
      const norm = pts.map((x: any) => (x.close / base) * 100);
      const vals = Array.from({ length: eqLen }, (_, i) => norm[Math.round((i / Math.max(1, eqLen - 1)) * (norm.length - 1))]);
      setCmps((c) => [...c, { symbol: s, label: label || s, vals }]);
    } catch { /* ignore */ }
  };
  const removeCompare = (s: string) => setCmps((c) => c.filter((x) => x.symbol !== s));
  const chartData = p.equity.map((d: any, i: number) => {
    const row: any = { ...d };
    cmps.forEach((c) => { row["cmp_" + c.symbol] = c.vals[i] != null ? Math.round(c.vals[i] * 10) / 10 : null; });
    return row;
  });
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
        <HealthGauge score={p.overall} />
        <div style={{ flex: 1, minWidth: 300 }}>
          <Eyebrow icon="gauge" info={{ title: "Investor Grade", body: "A 0–100 health score blending risk-adjusted return, quality, diversification, concentration and income into one A–F grade. Higher is healthier. It's a relative read on portfolio construction, not a buy/sell signal." }}>Investor Grade · {p.name}</Eyebrow>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: T.muted, margin: "0 0 18px", maxWidth: 560 }}>{p.insights[0].body}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
            {p.subscores.map((x: any) => <ScoreBar key={x.k} label={x.k} s={x.s} note={x.note} />)}
          </div>
        </div>
      </Panel>

      <div className="hc-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Portfolio value", value: usd(p.value), sub: `${pct(p.dayChg)} today`, color: T.ink, accent: up ? T.green : T.red },
          { label: "Annual income", value: usd(p.annualIncome), sub: `${p.divYield.toFixed(1)}% blended yield`, color: T.green },
          { label: "Year to date", value: pct(p.ytd), sub: "total return", color: T.green },
          { label: "Holdings", value: String(p.holdings.length), sub: `${p.holdings.filter((h: any) => h.type === "etf").length} ETFs · ${p.holdings.filter((h: any) => h.type === "stock").length} stocks`, color: T.ink },
        ].map((s) => <Panel key={s.label} pad={18}><Stat {...s} /></Panel>)}
      </div>

      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <div>
            <Eyebrow icon="trending" info={{ title: "Performance", body: "Each line is indexed to 100 at the start of the window, so you compare shapes regardless of price. 'Compare' overlays any index or stock (pulled from your database) normalised the same way." }}>Performance · indexed to 100</Eyebrow>
            <div style={{ display: "flex", gap: 30 }}>
              <Stat label="This portfolio" value={pct(p.totalRet)} color={T.green} />
              <Stat label="S&P 500" value={pct(p.benchRet)} color={T.muted} />
              <Stat label="Active" value={`${p.active > 0 ? "+" : ""}${p.active.toFixed(1)}pt`} color={p.active >= 0 ? T.green : T.red} />
            </div>
          </div>
        </div>
        <div style={{ height: 230 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="ap" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={0.32} /><stop offset="100%" stopColor={T.green} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke={T.line} vertical={false} />
              <XAxis dataKey="m" tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} tickFormatter={(m: any) => `M${m}`} interval={5} axisLine={{ stroke: T.line }} tickLine={false} />
              <YAxis tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={false} tickLine={false} domain={[90, "auto"]} />
              <Tooltip content={<Tip />} />
              <Area isAnimationActive={false} type="monotone" dataKey="bench" name="S&P 500" stroke={T.faint} strokeWidth={1.4} fill="none" strokeDasharray="4 3" />
              <Area isAnimationActive={false} type="monotone" dataKey="port" name="Portfolio" stroke={T.green} strokeWidth={2.6} fill="url(#ap)" />
              {cmps.map((c, i) => <Line key={c.symbol} isAnimationActive={false} type="monotone" dataKey={"cmp_" + c.symbol} name={c.label} stroke={cmpColors[i % cmpColors.length]} strokeWidth={1.8} dot={false} connectNulls />)}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => setCmpOpen(true)} className="hc-sampleChip" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.panel2, color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 18, padding: "6px 13px", cursor: "pointer", fontFamily: body, fontSize: 12.5, fontWeight: 600 }}>
            <Icon name="plus" size={14} color={T.green} /> Compare an index or stock
          </button>
          {cmps.map((c, i) => (
            <span key={c.symbol} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: body, fontSize: 12, color: cmpColors[i % cmpColors.length] }}>
              <span style={{ width: 12, height: 2, background: cmpColors[i % cmpColors.length] }} />{c.label}
              <button onClick={() => removeCompare(c.symbol)} style={{ border: "none", background: "transparent", color: T.faint, cursor: "pointer", padding: 0, display: "flex" }}><Icon name="x" size={12} /></button>
            </span>
          ))}
        </div>
        <CompareModal open={cmpOpen} onClose={() => setCmpOpen(false)} cmps={cmps} onAdd={addCompare} onRemove={removeCompare} />
      </Panel>

      <HoldingsSection p={p} onRemove={onRemove} title="Your holdings" />
    </div>
  );
}

/* ============================== RISK ============================== */
export function RiskSection({ p }: any) {
  const scatter = p.holdings.filter((h: any) => h.type !== "cash" && h.rScore).map((h: any) => ({ x: h.vol, y: h.beta, z: h.w, tk: h.tk, color: h.type === "etf" ? T.blue : h.type === "bond" ? T.teal : T.green }));
  const rc = [...p.holdings].filter((h: any) => h.rc > 0).sort((a: any, b: any) => b.rc - a.rc);
  const maxRc = rc[0].rc;
  const r = p.risk;
  return (
    <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Panel style={{ gridColumn: "1 / -1" }}>
        <Eyebrow icon="shield" accent={T.red} info={{ title: "Risk metrics", body: "From ~1y of daily returns. Volatility = annualised standard deviation. Beta = sensitivity to the S&P (1.0 moves with it). Sharpe/Sortino = return per unit of total/downside risk (higher is better). Max drawdown = worst peak-to-trough. VaR 95% (1d) = a loss you'd exceed ~1 day in 20." }}>Risk Metrics</Eyebrow>
        <div className="hc-grid5" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 22, rowGap: 24 }}>
          <Stat label="Volatility (ann.)" value={`${r.vol}%`} sub="vs 16.1% S&P" color={r.vol > 18 ? T.amber : T.ink} />
          <Stat label="Beta" value={r.beta.toFixed(2)} sub={r.beta > 1 ? "amplifies market" : "dampens market"} color={r.beta > 1.2 ? T.amber : T.ink} />
          <Stat label="Sharpe" value={r.sharpe.toFixed(2)} sub="risk-adj. return" color={T.green} />
          <Stat label="Sortino" value={r.sortino.toFixed(2)} color={T.green} />
          <Stat label="Max drawdown" value={`${r.mdd}%`} sub="trough, 3yr" color={T.red} />
          <Stat label="VaR 95% (1d)" value={`${r.var1d}%`} sub={usd(r.varUsd)} color={T.red} />
          <Stat label="VaR 95% (1mo)" value={`${r.var1m}%`} color={T.red} />
          <Stat label="Tracking error" value={`${r.te}%`} />
          <Stat label="R² to market" value={r.r2.toFixed(2)} sub={`${Math.round(r.r2 * 100)}% explained by β`} />
          <Stat label="Beta-adj. exposure" value={`${Math.round(r.beta * 100)}%`} sub="effective market" color={r.beta > 1.2 ? T.amber : T.ink} />
        </div>
      </Panel>

      <Panel>
        <Eyebrow icon="activity" info={{ title: "Risk vs market sensitivity", body: "Each bubble is a holding: x = annual volatility (how much it swings), y = beta (how much it moves with the market), bubble size = weight. Why it matters: a small position in a top-right name can dominate your risk, while a big position bottom-left barely moves the needle — so it surfaces risk that's hiding in low weights. Read it with Contribution to Total Risk below." }}>Risk vs. Market Sensitivity</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 8 }}>Bubble size = weight · blue = ETF · green = stock</div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: -8 }}>
              <CartesianGrid stroke={T.line} />
              <XAxis type="number" dataKey="x" name="Volatility" unit="%" tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={{ stroke: T.line }} tickLine={false} domain={[0, "dataMax + 4"]} />
              <YAxis type="number" dataKey="y" name="Beta" tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={false} tickLine={false} domain={[0, "dataMax + 0.3"]} />
              <ZAxis type="number" dataKey="z" range={[60, 900]} />
              <Tooltip cursor={{ strokeDasharray: "3 3", stroke: T.line2 }} content={({ active, payload }: any) => active && payload?.length ? (
                <div style={{ background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 8, padding: "8px 11px", fontFamily: mono, fontSize: 11.5, color: T.ink }}>
                  <b>{payload[0].payload.tk}</b><br />vol {payload[0].payload.x}% · β {payload[0].payload.y}<br />wt {payload[0].payload.z}%
                </div>) : null} />
              <Scatter isAnimationActive={false} data={scatter}>
                {scatter.map((d: any, i: number) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <Eyebrow icon="layers" accent={T.violet} info={{ title: "Factor exposure", body: "Your tilt vs a neutral market (50) on six factors. Value/Quality/Growth/Momentum come from uncoverd's pillar ratings; Income from blended yield; Low-Vol from inverse volatility. Above 50 = more of that factor than the market." }}>Style & Factor Exposure</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 8 }}>Portfolio (green) vs S&P 500 (grey)</div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <RadarChart data={p.factors} outerRadius="72%">
              <PolarGrid stroke={T.line} />
              <PolarAngleAxis dataKey="f" tick={{ fill: T.muted, fontSize: 11, fontFamily: mono }} />
              <Radar isAnimationActive={false} name="S&P 500" dataKey="bench" stroke={T.faint} fill={T.faint} fillOpacity={0.1} strokeWidth={1.2} />
              <Radar isAnimationActive={false} name="Portfolio" dataKey="port" stroke={T.green} fill={T.green} fillOpacity={0.26} strokeWidth={2} />
              <Tooltip content={<Tip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel style={{ gridColumn: "1 / -1" }}>
        <Eyebrow icon="activity" accent={T.red} info={{ title: "Contribution to total risk", body: "Each holding's share of the portfolio's total risk (variance) — not just its weight. A name shows red when it contributes MORE risk than its weight, because its volatility and how it co-moves with the rest amplify it. Roughly: (weight × covariance of the holding with the whole portfolio) ÷ portfolio variance. Trimming a high-contribution name cuts risk faster than its weight suggests." }}>Contribution to Total Risk</Eyebrow>
        <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 16 }}>Where your risk actually comes from — names in red carry more risk than their weight.</div>
        {rc.map((h: any) => (
          <div key={h.tk} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
            <span style={{ fontFamily: mono, fontSize: 12, width: 58, color: T.ink }}>{h.tk}</span>
            <div style={{ flex: 1, height: 18, background: T.raised, borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div className="hc-fill" style={{ height: "100%", background: h.rc > h.w ? T.red : T.blue, opacity: 0.85, borderRadius: 4, ["--fw" as any]: `${(h.rc / maxRc) * 100}%` }} />
              <div style={{ position: "absolute", left: 9, top: 1, fontFamily: mono, fontSize: 10.5, color: h.rc / maxRc > 0.25 ? T.bg : T.ink, fontWeight: 600 }}>{h.rc}%</div>
            </div>
            <span style={{ fontFamily: mono, fontSize: 11, width: 84, textAlign: "right", color: h.rc > h.w ? T.red : T.muted }}>
              {h.rc > h.w ? "+" : ""}{(h.rc - h.w).toFixed(1)}pt vs wt
            </span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ============================== CONSISTENCY ============================== */
export function ConsistencySection({ p }: any) {
  const c = p.cons;
  const grade = Math.round((c.posRate * 0.5 + c.rolling12 * 0.5));
  const data = p.monthly.map((v: number, i: number) => ({ m: i, v }));
  const years: number[][] = [];
  for (let i = 0; i < p.monthly.length; i += 12) years.push(p.monthly.slice(i, i + 12));
  const MO = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const cellCol = (v: any) => v == null ? T.raised : v > 3 ? T.green : v > 0 ? T.green + "88" : v > -3 ? T.red + "88" : T.red;

  // S&P 500 monthly returns derived from the benchmark curve, for the vs-S&P view.
  const benchMonthly = (() => {
    const eq = (p.equity || []).map((d: any) => d.bench);
    if (eq.length < 3) return [] as number[];
    const n = data.length; const step = eq.length / n; const out: number[] = [];
    for (let b = 0; b < n; b++) { const a = eq[Math.floor(b * step)] ?? 100; const z = eq[Math.min(eq.length - 1, Math.floor((b + 1) * step))] ?? a; out.push(+(((z - a) / a) * 100).toFixed(1)); }
    return out;
  })();
  const bPos = benchMonthly.length ? Math.round(benchMonthly.filter((x) => x > 0).length / benchMonthly.length * 100) : null;
  const bBest = benchMonthly.length ? Math.max(...benchMonthly) : null;
  const bWorst = benchMonthly.length ? Math.min(...benchMonthly) : null;
  const gradeBox = (
    <div style={{ marginTop: 16, padding: "12px 14px", background: scoreColor(grade) + "12", border: `1px solid ${scoreColor(grade)}33`, borderRadius: 10 }}>
      <div style={{ fontFamily: mono, fontSize: 11, color: scoreColor(grade), fontWeight: 600, marginBottom: 4 }}>CONSISTENCY GRADE · {gradeOf(grade)}</div>
      <div style={{ fontSize: 12.5, color: T.muted }}>
        {c.posRate >= 65 ? "Steady compounder — gains arrive often and drawdowns are shallow." : c.posRate >= 55 ? "Decent rhythm, but losing months bite. Smoother is achievable." : "Lumpy ride — big up months offset frequent, sharp drawdowns."}
      </div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="hc-grid5" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {[
          { label: "Positive months", value: `${c.posRate}%`, sub: `${Math.round(c.posRate / 100 * p.monthly.length)} of ${p.monthly.length}`, color: scoreColor(c.posRate) },
          { label: "Rolling 12m positive", value: `${c.rolling12}%`, sub: "of trailing-year windows", color: scoreColor(c.rolling12) },
          { label: "Longest win streak", value: `${c.longestUp} mo`, sub: "consecutive gains", color: T.green },
          { label: "Best / worst month", value: `${pct(c.bestMonth)}`, sub: `worst ${pct(c.worstMonth)}`, color: T.green },
          { label: "Up / down magnitude", value: `${c.avgUp}%`, sub: `avg down ${c.avgDown}%`, color: T.ink },
        ].map((s) => <Panel key={s.label} pad={18}><Stat {...s} /></Panel>)}
      </div>

      <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <Panel>
          <Eyebrow icon="bars" accent={T.green} info={{ title: "Consistency", body: "How reliably the book goes up, not just the total. Share of positive months, longest winning streak, and how often a rolling 12-month window finished green. Steady, shallow drawdowns score higher than a few big spikes around frequent losses." }}>Monthly Returns · last {p.monthly.length} months</Eyebrow>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={T.line} vertical={false} />
                <XAxis dataKey="m" tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} tickFormatter={(m: any) => `M${m}`} interval={5} axisLine={{ stroke: T.line }} tickLine={false} />
                <YAxis tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip cursor={{ fill: T.raised }} content={<Tip fmt={(v: any) => `${v}%`} />} />
                <Bar isAnimationActive={false} dataKey="v" name="Return" radius={[2, 2, 0, 0]}>
                  {data.map((d: any, i: number) => <Cell key={i} fill={d.v >= 0 ? T.green : T.red} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {years.length > 1 ? (
          <Panel>
            <Eyebrow icon="calendar" accent={T.violet} info={{ title: "Consistency calendar", body: "Each cell is a month — green = up, red = down, darker = bigger move. Reading across years shows whether good and bad months cluster or spread out over time." }}>Consistency Calendar</Eyebrow>
            <div style={{ display: "flex", gap: 6, fontFamily: mono, fontSize: 9, color: T.faint, marginBottom: 6, paddingLeft: 30 }}>
              {MO.map((m, i) => <span key={i} style={{ width: 18, textAlign: "center" }}>{m}</span>)}
            </div>
            {years.map((yr, yi) => (
              <div key={yi} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 9.5, color: T.faint, width: 24 }}>Y{yi + 1}</span>
                {Array.from({ length: 12 }).map((_, mi) => {
                  const v = yr[mi];
                  return <span key={mi} title={v != null ? `${pct(v)}` : ""} style={{ width: 18, height: 18, borderRadius: 4, background: cellCol(v) }} />;
                })}
              </div>
            ))}
            {gradeBox}
          </Panel>
        ) : (
          <Panel>
            <Eyebrow icon="scale" accent={T.violet} info={{ title: "Consistency vs the S&P 500", body: "Your month-to-month reliability next to the index over the same window. A higher share of positive months and a shallower worst month mean a smoother ride than the market — even if total return differs." }}>Consistency vs S&P 500</Eyebrow>
            <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "10px 14px", background: T.panel2, borderBottom: `1px solid ${T.line2}` }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Metric</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: T.green, textTransform: "uppercase", textAlign: "right" }}>You</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: T.faint, textTransform: "uppercase", textAlign: "right" }}>S&P</span>
              </div>
              {[
                { k: "Positive months", a: `${c.posRate}%`, b: bPos != null ? `${bPos}%` : "—", aw: bPos == null || c.posRate >= bPos },
                { k: "Best month", a: pct(c.bestMonth), b: bBest != null ? pct(bBest) : "—", aw: null },
                { k: "Worst month", a: pct(c.worstMonth), b: bWorst != null ? pct(bWorst) : "—", aw: bWorst == null || c.worstMonth >= bWorst },
                { k: "Avg up / down", a: `${c.avgUp}% / ${c.avgDown}%`, b: "—", aw: null },
              ].map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "12px 14px", borderBottom: i < 3 ? `1px solid ${T.line}` : "none", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>{r.k}</span>
                  <span style={{ textAlign: "right", fontFamily: mono, fontWeight: 600, color: r.aw === null ? T.ink : r.aw ? T.green : T.red }}>{r.a}</span>
                  <span style={{ textAlign: "right", fontFamily: mono, color: T.faint }}>{r.b}</span>
                </div>
              ))}
            </div>
            {gradeBox}
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ============================== FRONTIER ============================== */
export function FrontierSection({ p, onOptimize }: any) {
  const cur = p.frontierCur, opt = p.frontierOpt, min = p.frontierMin;
  const sharpeCur = +(cur.y / cur.x).toFixed(2);
  const sharpeOpt = +(opt.y / opt.x).toFixed(2);
  const extraRet = +(opt.y - cur.y).toFixed(1);
  const lessRisk = +(cur.x - opt.x).toFixed(1);
  const optimized = sharpeCur >= sharpeOpt - 0.05;
  return (
    <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
      <Panel>
        <Eyebrow icon="target" accent={T.green} info={{ title: "Efficient frontier", body: "Each grey dot is a random mix of your holdings (risk vs return). The green curve is the best return achievable at each risk level (long-only mean-variance optimisation on ~1y of returns). Min-vol = lowest-risk mix; Max-Sharpe = best return-per-risk. Closer to the curve = more efficient." }}>Risk / Return Efficient Frontier</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 10 }}>Every grey dot is a possible mix of your asset classes. The green curve is the best return for each level of risk.</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart margin={{ top: 10, right: 14, bottom: 18, left: -6 }}>
              <CartesianGrid stroke={T.line} />
              <XAxis type="number" dataKey="x" name="Risk" unit="%" domain={[4, 26]} tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={{ stroke: T.line }} tickLine={false} label={{ value: "Volatility (risk) →", position: "insideBottom", offset: -8, fill: T.faint, fontSize: 11, fontFamily: mono }} />
              <YAxis type="number" dataKey="y" name="Return" unit="%" domain={[0, 16]} tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ strokeDasharray: "3 3", stroke: T.line2 }} content={({ active, payload }: any) => active && payload?.length ? (
                <div style={{ background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 8, padding: "8px 11px", fontFamily: mono, fontSize: 11.5, color: T.ink }}>
                  {payload[0].payload.label || "Mix"}<br />risk {payload[0].payload.x}% · return {payload[0].payload.y}%</div>) : null} />
              <Scatter isAnimationActive={false} data={p.frontier.cloud} fill={T.line2} fillOpacity={0.55} />
              <Line isAnimationActive={false} data={p.frontier.curve} dataKey="y" stroke={T.green} strokeWidth={2.2} dot={false} name="Frontier" />
              <Scatter isAnimationActive={false} data={[min]} fill={T.teal} shape="circle" />
              <Scatter isAnimationActive={false} data={p.frontierIdeas} fill={T.violet} />
              <Scatter isAnimationActive={false} data={[opt]} fill={T.gold} shape="diamond" />
              <Scatter isAnimationActive={false} data={[cur]} fill={T.ink} shape="circle" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 6, fontFamily: mono, fontSize: 10.5, color: T.muted }}>
          {[["You today", T.ink], ["Max-Sharpe (optimal)", T.gold], ["Min-volatility", T.teal], ["Suggested ideas", T.violet]].map(([l, c]: any) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>
          ))}
        </div>
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Panel>
          <Eyebrow icon="zap" accent={optimized ? T.green : T.amber}>Optimization Verdict</Eyebrow>
          <div style={{ padding: "14px 16px", background: (optimized ? T.green : T.amber) + "12", border: `1px solid ${(optimized ? T.green : T.amber)}33`, borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: optimized ? T.green : T.amber, marginBottom: 6 }}>
              {optimized ? "Near-optimal" : "Room to optimize"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: T.muted }}>
              {optimized
                ? "Your portfolio sits close to the frontier — you're being paid fairly for the risk you take."
                : `You sit below the frontier. At today's risk you could target ~${extraRet > 0 ? "+" + extraRet : extraRet}pt more return, or hold this return for ~${lessRisk}pt less risk.`}
            </div>
          </div>
          <Stat label="Your Sharpe ratio" value={sharpeCur.toFixed(2)} sub="return per unit of risk" color={T.ink} />
          <div style={{ height: 14 }} />
          <Stat label="Optimal Sharpe (max)" value={sharpeOpt.toFixed(2)} sub={optimized ? "you're essentially there" : `+${(sharpeOpt - sharpeCur).toFixed(2)} achievable`} color={T.gold} />
          {onOptimize && (
            <button onClick={onOptimize} className="hc-btnPrimary" style={{ marginTop: 16, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.green, color: T.bg, border: "none", borderRadius: 11, padding: "12px", fontFamily: body, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              See how to get there <Icon name="arrowRight" size={16} color={T.bg} />
            </button>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================== OPTIMIZE ============================== */
export function OptimizeSection({ p }: any) {
  const income = p.optimize?.income ?? [];
  const ret = p.optimize?.ret ?? [];
  const bothSame = JSON.stringify(income) === JSON.stringify(ret);
  const [lens, setLens] = React.useState<"income" | "ret">("ret");
  const lensMeta: any = {
    income: { label: "Dividend / income", icon: "coins", color: T.green, blurb: "Tilt toward durable, growing income without taking on more equity risk." },
    ret: { label: "Total return", icon: "trending", color: T.blue, blurb: "An illustrative mix that improves return per unit of risk — closer to the efficient frontier." },
  };
  const list = bothSame ? ret : p.optimize[lens];
  const color = bothSame ? T.blue : lensMeta[lens].color;
  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <Eyebrow icon="zap" accent={T.gold} style={{ marginBottom: 0 }} info={{ title: "Illustrative optimisation", body: "A long-only mean-variance optimisation on ~1 year of returns: the weights that would have given the best return per unit of risk (max-Sharpe). Expected returns are noisy, so this is an illustration to explore — not advice or a prediction." }}>Illustrative optimisation</Eyebrow>
        {!bothSame && (
          <div style={{ display: "flex", gap: 6, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 11, padding: 4 }}>
            {Object.entries(lensMeta).map(([k, m]: any) => (
              <button key={k} onClick={() => setLens(k)} style={{
                display: "inline-flex", alignItems: "center", gap: 7, background: lens === k ? m.color : "transparent", color: lens === k ? T.bg : T.muted,
                border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: 600,
              }}><Icon name={m.icon} size={14} /> {m.label}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, maxWidth: 640 }}>{bothSame ? "How the weights would shift to move your book toward the best risk-adjusted (max-Sharpe) mix on the frontier. Shown for context, not as instructions." : lensMeta[lens].blurb}</div>
      {list.length === 0
        ? <div style={{ fontSize: 13.5, color: T.muted, padding: "10px 0" }}>Your portfolio already sits close to the optimised mix — no material reweighting stands out.</div>
        : (
          <div style={{ display: "grid", gap: 12 }}>
            {list.map((s: any, i: number) => (
              <div key={i} className="hc-optrow" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center", padding: "16px 18px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ fontFamily: mono, fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{s.from}</span>
                  <Icon name="arrowRight" size={15} color={color} />
                  <span style={{ fontFamily: mono, fontSize: 12.5, color: T.ink, fontWeight: 600 }}>{s.to}</span>
                </div>
                <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>{s.why}</div>
                <Pill color={color}>{s.impact}</Pill>
              </div>
            ))}
          </div>
        )}
      <div style={{ marginTop: 16, fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 8, lineHeight: 1.5 }}>
        <Icon name="sparkles" size={13} color={T.gold} /> Illustrative mean-variance optimisation, not investment advice. Expected returns are noisy — use it to understand trade-offs, not as a trade list.
      </div>
    </Panel>
  );
}

/* ============================== CORRELATION ============================== */
export function CorrSection({ p }: any) {
  const { tks, M } = p.corr;
  const cz = tks.length <= 5 ? 58 : tks.length <= 8 ? 46 : 38; // bigger cells when few holdings
  const fz = tks.length <= 5 ? 13 : tks.length <= 8 ? 11.5 : 10.5;
  const cell = (v: number) => (v >= 0.7 ? T.red : v >= 0.5 ? T.amber : v >= 0.35 ? T.gold : T.green);
  const flat: number[] = []; for (let i = 0; i < M.length; i++) for (let j = 0; j < i; j++) flat.push(M[i][j]);
  const avg = flat.length ? (flat.reduce((s, v) => s + v, 0) / flat.length) : 0;
  const hi = flat.filter((v) => v >= 0.6);
  const effN = (p.holdings.filter((h: any) => h.type !== "cash").length * (1 - avg * 0.4)).toFixed(1);
  return (
    <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 18 }}>
      <Panel>
        <Eyebrow icon="network" accent={T.red} info={{ title: "Correlation matrix", body: "Pairwise correlation of daily returns over ~1y (−1 to +1). Red (>0.7) means the two move together, so they don't diversify each other. Your effective diversification ≈ holding count discounted by how correlated everything is." }}>Holding Correlation Matrix</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 16 }}>Pairwise return correlation, trailing 1yr · red = moves together</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 3, fontFamily: mono, fontSize: fz }}>
            <thead>
              <tr><th></th>{tks.map((tk: string) => <th key={tk} style={{ color: T.muted, fontWeight: 500, padding: "0 2px 6px", fontSize: fz - 1 }}>{tk}</th>)}</tr>
            </thead>
            <tbody>
              {M.map((row: number[], i: number) => (
                <tr key={i}>
                  <td style={{ color: T.muted, paddingRight: 8, textAlign: "right", fontSize: fz - 1 }}>{tks[i]}</td>
                  {row.map((v: number, j: number) => (
                    <td key={j} title={`${tks[i]}–${tks[j]}: ${v}`}
                      style={{ width: cz, height: Math.round(cz * 0.72), textAlign: "center", borderRadius: 5, color: v >= 0.5 ? T.bg : T.ink, fontWeight: v >= 0.7 ? 700 : 500, background: i === j ? T.line2 : cell(v), opacity: i === j ? 0.45 : 0.92 }}>
                      {v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, fontFamily: mono, fontSize: 10.5, color: T.muted }}>
          {[["<0.35", T.green], ["0.35–0.5", T.gold], ["0.5–0.7", T.amber], [">0.7", T.red]].map(([l, c]: any) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}</span>
          ))}
        </div>
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Panel>
          <Eyebrow icon="alert" accent={T.red}>Detected Clusters</Eyebrow>
          <div style={{ padding: "12px 14px", background: T.red + "12", border: `1px solid ${T.red}33`, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ fontFamily: mono, fontSize: 12, color: T.red, fontWeight: 600, marginBottom: 4 }}>HIGH-CORR CLUSTER · ρ̄ {avg.toFixed(2)}</div>
            <div style={{ fontSize: 12.5, color: T.muted }}>{hi.length} pairs move above 0.6 together. When one falls, the cluster falls with it.</div>
          </div>
          <div style={{ padding: "12px 14px", background: T.green + "12", border: `1px solid ${T.green}33`, borderRadius: 10 }}>
            <div style={{ fontFamily: mono, fontSize: 12, color: T.green, fontWeight: 600, marginBottom: 4 }}>DIVERSIFIERS</div>
            <div style={{ fontSize: 12.5, color: T.muted }}>Bonds, cash and low-beta defensives provide genuine offset and dampen the cluster's swings.</div>
          </div>
        </Panel>
        <Panel>
          <Eyebrow icon="activity" info={{ title: "Effective # of holdings", body: "Your real diversification, not your count. We discount the nominal number of holdings by how correlated they are (≈ count × (1 − avg correlation × factor)). If everything moves together, ten holdings behave like far fewer — so 4.8 vs 5 means your five barely overlap." }}>Diversification Verdict</Eyebrow>
          <Stat label="Effective # of holdings" value={effN} sub={`vs ${p.holdings.filter((h: any) => h.type !== "cash").length} nominal — overlap erodes the rest`} color={T.amber} />
          <div style={{ height: 14 }} />
          <Stat label="Avg pairwise correlation" value={avg.toFixed(2)} sub={avg > 0.55 ? "tightly clustered" : "reasonably spread"} color={avg > 0.55 ? T.amber : T.green} />
        </Panel>
      </div>
    </div>
  );
}

/* ============================== SUGGESTED DIVERSIFIERS ============================== */
function DiversifiersPanel({ symbols, onAdd }: any) {
  const [sugs, setSugs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [note, setNote] = React.useState("");
  const key = symbols.join(",");
  React.useEffect(() => {
    let alive = true; setLoading(true);
    fetch("/api/portfolio/diversifiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols }) })
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setSugs(d.suggestions || []); setNote(d.note || ""); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const gc = (g: string) => (g?.startsWith("A") ? T.green : g?.startsWith("B") ? T.gold : T.red);
  return (
    <Panel>
      <Eyebrow icon="sparkles" accent={T.green} info={{ title: "Suggested diversifiers", body: "Top-rated names from the sectors where you're most underweight versus the S&P 500, excluding what you already hold. v1 ranks by uncoverd rating and sector gap (lower correlation is approximated by 'different sector'). Adding one re-scores your book. Educational, not advice." }}>Suggested diversifiers</Eyebrow>
      <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 16 }}>Strong-rated names in the sectors you're most underweight vs the S&P 500 — tap Add to drop one in and re-score.</div>
      {loading ? <div style={{ fontSize: 13, color: T.faint, padding: "8px 0" }}>Finding diversifiers…</div>
        : note ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>{note}</div>
        : sugs.length === 0 ? <div style={{ fontSize: 13, color: T.muted, padding: "8px 0" }}>No clear diversifiers stood out for this book.</div>
        : (
          <div style={{ display: "grid", gap: 10 }}>
            {sugs.map((s) => (
              <div key={s.symbol} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", padding: "13px 16px", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontFamily: mono, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{s.symbol}</span>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: gc(s.grade) }}>{s.grade}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{s.reason}{s.yield != null && s.yield > 0 ? ` · ${s.yield.toFixed(1)}% yield` : ""}</div>
                </div>
                <button onClick={() => onAdd(s)} className="hc-btnPrimary" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.green, color: T.bg, border: "none", borderRadius: 9, padding: "8px 14px", fontFamily: body, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <Icon name="plus" size={14} color={T.bg} /> Add
                </button>
              </div>
            ))}
          </div>
        )}
    </Panel>
  );
}

/* ============================== CONCENTRATION (look-through) ============================== */
export function ConcentrationSection({ p, onAdd }: any) {
  const sectors = p.sectors.filter((s: any) => s.lt > 0);
  const bets = p.sectors.filter((s: any) => isRealSector(s.name) && s.lt > 0);
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 18 }}>
      <Panel>
        <Eyebrow icon="pie" accent={T.blue} info={{ title: "Look-through sector mix", body: "Your sector exposure. For sample portfolios this unwraps ETFs into their underlying sectors; for your own live portfolios it currently shows direct sector weights (full ETF unwrap is in progress). Compare vs the S&P to see your active bets." }}>Look-Through Sector Mix</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 8 }}>ETFs decomposed into their underlying sectors</div>
        <div style={{ height: 250 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie isAnimationActive={false} data={sectors} dataKey="lt" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={2} stroke="none">
                {sectors.map((s: any, i: number) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
                <div style={{ background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 8, padding: "8px 11px", fontFamily: mono, fontSize: 11.5, color: T.ink }}>
                  {payload[0].name}: {payload[0].value}%</div>) : null} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
          {sectors.map((s: any) => (
            <span key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />{s.name}
            </span>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow icon="alert" accent={T.amber} info={{ title: "Active sector bets", body: "Your weight in each sector minus the S&P 500's weight. Red bars (overweight) are sectors you're betting on vs the index; anything beyond +10 points is a concentrated active bet. It shows where you diverge from 'the market'." }}>Active Sector Bets vs S&P 500</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 16 }}>Look-through weight minus benchmark weight</div>
        {bets.map((s: any) => {
          const diff = +(s.lt - s.bench).toFixed(1);
          const mag = Math.min(Math.abs(diff) / 22, 1) * 50;
          return (
            <div key={s.name} style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ color: T.ink }}>{s.name}</span>
                <span style={{ fontFamily: mono, color: diff > 0 ? T.red : T.green }}>{diff > 0 ? "+" : ""}{diff}pt</span>
              </div>
              <div style={{ position: "relative", height: 8, background: T.raised, borderRadius: 4 }}>
                <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: T.line2 }} />
                <div style={{ position: "absolute", left: diff > 0 ? "50%" : `${50 - mag}%`, width: `${mag}%`, height: "100%", borderRadius: 4, background: diff > 0 ? T.red : T.green, opacity: 0.85 }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 14, padding: "10px 13px", background: T.amber + "12", border: `1px solid ${T.amber}33`, borderRadius: 9, fontSize: 12.5, color: T.muted }}>
          <b style={{ color: T.amber }}>Note:</b> a single sector above +10pt active breaches the concentration guardrail.
        </div>
      </Panel>
      </div>
      {p.live && onAdd && <DiversifiersPanel symbols={p.holdings.map((h: any) => h.tk)} onAdd={onAdd} />}
    </div>
  );
}

/* ============================== HOLDINGS ============================== */
export function HoldingsSection({ p, onRemove, title = "Holdings & Composite Ratings" }: any) {
  const [sort, setSort] = React.useState("w");
  const rows = React.useMemo(() => [...p.holdings].sort((a: any, b: any) => (b[sort] ?? -1) - (a[sort] ?? -1)), [sort, p]);
  const rateColor = (r: string) => (r.startsWith("A") ? T.green : r.startsWith("B") ? T.gold : r === "—" ? T.faint : T.red);
  const canRemove = !!onRemove && p.holdings.length > 2;
  const H = ({ k, label }: any) => (
    <th onClick={() => k && setSort(k)} style={{ textAlign: k === "name" || k === "tk" ? "left" : "right", padding: "0 10px 12px", color: sort === k ? T.green : T.faint, fontFamily: mono, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: k ? "pointer" : "default", userSelect: "none" }}>{label}</th>
  );
  return (
    <Panel pad={0}>
      <div style={{ padding: "22px 22px 6px" }}>
        <Eyebrow icon="building" info={{ title: "Composite ratings", body: "Each holding's uncoverd rating (A–F) and pillar scores (Quality, Momentum on 0–100) plus weight, yield and beta. For live portfolios these come straight from your database. Click any column header to sort." }}>{title}</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 4 }}>Click any column to sort{onRemove ? " · tap ✕ to remove a holding and re-score" : " · ratings blend value, quality, momentum & income factors"}</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.line}` }}>
            <H k="tk" label="Ticker" /><H k="name" label="Name" /><H k="w" label="Weight" /><H k="rate" label="Rating" />
            <H k="yield" label="Yield" /><H k="divg" label="5y DGR" /><H k="q" label="Quality" /><H k="m" label="Mom." /><H k="beta" label="Beta" />
            {onRemove && <th></th>}
          </tr></thead>
          <tbody>
            {rows.map((h: any) => (
              <tr key={h.tk} className="hc-row" style={{ borderBottom: `1px solid ${T.line}` }}>
                <td style={{ padding: "13px 10px", fontFamily: mono, fontWeight: 600, color: T.ink }}>
                  {h.tk}{h.type !== "stock" && h.type !== "cash" && <span style={{ marginLeft: 6, fontSize: 9, color: typeColor(h.type), border: `1px solid ${typeColor(h.type)}55`, borderRadius: 3, padding: "1px 4px" }}>{typeLabel(h.type)}</span>}
                </td>
                <td style={{ padding: "13px 10px", color: T.muted, fontSize: 13 }}>{h.name}</td>
                <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: mono, color: T.ink }}>{h.w.toFixed(1)}%</td>
                <td style={{ padding: "13px 10px", textAlign: "right" }}><span style={{ fontFamily: mono, fontWeight: 700, color: rateColor(h.rate) }}>{h.rate}</span></td>
                <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: mono, fontSize: 12, color: h.yield >= 3 ? T.green : T.muted }}>{h.yield.toFixed(1)}%</td>
                <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: mono, fontSize: 12, color: T.muted }}>{h.type === "cash" ? "—" : `${h.divg.toFixed(1)}%`}</td>
                {["q", "m"].map((k) => (
                  <td key={k} style={{ padding: "13px 10px", textAlign: "right", fontFamily: mono, fontSize: 12 }}>
                    {h[k] == null ? <span style={{ color: T.faint }}>—</span> : <span style={{ color: h[k] >= 75 ? T.green : h[k] >= 50 ? T.muted : T.red }}>{h[k]}</span>}
                  </td>
                ))}
                <td style={{ padding: "13px 10px", textAlign: "right", fontFamily: mono, fontSize: 12, color: h.beta > 1.3 ? T.red : T.muted }}>{h.beta.toFixed(2)}</td>
                {onRemove && (
                  <td style={{ padding: "13px 10px", textAlign: "right" }}>
                    <button onClick={() => canRemove && onRemove(h.tk)} title={canRemove ? `Remove ${h.tk}` : "Keep at least 2 holdings"} disabled={!canRemove}
                      style={{ display: "inline-flex", border: "none", background: "transparent", color: canRemove ? T.faint : T.line2, cursor: canRemove ? "pointer" : "not-allowed", padding: 2 }} className="hc-chip"><Icon name="x" size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ============================== ETF OVERLAP ============================== */
export function EtfSection({ p }: any) {
  // ETF passive-ownership and look-through unwrap aren't wired for live
  // portfolios yet — show an honest placeholder instead of empty 0.0% bars.
  if (p.live) {
    return (
      <Panel style={{ textAlign: "center", padding: "40px 24px" }}>
        <Icon name="layers" size={26} color={T.violet} />
        <div style={{ fontFamily: display, fontSize: 17, fontWeight: 800, color: T.ink, margin: "12px 0 6px" }}>ETF look-through is coming soon</div>
        <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
          We&apos;re wiring up the full unwrap of each fund into its underlying names — and the share of each stock held passively by ETFs — for your own portfolios. Open a sample portfolio to see how it looks.
        </div>
      </Panel>
    );
  }
  const stocks = p.holdings.filter((h: any) => h.etf != null).sort((a: any, b: any) => b.etf - a.etf);
  const flagged = stocks.filter((h: any) => h.etf > 8.5);
  const max = 10;
  return (
    <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
      <Panel>
        <Eyebrow icon="building" accent={T.violet}>Passive (ETF) Ownership of Float</Eyebrow>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 18 }}>% of each name's shares held by ETFs · &gt;8.5% flagged for crowding & flow risk</div>
        {stocks.length === 0 && <div style={{ fontSize: 13, color: T.muted, padding: "20px 0" }}>This portfolio is mostly funds — no single-name crowding to flag. Nice.</div>}
        {stocks.map((h: any) => (
          <div key={h.tk} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
            <span style={{ fontFamily: mono, fontSize: 12.5, width: 58, color: T.ink }}>{h.tk}</span>
            <div style={{ flex: 1, height: 22, background: T.raised, borderRadius: 5, position: "relative", overflow: "hidden" }}>
              <div className="hc-fill" style={{ height: "100%", background: h.etf > 8.5 ? T.red : T.violet, opacity: 0.85, borderRadius: 5, ["--fw" as any]: `${(h.etf / max) * 100}%` }} />
              <div style={{ position: "absolute", left: "85%", top: 0, bottom: 0, width: 1, background: T.amber, opacity: 0.5 }} />
            </div>
            <span style={{ fontFamily: mono, fontSize: 12.5, width: 64, textAlign: "right", color: h.etf > 8.5 ? T.red : T.muted }}>{h.etf.toFixed(1)}%</span>
          </div>
        ))}
        {stocks.length > 0 && <div style={{ marginTop: 6, fontFamily: mono, fontSize: 10.5, color: T.faint, textAlign: "right" }}>amber line = 8.5% flag</div>}
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Panel>
          <Eyebrow icon="layers" accent={T.gold}>Look-Through Overlap</Eyebrow>
          <div style={{ fontSize: 12, color: T.faint, marginBottom: 14 }}>True exposure once your ETFs are unwrapped — you own more of these than you think.</div>
          {p.lookthrough.map((l: any) => (
            <div key={l.tk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontFamily: mono, fontSize: 12.5, color: T.ink }}>{l.tk}</span>
              <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                <span style={{ fontFamily: mono, fontSize: 12, color: T.faint }}>{l.direct.toFixed(1)}%</span>
                <Icon name="chevron" size={12} color={T.faint} />
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: T.gold }}>{l.eff.toFixed(1)}%</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.red, width: 42, textAlign: "right" }}>+{(l.eff - l.direct).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </Panel>
        <Panel>
          <Eyebrow icon="check" accent={T.green}>Crowding Summary</Eyebrow>
          <Stat label="Names above flag" value={`${flagged.length} of ${stocks.length || "—"}`} sub={flagged.map((h: any) => h.tk).join(" · ") || "none"} color={flagged.length ? T.red : T.green} />
          <div style={{ height: 14 }} />
          <Stat label="Avg ETF ownership" value={stocks.length ? `${(stocks.reduce((s: number, h: any) => s + h.etf, 0) / stocks.length).toFixed(1)}%` : "—"} sub="vs 6.2% universe median" color={T.amber} />
        </Panel>
      </div>
    </div>
  );
}

/* ============================== VS S&P 500 ============================== */
export function CompareSection({ p }: any) {
  const v = p.vsSp;
  const rows = [
    { k: "Total return (3yr)", a: pct(p.totalRet), b: pct(p.benchRet), aw: p.totalRet >= p.benchRet },
    { k: "CAGR", a: `${v.cagr}%`, b: `${v.spCagr}%`, aw: v.cagr >= v.spCagr },
    { k: "Volatility", a: `${p.risk.vol}%`, b: "16.1%", aw: p.risk.vol <= 16.1 },
    { k: "Max drawdown", a: `${p.risk.mdd}%`, b: "−24.0%", aw: p.risk.mdd >= -24 },
    { k: "Sharpe ratio", a: p.risk.sharpe.toFixed(2), b: "0.98", aw: p.risk.sharpe >= 0.98 },
    { k: "Correlation to S&P", a: v.corr.toFixed(2), b: "1.00", aw: null },
  ];
  return (
    <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
      <Panel>
        <Eyebrow icon="line" accent={T.green} info={{ title: "Growth vs S&P 500", body: "Hypothetical growth of $10,000 over the window, your portfolio vs the S&P 500 (equal-weighted, price return). Up/down capture = how much of the index's up/down moves you captured — lower down-capture is better." }}>Growth of $10,000 vs S&P 500</Eyebrow>
        <div style={{ display: "flex", gap: 30, marginBottom: 14 }}>
          <Stat label="This portfolio" value={usd(v.final10k)} color={T.green} />
          <Stat label="S&P 500" value={usd(v.sp10k)} color={T.muted} />
          <Stat label="Difference" value={`${v.final10k >= v.sp10k ? "+" : ""}${usd(v.final10k - v.sp10k)}`} color={v.final10k >= v.sp10k ? T.green : T.red} />
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={p.equity.map((d: any) => ({ m: d.m, port: Math.round(d.port * 100), bench: Math.round(d.bench * 100) }))} margin={{ top: 4, right: 6, bottom: 0, left: 6 }}>
              <defs><linearGradient id="cp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={0.28} /><stop offset="100%" stopColor={T.green} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke={T.line} vertical={false} />
              <XAxis dataKey="m" tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} tickFormatter={(m: any) => `M${m}`} interval={5} axisLine={{ stroke: T.line }} tickLine={false} />
              <YAxis tick={{ fill: T.faint, fontSize: 10, fontFamily: mono }} axisLine={false} tickLine={false} tickFormatter={(x: any) => `$${(x / 1000).toFixed(0)}k`} width={42} />
              <Tooltip content={<Tip fmt={(x: any) => usd(x)} />} />
              <Area isAnimationActive={false} type="monotone" dataKey="bench" name="S&P 500" stroke={T.faint} strokeWidth={1.4} fill="none" strokeDasharray="4 3" />
              <Area isAnimationActive={false} type="monotone" dataKey="port" name="Portfolio" stroke={T.green} strokeWidth={2.6} fill="url(#cp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel pad={0}>
        <div style={{ padding: "22px 22px 0" }}><Eyebrow icon="scale" accent={T.violet} info={{ title: "Head-to-head vs the S&P 500", body: "Your portfolio against the index over the same window. Green = you're ahead on that metric. Up-capture = the share of the S&P's up-moves you captured; down-capture = the share of its down-moves you took (lower is better). Correlation to S&P shows how closely you track it (1.0 = identical)." }}>Head-to-Head</Eyebrow></div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.line}` }}>
            <th style={{ textAlign: "left", padding: "0 22px 10px", fontFamily: mono, fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Metric</th>
            <th style={{ textAlign: "right", padding: "0 16px 10px", fontFamily: mono, fontSize: 10, color: T.green, textTransform: "uppercase" }}>You</th>
            <th style={{ textAlign: "right", padding: "0 22px 10px", fontFamily: mono, fontSize: 10, color: T.faint, textTransform: "uppercase" }}>S&P</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} style={{ borderBottom: `1px solid ${T.line}` }}>
                <td style={{ padding: "12px 22px", fontSize: 13, color: T.muted }}>{r.k}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: mono, fontSize: 13, fontWeight: 600, color: r.aw === null ? T.ink : r.aw ? T.green : T.red }}>{r.a}</td>
                <td style={{ padding: "12px 22px", textAlign: "right", fontFamily: mono, fontSize: 13, color: T.faint }}>{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Stat label="Up capture" value={`${v.upCapture}%`} sub="of S&P up moves" color={T.green} />
            <Stat label="Down capture" value={`${v.downCapture}%`} sub="of S&P down moves" color={v.downCapture < 100 ? T.green : T.red} />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ============================== AI INSIGHTS ============================== */
const FREE_Q = 3;
export function AiSection({ p, onUpgrade, unlimited, onAsk }: any) {
  const [q, setQ] = React.useState("");
  const [ans, setAns] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [used, setUsed] = React.useState(0);
  const [walled, setWalled] = React.useState(false);
  // Persist the daily free-question count so it survives navigation/refresh.
  const todayKey = new Date().toISOString().slice(0, 10);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("hc-ai-used");
      if (raw) { const o = JSON.parse(raw); if (o.date === todayKey) setUsed(o.count || 0); }
    } catch { /* storage blocked */ }
  }, [todayKey]);
  const bumpUsed = () => setUsed((u) => {
    const n = u + 1;
    try { localStorage.setItem("hc-ai-used", JSON.stringify({ date: todayKey, count: n })); } catch { /* ignore */ }
    return n;
  });
  const sevColor: any = { critical: T.red, warning: T.amber, positive: T.green };
  const sevIcon: any = { critical: "alert", warning: "shield", positive: "check" };

  const ask = async (question?: string) => {
    const Q = (question ?? q).trim(); if (!Q) return;
    if (!unlimited && used >= FREE_Q) { setWalled(true); return; }
    setLoading(true); setAns(""); setQ(Q);
    // Real analyst: send a compact portfolio context to the OpenAI edge function.
    const ctx = {
      portfolio: p.name, grade: gradeOf(p.overall), score: p.overall, value: p.value, yield: p.divYield, estimated: !!p.estimated,
      holdings: p.holdings.map((h: any) => ({ tk: h.tk, w: h.w, sector: h.sector, beta: h.beta, yield: h.yield, rate: h.rate, quality: h.q, momentum: h.m })),
      risk: p.risk, sectors: (p.sectors || []).map((s: any) => ({ name: s.name, weight: s.lt, bench: s.bench })),
    };
    try {
      if (!onAsk) throw new Error("offline");
      setAns(await onAsk(Q, ctx));
    } catch {
      const ins = p.insights[0];
      setAns(`(Offline fallback) On the ${p.name} book (Grade ${gradeOf(p.overall)} · ${p.overall}/100): ${ins.body}`);
    }
    bumpUsed(); setLoading(false);
  };

  const chips = ["What's my single biggest risk?", "How do I reach an A grade?", "Is my income durable?", "Am I too concentrated?"];

  return (
    <div className="hc-grid2" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
      <div style={{ display: "grid", gap: 18 }}>
        <Panel>
          <Eyebrow icon="sparkles" accent={T.gold}>AI Diagnosis</Eyebrow>
          {p.insights.map((ins: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 13, padding: "14px 0", borderBottom: i < p.insights.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <Icon name={sevIcon[ins.sev]} size={17} color={sevColor[ins.sev]} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{ins.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: T.muted }}>{ins.body}</div>
              </div>
            </div>
          ))}
        </Panel>
        <Panel>
          <Eyebrow icon="check" accent={T.green}>Recommended Actions</Eyebrow>
          {p.actions.map((a: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: T.green, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: T.muted }}>{a}</span>
            </div>
          ))}
        </Panel>
      </div>

      <Panel style={{ alignSelf: "flex-start", position: "sticky", top: 72 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Eyebrow icon="sparkles" accent={T.gold} style={{ marginBottom: 0 }}>Ask the Analyst</Eyebrow>
          {unlimited
            ? <span style={{ fontFamily: mono, fontSize: 10.5, color: T.gold, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="crown" size={11} color={T.gold} /> Unlimited</span>
            : <span style={{ fontFamily: mono, fontSize: 10.5, color: used >= FREE_Q ? T.red : T.faint }}>{Math.max(0, FREE_Q - used)} free left</span>}
        </div>
        <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 14 }}>Live analysis grounded in this portfolio's data.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
          {chips.map((c) => <Chip key={c} onClick={() => ask(c)}>{c}</Chip>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask about this portfolio…"
            style={{ flex: 1, background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "11px 13px", color: T.ink, fontFamily: body, fontSize: 13, outline: "none" }} />
          <button onClick={() => ask()} disabled={loading} className="hc-btnPrimary" style={{ background: T.green, border: "none", borderRadius: 9, padding: "0 15px", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name={loading ? "loader" : "send"} size={16} color={T.bg} style={loading ? { animation: "hc-spin 1s linear infinite" } : undefined} />
          </button>
        </div>
        <div style={{ minHeight: 130, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 11, padding: 16, fontSize: 13, lineHeight: 1.6, color: T.muted, whiteSpace: "pre-wrap" }}>
          {walled ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <Icon name="lock" size={22} color={T.gold} />
              <div style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: T.ink, margin: "10px 0 6px" }}>You've used your 3 free questions</div>
              <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 14 }}>Pro unlocks unlimited analyst questions on all your portfolios.</div>
              <button onClick={onUpgrade} className="hc-btnPrimary" style={{ background: T.gold, color: T.bg, border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Upgrade to continue</button>
            </div>
          ) : loading ? <span style={{ color: T.faint }}>Analyzing holdings, risk and exposures…</span>
            : ans || <span style={{ color: T.faint }}>Pick a question above or type your own. The analyst reasons over the live data on this page.</span>}
        </div>
        <div style={{ fontSize: 11, color: T.faint, marginTop: 10, lineHeight: 1.5 }}>Educational analysis of your data — not personalised investment advice. Always do your own research.</div>
      </Panel>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// /compare — prototype-design comparison app on REAL data. The server page
// assembles CompareColumn bundles + 5y daily closes and renders this client
// component (SSR'd, so the SEO HTML still carries every metric). Add/remove
// navigates to a new canonical /compare?a=&b= URL; mode + range are local.

import React from "react";
import { useRouter } from "next/navigation";
import { T, display, body, mono, Icon, Panel, Eyebrow, Pill, pct, scoreColor, gradeOf } from "@/components/healthcheck/theme";
import type { CompareColumn, CompareSeries } from "./types";

const SLOTS = ["a", "b", "c", "d"] as const;
const COL_SEQ = ["#2fe3a0", "#3b6ef0", "#f0a839", "#9b8cf0"];
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const CSS = `
.cmp-root *{box-sizing:border-box}
.cmp-root input::placeholder{color:#5d6b80}
.cmp-navlink:hover{color:#eef2f7 !important}
.cmp-add:hover{border-color:#2fe3a0 !important;color:#eef2f7 !important}
.cmp-x:hover{color:#ff5d6c !important;background:rgba(255,93,108,.12) !important}
.cmp-row:hover{background:#1a2433 !important}
@media (max-width:860px){
  .cmp-verdictGrid{grid-template-columns:1fr !important}
  .cmp-verdictGrid>div:last-child{border-left:none !important;border-top:1px solid #1e2a3a}
  .cmp-holdGrid{grid-template-columns:1fr 1fr !important}
}
@media (max-width:720px){
  .cmp-metricRow{gap:10px !important;padding-left:14px !important;padding-right:14px !important}
  .cmp-holdGrid{grid-template-columns:1fr !important}
  .cmp-headGrid{grid-template-columns:1fr 1fr !important}
}
`;

/* ---------- dims (radar + composite) ----------
   Stocks: straight from the rating pillars (1..5 → 0..100). ETFs: honest
   approximations from yield / returns / cost / breadth. */
type Dims = { income: number; growth: number; quality: number; value: number; momentum: number; safety: number };
const GRADE_SCORE: Record<string, number> = { "A+": 96, A: 92, "A-": 87, "B+": 80, B: 72, "B-": 64, "C+": 56, C: 50, "C-": 44, D: 35 };

function dimsOf(c: CompareColumn): Dims {
  const yld = c.yieldPct ?? 0;
  const income = clamp(yld * 22, 4, 99);
  if (c.kind === "stock" && c.pillars) {
    const p = (v: number | null) => (v != null ? clamp(v * 20, 5, 99) : 50);
    return { income, growth: p(c.pillars.growth), quality: p(c.pillars.profit), value: p(c.pillars.value), momentum: p(c.pillars.momentum), safety: p(c.pillars.health) };
  }
  // ETF (or unrated) approximations.
  return {
    income,
    growth: clamp(50 + (c.return3y ?? 0) * 0.5, 5, 99),
    quality: c.grade ? GRADE_SCORE[c.grade] ?? 60 : 60,
    value: c.expenseRatio != null ? clamp(95 - c.expenseRatio * 100, 20, 99) : 55,
    momentum: clamp(50 + (c.return1y ?? 0) * 1.2, 5, 99),
    safety: clamp(c.holdingsCount ? 45 + c.holdingsCount / 8 : 50 - (c.beta ?? 1) * 10 + 25, 20, 99),
  };
}
const CMP_DIMS: { key: keyof Dims; label: string }[] = [
  { key: "income", label: "Income" }, { key: "growth", label: "Growth" }, { key: "quality", label: "Quality" },
  { key: "value", label: "Value" }, { key: "momentum", label: "Momentum" }, { key: "safety", label: "Safety" },
];
const DIM_W: Record<keyof Dims, number> = { income: 1, growth: 1, quality: 1.1, value: 0.9, momentum: 0.9, safety: 1.1 };
function overallScore(d: Dims): number {
  let num = 0, den = 0;
  CMP_DIMS.forEach(({ key }) => { num += d[key] * DIM_W[key]; den += DIM_W[key]; });
  return Math.round(num / den);
}

/* ---------- metric rows ---------- */
type Row = {
  key: string; label: string; sub?: string;
  dir: 1 | -1 | 0; signed?: boolean;
  get: (c: CompareColumn) => number | null;
  fmt: (v: number, c: CompareColumn) => string;
};
type Section = { id: string; label: string; icon: string; rows: Row[]; when?: (cols: CompareColumn[]) => boolean };

const SECTIONS: Section[] = [
  { id: "headline", label: "Headline", icon: "activity", rows: [
    { key: "yield", label: "Dividend yield", dir: 1, get: (c) => c.yieldPct, fmt: (v) => v.toFixed(2) + "%" },
    { key: "day", label: "Day change", dir: 1, signed: true, get: (c) => c.changePercent, fmt: (v) => pct(v, 2) },
    { key: "price", label: "Price", dir: 0, get: (c) => c.price, fmt: (v) => "$" + v.toFixed(2) },
  ]},
  { id: "income", label: "Income & growth", icon: "coins", rows: [
    { key: "raises", label: "Consecutive raises", dir: 1, get: (c) => c.streakYears, fmt: (v) => v + (v === 1 ? " year" : " years") },
    { key: "cagr5", label: "5-year dividend CAGR", dir: 1, get: (c) => c.divCagr5y, fmt: (v) => v.toFixed(1) + "%" },
    { key: "payout", label: "Payout ratio", sub: "lower is safer", dir: -1, get: (c) => c.payoutRatio, fmt: (v) => v.toFixed(0) + "%" },
  ]},
  { id: "perf", label: "Performance", icon: "trending", rows: [
    { key: "r1y", label: "1-year price", dir: 1, signed: true, get: (c) => c.return1y, fmt: (v) => pct(v) },
    { key: "r3y", label: "3-year price", dir: 1, signed: true, get: (c) => c.return3y, fmt: (v) => pct(v) },
    { key: "offHigh", label: "% off 52-week high", sub: "closer to 0 is stronger", dir: 1, get: (c) => c.pctOff52wHigh, fmt: (v) => v.toFixed(1) + "%" },
  ]},
  { id: "quality", label: "Quality & valuation", icon: "shield", rows: [
    { key: "grade", label: "uncoverd rating", dir: 1, get: (c) => (c.grade ? GRADE_SCORE[c.grade] ?? null : null), fmt: (_v, c) => c.grade ?? "—" },
    { key: "pe", label: "P/E ratio", sub: "lower is cheaper", dir: -1, get: (c) => c.peRatio, fmt: (v) => v.toFixed(1) },
    { key: "beta", label: "Beta", sub: "lower is less volatile", dir: -1, get: (c) => c.beta, fmt: (v) => v.toFixed(2) },
    { key: "nde", label: "Net debt / EBITDA", sub: "lower is stronger", dir: -1, get: (c) => c.netDebtToEbitda, fmt: (v) => v.toFixed(2) },
    { key: "margin", label: "Profit margin", dir: 1, get: (c) => c.profitMargin, fmt: (v) => v.toFixed(1) + "%" },
    { key: "rev", label: "Revenue growth (QoQ)", dir: 1, signed: true, get: (c) => c.revGrowthQoQ, fmt: (v) => pct(v) },
  ], when: (cols) => cols.some((c) => c.kind === "stock") },
  { id: "mech", label: "ETF mechanics", icon: "layers", rows: [
    { key: "aum", label: "Assets under management", dir: 1, get: (c) => c.aum, fmt: (v) => "$" + (v / 1e9).toFixed(1) + "B" },
    { key: "expense", label: "Expense ratio", sub: "lower is cheaper to hold", dir: -1, get: (c) => c.expenseRatio, fmt: (v) => v.toFixed(2) + "%" },
    { key: "holdings", label: "Number of holdings", dir: 1, get: (c) => c.holdingsCount, fmt: (v) => v.toLocaleString() },
  ], when: (cols) => cols.some((c) => c.kind === "etf") },
];

function rankRow(row: Row, cols: CompareColumn[]) {
  const vals = cols.map((c) => row.get(c));
  const present = vals.filter((v): v is number => v != null && isFinite(v));
  if (row.dir === 0 || present.length < 2) return { winner: null as string | null, norm: {} as Record<string, number | null> };
  const min = Math.min(...present), max = Math.max(...present), span = max - min || 1;
  const norm: Record<string, number | null> = {};
  let bestTk: string | null = null, bestN = -1;
  cols.forEach((c) => {
    const v = row.get(c);
    if (v == null || !isFinite(v)) { norm[c.symbol] = null; return; }
    let n = (v - min) / span;
    if (row.dir === -1) n = 1 - n;
    norm[c.symbol] = n;
    if (n > bestN) { bestN = n; bestTk = c.symbol; }
  });
  const winners = cols.filter((c) => norm[c.symbol] === bestN);
  return { winner: winners.length === 1 ? bestTk : null, norm };
}
function tallyWins(cols: CompareColumn[], sections: Section[]) {
  const wins: Record<string, number> = Object.fromEntries(cols.map((c) => [c.symbol, 0]));
  let total = 0;
  sections.forEach((sec) => sec.rows.forEach((row) => {
    if (row.dir === 0) return;
    const { winner } = rankRow(row, cols);
    total++;
    if (winner) wins[winner]++;
  }));
  return { wins, total };
}

/* heatmap color from normalized 0..1 (red→amber→green) */
function heatBg(n: number | null) {
  if (n == null) return "transparent";
  const stops = [[255, 93, 108], [240, 168, 57], [47, 227, 160]];
  const t = clamp(n, 0, 1);
  const seg = t < 0.5 ? 0 : 1; const f = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const a = stops[seg], b = stops[seg + 1];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f));
  return `rgba(${c[0]},${c[1]},${c[2]},${(0.08 + t * 0.2).toFixed(3)})`;
}

/* ---------- URL helpers (canonical SEO routes) ---------- */
const compareUrl = (symbols: string[]) =>
  symbols.length ? "/compare?" + symbols.map((s, i) => `${SLOTS[i]}=${encodeURIComponent(s)}`).join("&") : "/compare";
const detailHref = (c: CompareColumn) => (c.kind === "etf" ? `/etfs/symbol/${c.symbol}` : `/stocks/${c.symbol}`);

/* ---------- add picker (full-DB search) ---------- */
function AddPicker({ symbols }: { symbols: string[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<{ symbol: string; name: string | null; is_etf: boolean | null; is_fund: boolean | null }[]>([]);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  React.useEffect(() => {
    const term = q.trim();
    const id = setTimeout(async () => {
      if (term.length < 1) { setResults([]); return; }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!r.ok) return;
        const d = await r.json();
        setResults(((d.results ?? []) as any[]).filter((x) => !symbols.includes(x.symbol)).slice(0, 8));
      } catch { /* best-effort */ }
    }, 200);
    return () => clearTimeout(id);
  }, [q, symbols]);

  return (
    <div ref={ref} style={{ position: "relative", height: "100%" }}>
      <button onClick={() => setOpen((o) => !o)} className="cmp-add" style={{ width: "100%", height: "100%", minHeight: 92, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", border: `1.5px dashed ${T.line2}`, borderRadius: 14, cursor: "pointer", color: T.muted }}>
        <span style={{ display: "flex", width: 32, height: 32, borderRadius: 9, background: T.green + "16", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={17} color={T.green} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Add ticker</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 30, background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 13, boxShadow: "0 20px 50px -12px rgba(0,0,0,.7)", overflow: "hidden", minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${T.line}` }}>
            <Icon name="search" size={15} color={T.faint} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any stock or ETF"
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.ink, fontFamily: body, fontSize: 13.5 }} />
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {results.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: T.faint, textAlign: "center" }}>{q.trim() ? "No matches" : "Type to search the full database"}</div>}
            {results.map((s) => (
              <button key={s.symbol} onClick={() => { setOpen(false); setQ(""); router.push(compareUrl([...symbols, s.symbol])); }} className="cmp-row"
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", background: "transparent", border: "none", borderBottom: `1px solid ${T.line}`, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink, width: 56 }}>{s.symbol}</span>
                <span style={{ fontSize: 12.5, color: T.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                <span style={{ fontFamily: mono, fontSize: 8.5, color: s.is_etf || s.is_fund ? T.blue : T.green, border: `1px solid ${s.is_etf || s.is_fund ? T.blue : T.green}55`, borderRadius: 4, padding: "1px 5px" }}>{s.is_etf || s.is_fund ? "ETF" : "STOCK"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- ticker column header ---------- */
function TickerHead({ c, color, symbols, isWinner }: { c: CompareColumn; color: string; symbols: string[]; isWinner: boolean }) {
  const router = useRouter();
  const canRemove = symbols.length > 2;
  return (
    <div style={{ position: "relative", background: isWinner ? "linear-gradient(160deg, #11202f, #0d1722)" : T.panel, border: `1px solid ${isWinner ? T.green + "66" : T.line2}`, borderRadius: 14, padding: "14px 14px 13px", minHeight: 92 }}>
      {isWinner && <span style={{ position: "absolute", top: -10, left: 13, display: "inline-flex", alignItems: "center", gap: 5, background: T.green, color: T.bg, fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 11, padding: "3px 9px" }}><Icon name="crown" size={10} color={T.bg} /> TOP PICK</span>}
      {canRemove && (
        <button onClick={() => router.push(compareUrl(symbols.filter((x) => x !== c.symbol)))} aria-label={"Remove " + c.symbol} className="cmp-x" style={{ position: "absolute", top: 10, right: 10, display: "flex", padding: 4, background: "transparent", border: "none", cursor: "pointer", color: T.faint, borderRadius: 6 }}>
          <Icon name="x" size={15} />
        </button>
      )}
      <a href={detailHref(c)} style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span style={{ fontFamily: display, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: "-0.01em" }}>{c.symbol}</span>
          <span style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, border: `1px solid ${T.line2}`, borderRadius: 5, padding: "2px 6px" }}>{c.kind === "etf" ? "ETF" : "STOCK"}</span>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name ?? "Not found"}</div>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {c.price != null && <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: T.ink }}>${c.price.toFixed(2)}</span>}
        {c.changePercent != null && <span style={{ fontFamily: mono, fontSize: 11.5, color: c.changePercent >= 0 ? T.green : T.red }}>{pct(c.changePercent, 2)}</span>}
      </div>
    </div>
  );
}

/* ---------- radar ---------- */
function RadarChart({ cols, colors, size = 300 }: { cols: CompareColumn[]; colors: string[]; size?: number }) {
  // Generous label margin so "Momentum"/"Safety" never clip at the edges.
  const cx = size / 2, cy = size / 2, R = size / 2 - 58;
  const N = CMP_DIMS.length;
  const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, rad: number) => [cx + Math.cos(angle(i)) * R * rad, cy + Math.sin(angle(i)) * R * rad];
  const rings = [0.25, 0.5, 0.75, 1];
  const allDims = cols.map(dimsOf);
  const polyFor = (d: Dims) => CMP_DIMS.map((dim, i) => pt(i, d[dim.key] / 100).join(",")).join(" ");
  // Instant hover tooltip on vertices (native <title> was too slow to notice).
  const [tip, setTip] = React.useState<{ x: number; y: number; tk: string; color: string; dim: string; v: number } | null>(null);
  return (
    <div style={{ position: "relative", width: size, margin: "0 auto" }}>
      {tip && (
        <div style={{ position: "absolute", left: clamp(tip.x + 10, 0, size - 130), top: Math.max(0, tip.y - 38), zIndex: 5, pointerEvents: "none", background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 8, padding: "6px 9px", boxShadow: "0 8px 24px rgba(0,0,0,.5)", whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: tip.color }}>{tip.tk}</span>
          <span style={{ fontFamily: mono, fontSize: 11.5, color: T.muted }}> · {tip.dim}: </span>
          <span style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: T.ink }}>{tip.v}/100</span>
        </div>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
      {rings.map((rr, ri) => (
        <polygon key={ri} points={CMP_DIMS.map((_, i) => pt(i, rr).join(",")).join(" ")} fill="none" stroke={T.line} strokeWidth="1" opacity={ri === rings.length - 1 ? 0.9 : 0.5} />
      ))}
      {CMP_DIMS.map((d, i) => {
        const [x, y] = pt(i, 1); const [lx, ly] = pt(i, 1.22);
        return (
          <g key={d.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={T.line} strokeWidth="1" opacity="0.5" />
            <text x={lx} y={ly} fill={T.muted} fontSize="11" fontFamily={mono}
              textAnchor={Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end"}
              dominantBaseline={Math.abs(ly - cy) < 6 ? "middle" : ly > cy ? "hanging" : "auto"}>{d.label}</text>
          </g>
        );
      })}
      {allDims.map((d, idx) => (
        <polygon key={idx} points={polyFor(d)} fill={colors[idx]} fillOpacity={cols.length > 2 ? 0.1 : 0.16}
          stroke={colors[idx]} strokeWidth="2" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${colors[idx]}55)` }} />
      ))}
      {allDims.map((d, idx) => CMP_DIMS.map((dim, i) => {
        const [x, y] = pt(i, d[dim.key] / 100);
        return (
          <circle key={idx + dim.key} cx={x} cy={y} r="4" fill={colors[idx]} stroke={T.bg} strokeWidth="1.2" style={{ cursor: "pointer" }}
            onMouseEnter={() => setTip({ x, y, tk: cols[idx].symbol, color: colors[idx], dim: dim.label, v: Math.round(d[dim.key]) })}
            onMouseLeave={() => setTip(null)} />
        );
      }))}
      </svg>
    </div>
  );
}

/* ---------- verdict ---------- */
function Verdict({ cols, colors, sections }: { cols: CompareColumn[]; colors: string[]; sections: Section[] }) {
  const ranked = React.useMemo(() => {
    const { wins, total } = tallyWins(cols, sections);
    return {
      total,
      list: cols.map((c, i) => ({ c, color: colors[i], score: overallScore(dimsOf(c)), wins: wins[c.symbol] })).sort((a, b) => b.score - a.score),
    };
  }, [cols, colors, sections]);
  const champ = ranked.list[0];
  const dimLeader = (key: keyof Dims) => cols.reduce((a, b) => (dimsOf(b)[key] > dimsOf(a)[key] ? b : a));
  const leaders: [string, CompareColumn][] = [["Best income", dimLeader("income")], ["Best growth", dimLeader("growth")], ["Safest", dimLeader("safety")]];

  return (
    <Panel pad={0} style={{ overflow: "hidden", marginBottom: 18 }}>
      <div className="cmp-verdictGrid" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 0 }}>
        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <Icon name="crown" size={15} color={T.gold} />
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted }}>The verdict</span>
          </div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 18, lineHeight: 1.55 }}>
            Best all-rounder is <span style={{ color: T.green, fontWeight: 700 }}>{champ.c.symbol}</span> — top composite across income, growth, quality, value, momentum &amp; safety, winning <span style={{ color: T.ink, fontWeight: 600 }}>{champ.wins} of {ranked.total}</span> head-to-head metrics.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {ranked.list.map((r, i) => (
              <div key={r.c.symbol} style={{ display: "flex", alignItems: "center", gap: 13, background: i === 0 ? T.green + "0e" : T.bg, border: `1px solid ${i === 0 ? T.green + "44" : T.line}`, borderRadius: 12, padding: "11px 14px" }}>
                <span style={{ fontFamily: display, fontSize: 15, fontWeight: 800, color: i === 0 ? T.gold : T.faint, width: 22 }}>{i + 1}</span>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: T.ink }}>{r.c.symbol}</div>
                  <div style={{ fontSize: 11.5, color: T.faint }}>{r.wins} metric win{r.wins === 1 ? "" : "s"}</div>
                </div>
                <div style={{ width: 120, display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.raised, overflow: "hidden" }}>
                    <div style={{ width: r.score + "%", height: "100%", borderRadius: 3, background: scoreColor(r.score) }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, width: 64, justifyContent: "flex-end" }}>
                  <span style={{ fontFamily: display, fontSize: 21, fontWeight: 800, color: scoreColor(r.score) }}>{r.score}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: T.muted }}>{gradeOf(r.score)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
            {leaders.map(([lab, st]) => (
              <div key={lab} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>{lab}</span>
                <span style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: T.ink }}>{st.symbol}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "22px 24px", borderLeft: `1px solid ${T.line}`, background: T.panel2 + "55", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
            <Icon name="target" size={15} color={T.green} />
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted }}>Profile overview</span>
          </div>
          <RadarChart cols={cols} colors={colors} />
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
            {cols.map((c, i) => (
              <div key={c.symbol} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: colors[i] }} />
                <span style={{ fontFamily: mono, fontSize: 12, color: T.muted, fontWeight: 600 }}>{c.symbol}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- metric cell + section ---------- */
function MetricCell({ row, c, color, norm, mode, isWinner }: { row: Row; c: CompareColumn; color: string; norm: number | null; mode: string; isWinner: boolean }) {
  const v = row.get(c);
  if (v == null || !isFinite(v)) return <div style={{ textAlign: "right", fontFamily: mono, fontSize: 14, color: T.faint }}>—</div>;
  const valColor = row.signed ? (v > 0 ? T.green : v < 0 ? T.red : T.ink) : isWinner ? T.green : T.ink;
  const label = row.fmt(v, c);
  if (mode === "bars" && row.dir !== 0 && norm != null) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 5 }}>
          {isWinner && <Pill color={T.green} solid>BEST</Pill>}
          <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: valColor, fontVariantNumeric: "tabular-nums" }}>{label}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: T.raised, overflow: "hidden" }}>
          <div style={{ width: Math.max(5, norm * 100) + "%", marginLeft: "auto", height: "100%", borderRadius: 3, background: isWinner ? T.green : color, opacity: isWinner ? 1 : 0.55 }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
      {isWinner && mode !== "heatmap" && <Pill color={T.green} solid>BEST</Pill>}
      <span style={{ fontFamily: mono, fontSize: 14.5, fontWeight: 700, color: valColor, fontVariantNumeric: "tabular-nums" }}>{label}</span>
    </div>
  );
}

function MetricSection({ sec, cols, colors, mode, gridCols }: { sec: Section; cols: CompareColumn[]; colors: string[]; mode: string; gridCols: string }) {
  return (
    <Panel pad={0} style={{ overflow: "hidden", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}>
        <Icon name={sec.icon} size={15} color={T.green} />
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{sec.label}</span>
      </div>
      {sec.rows.map((row, ri) => {
        const rank = rankRow(row, cols);
        return (
          <div key={row.key} className="cmp-metricRow" style={{ display: "grid", gridTemplateColumns: gridCols, alignItems: "center", padding: "13px 20px", borderBottom: ri < sec.rows.length - 1 ? `1px solid ${T.line}` : "none", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: T.ink, fontWeight: 500 }}>{row.label}</div>
              {row.sub && <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{row.sub}</div>}
            </div>
            {cols.map((c, i) => {
              const isWinner = rank.winner === c.symbol;
              const bg = mode === "heatmap" ? heatBg(rank.norm[c.symbol] ?? null) : "transparent";
              return (
                <div key={c.symbol} style={{ background: bg, borderRadius: 9, padding: mode === "heatmap" ? "8px 10px" : 0, margin: mode === "heatmap" ? "-4px 0" : 0 }}>
                  <MetricCell row={row} c={c} color={colors[i]} norm={rank.norm[c.symbol] ?? null} mode={mode} isWinner={isWinner} />
                </div>
              );
            })}
          </div>
        );
      })}
    </Panel>
  );
}

/* ---------- price chart (REAL closes, indexed to 100) ---------- */
const RANGES: [string, number][] = [["1M", 22], ["3M", 64], ["6M", 130], ["YTD", -1], ["1Y", 252], ["3Y", 756], ["All", 1e9]];

function useCleanSeries(series: CompareSeries[]) {
  return React.useMemo(() => {
    const out = new Map<string, { date: string; close: number }[]>();
    for (const s of series) {
      const pts = s.points
        .map((p) => ({ date: p.date, close: Number(p.close) }))
        .filter((p) => isFinite(p.close) && p.close > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      out.set(s.symbol, pts);
    }
    return out;
  }, [series]);
}
function sliceFor(pts: { date: string; close: number }[], rangeKey: string) {
  if (!pts.length) return [] as { date: string; v: number }[];
  let n: number;
  if (rangeKey === "YTD") {
    const jan1 = `${new Date().getFullYear()}-01-01`;
    n = pts.filter((p) => p.date >= jan1).length;
  } else {
    n = RANGES.find((r) => r[0] === rangeKey)?.[1] ?? 252;
  }
  const slice = pts.slice(Math.max(0, pts.length - Math.max(2, Math.min(n, pts.length))));
  const base = slice[0].close;
  return slice.map((p) => ({ date: p.date, v: (p.close / base) * 100 }));
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateLabel(iso: string, long: boolean) {
  const m = MONTHS[+iso.slice(5, 7) - 1] ?? "";
  return long ? `${m} ${iso.slice(2, 4)}` : m;
}

function PriceChart({ cols, colors, series, rangeKey, height = 300 }: { cols: CompareColumn[]; colors: string[]; series: Map<string, { date: string; close: number }[]>; rangeKey: string; height?: number }) {
  // Hover crosshair: fraction (0..1) across the plotted window, or null.
  const [hover, setHover] = React.useState<number | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const lines = cols.map((c) => sliceFor(series.get(c.symbol) ?? [], rangeKey));
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), lines[0] ?? []);
  const n = longest?.length ?? 0;
  if (!n) return <div style={{ padding: 30, textAlign: "center", color: T.faint, fontSize: 13 }}>No price history available.</div>;
  const all = lines.flat().map((p) => p.v);
  let lo = Math.min(...all), hi = Math.max(...all);
  const padY = (hi - lo) * 0.08 || 5; lo -= padY; hi += padY;
  const W = 1000, H = height, padL = 4, padR = 56, padT = 14, padB = 26;
  // X position by date fraction within the longest series' window.
  const d0 = longest[0].date, d1 = longest[longest.length - 1].date;
  const t0 = +new Date(d0), t1 = +new Date(d1) || t0 + 1;
  const x = (date: string) => padL + ((+new Date(date) - t0) / (t1 - t0)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = (arr: { date: string; v: number }[]) => arr.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.date).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const ticks = 4;
  const gl = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const long = rangeKey === "3Y" || rangeKey === "All" || rangeKey === "1Y";
  const k = 6;
  const xlabels = Array.from({ length: k + 1 }, (_, j) => longest[Math.round((j / k) * (n - 1))]).filter(Boolean);

  // Plot-area fraction of the wrapper width (the right gutter holds y labels).
  const plotFrac = (W - padL - padR) / W;
  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fx = (e.clientX - rect.left) / rect.width / plotFrac;
    setHover(fx >= 0 && fx <= 1 ? fx : null);
  };
  // Values at the hovered date: nearest point per ticker.
  const hoverT = hover != null ? t0 + hover * (t1 - t0) : null;
  const hoverRows = hoverT != null
    ? cols.map((c, i) => {
        const arr = lines[i];
        if (!arr.length) return null;
        let best = arr[0];
        for (const p of arr) if (Math.abs(+new Date(p.date) - hoverT) < Math.abs(+new Date(best.date) - hoverT)) best = p;
        return { symbol: c.symbol, color: colors[i], date: best.date, v: best.v };
      }).filter(Boolean) as { symbol: string; color: string; date: string; v: number }[]
    : [];
  const hoverDate = hoverRows[0]?.date ?? "";

  return (
    <div ref={wrapRef} style={{ width: "100%", overflow: "hidden", position: "relative", cursor: "crosshair" }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {hover != null && (
        <>
          <div style={{ position: "absolute", top: 0, bottom: 22, left: `${hover * plotFrac * 100}%`, width: 1, background: T.line2, pointerEvents: "none" }} />
          {hoverRows.map((r) => (
            <span key={r.symbol} style={{ position: "absolute", left: `calc(${(x(r.date) / W) * 100}% - 4px)`, top: y(r.v) - 4, width: 8, height: 8, borderRadius: "50%", background: r.color, border: `1.5px solid ${T.bg}`, pointerEvents: "none", zIndex: 4 }} />
          ))}
          <div style={{ position: "absolute", top: 8, left: hover < 0.55 ? `calc(${hover * plotFrac * 100}% + 12px)` : undefined, right: hover >= 0.55 ? `calc(${(1 - hover * plotFrac) * 100}% + 12px)` : undefined, background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "8px 11px", pointerEvents: "none", zIndex: 5, boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
            <div style={{ fontFamily: mono, fontSize: 10.5, color: T.faint, marginBottom: 5 }}>{hoverDate}</div>
            {hoverRows.map((r) => (
              <div key={r.symbol} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 11.5, marginTop: 2 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: r.color }} />
                <span style={{ color: T.ink, fontWeight: 700, width: 44 }}>{r.symbol}</span>
                <span style={{ color: r.v >= 100 ? T.green : T.red }}>{pct(r.v - 100)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
        {gl.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke={T.line} strokeWidth="1" opacity={Math.abs(g - 100) < 0.01 ? 0.9 : 0.4} strokeDasharray={Math.abs(g - 100) < 0.01 ? "0" : "3 5"} />
            <text x={W - padR + 8} y={y(g)} fill={T.faint} fontSize="13" fontFamily={mono} dominantBaseline="middle">{g.toFixed(0)}</text>
          </g>
        ))}
        {xlabels.map((p, i) => (
          <text key={i} x={x(p.date)} y={H - 6} fill={T.faint} fontSize="13" fontFamily={mono} textAnchor="middle">{dateLabel(p.date, long)}</text>
        ))}
        {lines.map((arr, idx) => arr.length > 1 && (
          <path key={idx} d={path(arr)} fill="none" stroke={colors[idx]} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${colors[idx]}44)`, vectorEffect: "non-scaling-stroke" as any }} />
        ))}
        {lines.map((arr, idx) => arr.length > 1 && (
          <circle key={idx} cx={x(arr[arr.length - 1].date)} cy={y(arr[arr.length - 1].v)} r="3.4" fill={colors[idx]} stroke={T.bg} strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

function PricePanel({ cols, colors, series }: { cols: CompareColumn[]; colors: string[]; series: Map<string, { date: string; close: number }[]> }) {
  const [range, setRange] = React.useState("1Y");
  return (
    <Panel pad={22} style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <Eyebrow icon="line" style={{ marginBottom: 10 }}>Price performance</Eyebrow>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {cols.map((c, i) => {
              const arr = sliceFor(series.get(c.symbol) ?? [], range);
              const chg = arr.length > 1 ? arr[arr.length - 1].v - 100 : null;
              return (
                <div key={c.symbol} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: colors[i] }} />
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{c.symbol}</span>
                  {chg != null && <span style={{ fontFamily: mono, fontSize: 12.5, color: chg >= 0 ? T.green : T.red }}>{pct(chg)}</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "inline-flex", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 10, padding: 3, gap: 2, flexWrap: "wrap" }}>
          {RANGES.map(([k]) => {
            const on = range === k;
            return <button key={k} onClick={() => setRange(k)} style={{ background: on ? T.raised : "transparent", color: on ? T.ink : T.faint, border: "none", borderRadius: 7, padding: "6px 11px", cursor: "pointer", fontFamily: mono, fontSize: 11.5, fontWeight: 600 }}>{k}</button>;
          })}
        </div>
      </div>
      <PriceChart cols={cols} colors={colors} series={series} rangeKey={range} />
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 10 }}>Indexed to 100 at the start of the selected range. Real daily closes — price-only, excludes reinvested dividends.</div>
    </Panel>
  );
}

/* ---------- ETF panels: top holdings + overlap ---------- */
function TopHoldings({ cols, colors }: { cols: CompareColumn[]; colors: string[] }) {
  const etfs = cols.map((c, i) => ({ c, color: colors[i] })).filter((x) => x.c.kind === "etf" && x.c.topHoldings.length);
  if (!etfs.length) return null;
  return (
    <Panel pad={20} style={{ marginBottom: 14 }}>
      <Eyebrow icon="building">Top holdings</Eyebrow>
      <div className="cmp-holdGrid" style={{ display: "grid", gridTemplateColumns: `repeat(${etfs.length}, 1fr)`, gap: 12 }}>
        {etfs.map(({ c, color }) => (
          <div key={c.symbol} style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{c.symbol}</span>
              {c.holdingsCount != null && <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10.5, color: T.faint }}>{c.holdingsCount} total</span>}
            </div>
            <div>
              {c.topHoldings.slice(0, 8).map((h, j) => (
                <div key={h.asset} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: j < 7 ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ fontFamily: mono, fontSize: 12, color: T.muted, width: 56, overflow: "hidden", textOverflow: "ellipsis" }}>{h.asset}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: T.raised, overflow: "hidden" }}>
                    <div style={{ width: Math.min(100, ((h.weight ?? 0) / 8) * 100) + "%", height: "100%", borderRadius: 2, background: color, opacity: 0.7 }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 11.5, color: T.ink, width: 48, textAlign: "right" }}>{h.weight != null ? h.weight.toFixed(2) + "%" : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function cosineOverlap(a: CompareColumn, b: CompareColumn) {
  const wa = new Map(a.topHoldings.filter((h) => h.weight != null).map((h) => [h.asset, h.weight as number]));
  const wb = new Map(b.topHoldings.filter((h) => h.weight != null).map((h) => [h.asset, h.weight as number]));
  const keys = new Set([...wa.keys(), ...wb.keys()]);
  let dot = 0, na = 0, nb = 0;
  keys.forEach((k) => { const x = wa.get(k) ?? 0, y = wb.get(k) ?? 0; dot += x * y; na += x * x; nb += y * y; });
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function overlapLabel(p: number) {
  if (p < 20) return { txt: "LOW OVERLAP", color: T.green };
  if (p < 45) return { txt: "SOME OVERLAP", color: T.amber };
  if (p < 70) return { txt: "NOTABLE OVERLAP", color: T.amber };
  return { txt: "STRONG OVERLAP", color: T.red };
}

function OverlapPanel({ cols, colors }: { cols: CompareColumn[]; colors: string[] }) {
  const etfs = cols.map((c, i) => ({ c, color: colors[i] })).filter((x) => x.c.kind === "etf" && x.c.topHoldings.length);
  if (etfs.length < 2) return null;
  const pairs: { a: typeof etfs[number]; b: typeof etfs[number]; pct: number }[] = [];
  for (let i = 0; i < etfs.length; i++) for (let j = i + 1; j < etfs.length; j++) {
    pairs.push({ a: etfs[i], b: etfs[j], pct: Math.round(cosineOverlap(etfs[i].c, etfs[j].c) * 100) });
  }
  return (
    <Panel pad={20} style={{ marginBottom: 14 }}>
      <Eyebrow icon="network">How similar are these ETFs?</Eyebrow>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: T.faint, lineHeight: 1.55, maxWidth: 720 }}>
        Cosine similarity on top holdings, weighted by position size. 100% = identical positions at identical weights. Surface-level &quot;different fund&quot; labels can hide near-duplicate exposure.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {pairs.map((p) => {
          const lab = overlapLabel(p.pct);
          return (
            <div key={p.a.c.symbol + p.b.c.symbol} style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12, padding: "15px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: p.a.color }}>{p.a.c.symbol}</span>
                <Icon name="repeat" size={13} color={T.faint} />
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: p.b.color }}>{p.b.c.symbol}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: T.ink }}>{p.pct}%</span>
                <Pill color={lab.color}>{lab.txt}</Pill>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: T.raised, overflow: "hidden" }}>
                <div style={{ width: p.pct + "%", height: "100%", borderRadius: 3, background: lab.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ---------- mode toggle ---------- */
function ModeToggle({ mode, setMode }: { mode: string; setMode: (m: string) => void }) {
  const opts: [string, string, string][] = [["bars", "Bars", "bars"], ["heatmap", "Heatmap", "grid"], ["win", "Winners", "crown"]];
  return (
    <div style={{ display: "inline-flex", background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 11, padding: 3, gap: 2 }}>
      {opts.map(([id, label, ic]) => {
        const on = mode === id;
        return (
          <button key={id} onClick={() => setMode(id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: on ? T.green : "transparent", color: on ? T.bg : T.muted, border: "none", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontFamily: body, fontSize: 12.5, fontWeight: 600 }}>
            <Icon name={ic} size={13} color={on ? T.bg : T.faint} /> {label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================== ROOT ============================== */
export function CompareApp({ columns, series }: { columns: CompareColumn[]; series: CompareSeries[] }) {
  const [mode, setMode] = React.useState("bars");
  const cols = columns.filter((c) => c.kind !== "missing");
  const missing = columns.filter((c) => c.kind === "missing");
  const symbols = columns.map((c) => c.symbol);
  const colors = cols.map((_, i) => COL_SEQ[i % COL_SEQ.length]);
  const cleanSeries = useCleanSeries(series);
  const sections = SECTIONS.filter((s) => !s.when || s.when(cols));
  const champTk = React.useMemo(
    () => [...cols].sort((a, b) => overallScore(dimsOf(b)) - overallScore(dimsOf(a)))[0]?.symbol,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns]
  );

  const gridCols = `minmax(150px, 1.1fr) ${cols.map(() => "minmax(0, 1fr)").join(" ")}`;
  const headSlots = symbols.length < 4 ? cols.length + 1 : cols.length;
  const headCols = `minmax(150px, 1.1fr) repeat(${headSlots}, minmax(0, 1fr))`;

  if (cols.length === 0) {
    return (
      <div className="cmp-root" style={{ background: T.bg, color: T.ink, fontFamily: body, padding: "60px 24px", textAlign: "center" }}>
        <style>{CSS}</style>
        <h1 style={{ fontFamily: display, fontSize: 28, fontWeight: 800 }}>No valid tickers</h1>
        <p style={{ color: T.muted }}>{missing.length ? `Not found: ${missing.map((m) => m.symbol).join(", ")}. ` : ""}Pick two to compare.</p>
        <a href="/compare" style={{ color: T.green, fontWeight: 700 }}>Start over</a>
      </div>
    );
  }

  // One valid ticker: not an error — show its card and invite the second pick.
  if (cols.length === 1) {
    const c = cols[0];
    return (
      <div className="cmp-root" style={{ background: T.bg, minHeight: "60vh", color: T.ink, fontFamily: body }}>
        <style>{CSS}</style>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "34px 24px 60px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>Compare · side by side</div>
          <h1 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.03em" }}>{c.symbol} vs …</h1>
          <p style={{ fontSize: 15, color: T.muted, margin: "0 0 24px", maxWidth: 560, lineHeight: 1.55 }}>
            Add a second ticker to unlock the verdict, the radar and the head-to-head table.
            {missing.length > 0 && <span style={{ color: T.amber }}> (Not found: {missing.map((m) => m.symbol).join(", ")})</span>}
          </p>
          <div className="cmp-headGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 280px))", gap: 12, alignItems: "stretch" }}>
            <TickerHead c={c} color={COL_SEQ[0]} symbols={symbols} isWinner={false} />
            <AddPicker symbols={symbols} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cmp-root" style={{ background: T.bg, minHeight: "100vh", color: T.ink, fontFamily: body }}>
      <style>{CSS}</style>

      {/* hero */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "34px 24px 6px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>Compare · side by side</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.03em" }}>{cols.map((c) => c.symbol).join(" vs ")}</h1>
            <p style={{ fontSize: 15, color: T.muted, margin: "8px 0 0", maxWidth: 560, lineHeight: 1.55 }}>Scored head-to-head across income, growth, quality and risk — live data, with a clear verdict on the best all-rounder.</p>
          </div>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        {missing.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: T.amber }}>Not found: {missing.map((m) => m.symbol).join(", ")}</div>
        )}
      </div>

      {/* sticky ticker header — z-index BELOW the site header (30) so the
          nav mega-menu always opens above the ticker cards. */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: T.bg + "f2", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "16px 24px" }}>
          <div className="cmp-headGrid" style={{ display: "grid", gridTemplateColumns: headCols, gap: 12, alignItems: "stretch" }}>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint }}>{cols.length} tickers · max 4</span>
            </div>
            {cols.map((c, i) => (
              <TickerHead key={c.symbol} c={c} color={colors[i]} symbols={symbols} isWinner={c.symbol === champTk} />
            ))}
            {symbols.length < 4 && <AddPicker symbols={symbols} />}
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "10px 24px 70px" }}>
        <Verdict cols={cols} colors={colors} sections={sections} />
        <PricePanel cols={cols} colors={colors} series={cleanSeries} />
        {sections.map((sec) => (
          <MetricSection key={sec.id} sec={sec} cols={cols} colors={colors} mode={mode} gridCols={gridCols} />
        ))}
        <TopHoldings cols={cols} colors={colors} />
        <OverlapPanel cols={cols} colors={colors} />
        <div style={{ fontSize: 11.5, color: T.faint, marginTop: 16, lineHeight: 1.6 }}>
          Live market data. &quot;BEST&quot; and the composite score compare only the tickers currently shown — add or remove a name and the verdict recalculates. Not investment advice.
        </div>
      </div>
    </div>
  );
}

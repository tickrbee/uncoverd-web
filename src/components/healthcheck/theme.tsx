/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import { useState, type ReactNode, type CSSProperties } from "react";

/* ============================== UNCOVERD THEME ============================== */
export const T = {
  bg: "#070b13", bgGlow: "#0e1830",
  panel: "#0f1722", panel2: "#141d2b", raised: "#1a2433",
  line: "#1e2a3a", line2: "#2a3a50",
  ink: "#eef2f7", muted: "#94a3b8", faint: "#5d6b80",
  green: "#2fe3a0", greenDeep: "#16a37a",
  blue: "#3b6ef0", indigo: "#2f51c8", indigoDeep: "#1a2c6b",
  red: "#ff5d6c", amber: "#f0a839", violet: "#9b8cf0", teal: "#36c2d6", gold: "#e0b34e",
};
export const HERO_GRAD = "linear-gradient(118deg, #16235c 0%, #233f9e 46%, #2f55cf 100%)";
export const display = "'Manrope', system-ui, sans-serif";
export const body = "'Manrope', system-ui, sans-serif";
export const mono = "'IBM Plex Mono', ui-monospace, monospace";

export const scoreColor = (s: number) => (s >= 75 ? T.green : s >= 55 ? T.amber : T.red);
export const gradeOf = (s: number) => (s >= 90 ? "A+" : s >= 85 ? "A" : s >= 80 ? "A−" : s >= 75 ? "B+" : s >= 70 ? "B" : s >= 65 ? "B−" : s >= 55 ? "C+" : s >= 45 ? "C" : "D");
export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const usdShort = (n: number) => (Math.abs(n) >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "k" : "$" + Math.round(n));
export const pct = (n: number, d = 1) => `${n > 0 ? "+" : ""}${n.toFixed(d)}%`;

/* ============================== ICONS (lucide paths) ============================== */
const ICON_PATHS: Record<string, string> = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M21.8 10A10 10 0 1 1 17 3.34"/><path d="m9 11 3 3L22 4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  upRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  downRight: '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
  send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.02l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.02.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  bars: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  crown: '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.28-3.67a.5.5 0 0 1 .8.52l-2.84 10.25a1 1 0 0 1-.95.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.66a1 1 0 0 0 1.52-.29z"/><path d="M5 21h14"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  line: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  percent: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

export function Icon({ name, size = 16, color = "currentColor", style, strokeWidth = 2 }: { name: string; size?: number; color?: string; style?: CSSProperties; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || "" }} />
  );
}

/* ============================== PRIMITIVES ============================== */
export function Panel({ children, style, pad = 22, className }: { children: ReactNode; style?: CSSProperties; pad?: number; className?: string }) {
  return <div className={className} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: pad, position: "relative", ...style }}>{children}</div>;
}
export function Eyebrow({ icon, children, accent = T.green, style, info }: { icon?: string; children: ReactNode; accent?: string; style?: CSSProperties; info?: { title: string; body: ReactNode } }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16, ...style }}>
      {icon && <Icon name={icon} size={15} color={accent} />}
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted, fontWeight: 500 }}>{children}</span>
      {info && <InfoDot title={info.title}>{info.body}</InfoDot>}
    </div>
  );
}

// Click-to-open methodology popover. Explains what a metric is, how it's
// calculated and how to read it.
export function InfoDot({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label={`What is ${title}?`}
        style={{ display: "inline-flex", border: "none", background: "transparent", color: T.blue, cursor: "pointer", padding: 0, lineHeight: 0 }}>
        <Icon name="info" size={13} color={open ? T.green : T.blue} />
      </button>
      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }} />
          <span style={{ position: "absolute", top: "150%", left: 0, zIndex: 201, width: 300, maxWidth: "78vw", background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 10, padding: "12px 14px", boxShadow: "0 18px 44px rgba(0,0,0,.55)", textAlign: "left", whiteSpace: "normal", textTransform: "none", letterSpacing: 0 }}>
            <span style={{ display: "block", fontFamily: display, fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 5 }}>{title}</span>
            <span style={{ display: "block", fontFamily: body, fontSize: 12, lineHeight: 1.55, color: T.muted }}>{children}</span>
          </span>
        </>
      )}
    </span>
  );
}
export function Stat({ label, value, sub, color = T.ink, accent }: { label: ReactNode; value: ReactNode; sub?: ReactNode; color?: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: display, fontSize: 23, fontWeight: 700, color, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent || T.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
export function Pill({ children, color, solid }: { children: ReactNode; color: string; solid?: boolean }) {
  return <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", color: solid ? T.bg : color, background: solid ? color : color + "1f", border: `1px solid ${color}${solid ? "" : "44"}`, borderRadius: 7, padding: "3px 9px", whiteSpace: "nowrap" }}>{children}</span>;
}
export function Chip({ children, color = T.muted, onClick, active }: { children: ReactNode; color?: string; onClick?: () => void; active?: boolean }) {
  return <button onClick={onClick} className="hc-chip" style={{ fontFamily: body, fontSize: 12, color: active ? T.bg : color, background: active ? T.green : T.raised, border: `1px solid ${active ? T.green : T.line}`, borderRadius: 20, padding: "6px 13px", cursor: "pointer", fontWeight: 500 }}>{children}</button>;
}

/* ============================== CHART TOOLTIP ============================== */
export function Tip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "9px 12px", fontFamily: mono, fontSize: 11.5, boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
      {label !== undefined && <div style={{ color: T.faint, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || T.ink }}>{p.name}: {fmt ? fmt(p.value) : p.value}</div>
      ))}
    </div>
  );
}

/* ============================== GAUGE + SCOREBAR ============================== */
function polar(cx: number, cy: number, r: number, deg: number) { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 <= 180 ? 0 : 1;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
export function HealthGauge({ score, size = 230 }: { score: number; size?: number }) {
  const A0 = -135, A1 = 135, span = A1 - A0;
  const val = A0 + (span * score) / 100;
  const col = scoreColor(score);
  const grade = gradeOf(score);
  const cx = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size * 0.87 }}>
      <svg width={size} height={size * 0.87} viewBox={`0 0 ${size} ${size * 0.87}`}>
        <defs>
          <linearGradient id="gtrack" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={T.red} /><stop offset="50%" stopColor={T.amber} /><stop offset="100%" stopColor={T.green} />
          </linearGradient>
        </defs>
        <path d={arc(cx, 120, 90, A0, A1)} fill="none" stroke="url(#gtrack)" strokeWidth="5" strokeLinecap="round" opacity="0.25" />
        <path className="hc-gaugeArc" d={arc(cx, 120, 90, A0, val)} fill="none" stroke={col} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 9px ${col}77)` }} />
        {[0, 25, 50, 75, 100].map((v) => {
          const ang = A0 + (span * v) / 100; const [x1, y1] = polar(cx, 120, 76, ang), [x2, y2] = polar(cx, 120, 69, ang);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={T.line2} strokeWidth="1.5" />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, top: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: display, fontSize: 58, fontWeight: 800, color: col, lineHeight: 1, letterSpacing: "-0.03em" }}>{score}</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: T.faint, letterSpacing: "0.12em", marginTop: 4 }}>/ 100</div>
        <div style={{ marginTop: 10, fontFamily: display, fontSize: 22, fontWeight: 700, color: T.ink }}>Grade {grade}</div>
      </div>
    </div>
  );
}
export function ScoreBar({ label, s, note }: { label: ReactNode; s: number; note?: ReactNode }) {
  const col = scoreColor(s);
  return (
    <div style={{ marginBottom: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: col }}>{s}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: T.raised, overflow: "hidden" }}>
        <div className="hc-fill" style={{ height: "100%", background: col, borderRadius: 4, ["--fw" as any]: `${s}%` }} />
      </div>
      {note && <div style={{ fontSize: 11.5, color: T.faint, marginTop: 5 }}>{note}</div>}
    </div>
  );
}

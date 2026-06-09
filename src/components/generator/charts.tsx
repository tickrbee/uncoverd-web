/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Portfolio Generator — charts (donut, allocation bars, Monte Carlo band).

import React from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { T, display, mono } from "@/components/healthcheck/theme";

/* ---------- DONUT (asset class) ---------- */
export function Donut({ data, size = 168, thickness = 20, centerTop, centerBottom }: {
  data: { k: string; w: number; color: string }[];
  size?: number; thickness?: number; centerTop?: React.ReactNode; centerBottom?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  // Precompute each segment's offset so render stays pure.
  const segs: { d: { k: string; w: number; color: string }; len: number; off: number }[] = [];
  let acc = 0;
  for (const d of data.filter((x) => x.w > 0.0005)) {
    const len = d.w * circ;
    segs.push({ d, len, off: acc });
    acc += len;
  }
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.raised} strokeWidth={thickness} />
        {segs.map(({ d, len, off }, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`} style={{ strokeDashoffset: -off, transition: "stroke-dashoffset .5s ease" }}
            strokeLinecap="butt" />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: T.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>{centerTop}</div>
        {centerBottom && <div style={{ fontFamily: mono, fontSize: 10, color: T.faint, marginTop: 4, letterSpacing: "0.08em" }}>{centerBottom}</div>}
      </div>
    </div>
  );
}

/* ---------- horizontal allocation bars ---------- */
export function AllocBars({ data, max }: { data: { k: string; w: number; color: string }[]; max?: number }) {
  const top = max || Math.max(...data.map((d) => d.w));
  return (
    <div style={{ display: "grid", gap: 11 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12.5, color: T.muted }}>{d.k}</span>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.ink, fontWeight: 600 }}>{(d.w * 100).toFixed(1)}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: T.raised, overflow: "hidden" }}>
            <div className="gen-fill" style={{ height: "100%", borderRadius: 4, background: d.color, ["--fw" as any]: `${(d.w / top) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Monte Carlo p10/p50/p90 projection ---------- */
function TipMC({ active, payload, label, sym = "$" }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "9px 12px", fontFamily: mono, fontSize: 11.5, boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
      <div style={{ color: T.faint, marginBottom: 5 }}>{label === 0 ? "Today" : `Year ${label}`}</div>
      <div style={{ color: T.green }}>p90 (best): {sym}{Math.round(row.p90 ?? 0).toLocaleString()}</div>
      <div style={{ color: T.ink }}>p50 (median): {sym}{Math.round(row.p50 ?? 0).toLocaleString()}</div>
      <div style={{ color: T.amber }}>p10 (worst): {sym}{Math.round(row.p10 ?? 0).toLocaleString()}</div>
    </div>
  );
}

export function MonteCarlo({ proj, amount, sym = "$", height = 230 }: { proj: any[]; amount: number; sym?: string; height?: number }) {
  const fmt = (n: number) => (Math.abs(n) >= 1e6 ? sym + (n / 1e6).toFixed(1) + "M" : sym + Math.round(n / 1e3) + "k");
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={proj} margin={{ top: 8, right: 6, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="genMcBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.green} stopOpacity={0.3} />
              <stop offset="100%" stopColor={T.green} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={T.line} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tickFormatter={(t: number) => (t === 0 ? "now" : t + "y")} tick={{ fill: T.faint, fontSize: 11, fontFamily: mono }} axisLine={{ stroke: T.line2 }} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fill: T.faint, fontSize: 11, fontFamily: mono }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<TipMC sym={sym} />} />
          <ReferenceLine y={amount} stroke={T.line2} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="band" stroke="none" fill="url(#genMcBand)" isAnimationActive={false} />
          <Line type="monotone" dataKey="sp" name="S&P 500" stroke={T.faint} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="p50" name="Median" stroke={T.green} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

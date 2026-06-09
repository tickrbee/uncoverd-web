/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

// Portfolio Generator — analytical cards (thesis, risk contribution,
// correlation heatmap, legendary comparison).

import React from "react";
import { T, display, mono, Icon, Panel, Eyebrow } from "@/components/healthcheck/theme";
import type { Metrics } from "./engine";

/* ---------- portfolio thesis ---------- */
export function ThesisCard({ text }: { text: React.ReactNode }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #11202f 0%, #0d1722 70%)", border: `1px solid ${T.line2}`, borderRadius: 16, padding: "20px 22px", marginBottom: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 120% at 100% -10%, rgba(47,227,160,0.08), transparent 55%)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <Icon name="sparkles" size={15} color={T.green} />
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.green }}>Portfolio thesis</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: T.ink, textWrap: "pretty" }}>{text}</p>
      </div>
    </div>
  );
}

/* ---------- risk contribution vs weight ---------- */
export function RiskContribution({ metrics }: { metrics: Metrics }) {
  return (
    <Panel pad={20}>
      <Eyebrow icon="network">Risk contribution</Eyebrow>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: T.faint, lineHeight: 1.5 }}>
        Share of total portfolio risk each holding drives, versus its dollar weight. Bars wider than their weight (red) punch above their size; narrower (green) are diversifiers.
      </p>
      <div style={{ display: "grid", gap: 13 }}>
        {metrics.riskContrib.map((r) => {
          const heavy = r.delta > 0.15;
          return (
            <div key={r.tk}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: T.ink }}>{r.tk}</span>
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, fontWeight: 600, color: heavy ? T.red : r.delta < -0.15 ? T.green : T.faint }}>
                  {r.delta > 0 ? "+" : ""}{r.delta.toFixed(1)}pp
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 9, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: mono, fontSize: 9.5, color: T.faint }}>WEIGHT</span>
                <div style={{ height: 6, borderRadius: 3, background: T.raised, overflow: "hidden" }}>
                  <div className="gen-fill" style={{ height: "100%", borderRadius: 3, background: T.line2, ["--fw" as any]: `${Math.min(100, (r.w / metrics.maxRc) * 100)}%` }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, textAlign: "right" }}>{(r.w * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 9, alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 9.5, color: T.faint }}>RISK</span>
                <div style={{ height: 6, borderRadius: 3, background: T.raised, overflow: "hidden" }}>
                  <div className="gen-fill" style={{ height: "100%", borderRadius: 3, background: heavy ? T.red : r.color, ["--fw" as any]: `${Math.min(100, (r.rc / metrics.maxRc) * 100)}%` }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.ink, textAlign: "right", fontWeight: 600 }}>{(r.rc * 100).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ---------- correlation matrix heatmap ---------- */
export function CorrelationMatrix({ corr, divR }: { corr: { tks: string[]; M: number[][] }; divR: number }) {
  const { tks, M } = corr;
  const n = tks.length;
  const cell = (v: number) => {
    const a = 0.1 + v * 0.62;
    return { bg: `rgba(255,93,108,${a.toFixed(2)})`, fg: v > 0.62 ? "#fff" : v > 0.35 ? T.ink : T.muted };
  };
  return (
    <Panel pad={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <Eyebrow icon="grid" style={{ marginBottom: 0 }}>Correlation matrix</Eyebrow>
        <span style={{ fontFamily: mono, fontSize: 11, color: T.green, background: T.green + "14", border: `1px solid ${T.green}33`, borderRadius: 7, padding: "4px 10px" }}>
          diversification ratio {divR.toFixed(2)}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `46px repeat(${n}, minmax(34px, 1fr))`, gap: 2, minWidth: 40 + n * 36 }}>
          <div></div>
          {tks.map((t) => <div key={t} style={{ fontFamily: mono, fontSize: 8.5, color: T.faint, textAlign: "center", padding: "2px 0", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</div>)}
          {M.map((row, i) => (
            <React.Fragment key={i}>
              <div style={{ fontFamily: mono, fontSize: 8.5, color: T.faint, display: "flex", alignItems: "center", paddingRight: 4, justifyContent: "flex-end" }}>{tks[i]}</div>
              {row.map((v, j) => {
                const c = cell(v);
                return <div key={j} style={{ background: c.bg, color: c.fg, fontFamily: mono, fontSize: 8.5, textAlign: "center", padding: "6px 0", borderRadius: 3, fontWeight: i === j ? 700 : 400 }}>{v.toFixed(2)}</div>;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 11.5, color: T.faint }}>Lower correlations (paler cells) mean holdings move more independently — that's the volatility you save by combining them. Estimated from sector &amp; asset-class structure, not trailing price data.</div>
    </Panel>
  );
}

/* ---------- legendary portfolio comparison ---------- */
export function LegendaryComparison({ rows }: { rows: { name: string; desc: string; chips: string[] | null; er: number; sharpe: number; maxDD: number; yours?: boolean }[] }) {
  return (
    <Panel pad={20}>
      <Eyebrow icon="crown">Legendary portfolio comparison</Eyebrow>
      <div className="gen-legendGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {rows.map((p) => (
          <div key={p.name} style={{ position: "relative", background: p.yours ? "linear-gradient(135deg, #11202f, #0d1722)" : T.bg, border: `1px solid ${p.yours ? T.green : T.line}`, borderRadius: 13, padding: "16px 16px 14px" }}>
            {p.yours && <span style={{ position: "absolute", top: -10, right: 14, background: T.green, color: T.bg, fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", borderRadius: 12, padding: "3px 9px" }}>YOURS</span>}
            <div style={{ fontFamily: display, fontSize: 14.5, fontWeight: 800, color: p.yours ? T.green : T.ink, marginBottom: 5 }}>{p.name}</div>
            <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.45, marginBottom: 12, minHeight: 32 }}>{p.desc}</div>
            {p.chips && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 13 }}>
                {p.chips.map((ch) => <span key={ch} style={{ fontFamily: mono, fontSize: 9.5, color: T.muted, background: T.raised, border: `1px solid ${T.line}`, borderRadius: 5, padding: "2px 6px" }}>{ch}</span>)}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, paddingTop: 11, borderTop: `1px solid ${T.line}` }}>
              {([["RTN", `+${p.er.toFixed(1)}%`, T.green], ["SHARPE", p.sharpe.toFixed(2), T.ink], ["MAX DD", `${p.maxDD.toFixed(0)}%`, T.red]] as const).map(([l, v, cc]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: mono, fontSize: 8.5, color: T.faint, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: cc }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

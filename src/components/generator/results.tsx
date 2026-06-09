/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Portfolio Generator — full results view (premium / paying users).

import React from "react";
import Link from "next/link";
import { T, display, body, mono, Icon, Panel, Eyebrow, ScoreBar, gradeOf, scoreColor } from "@/components/healthcheck/theme";
import { RISK_ALLOC, OBJ_W, thesisOf, rationaleOf, legendaryComparison, autoNotes, type GenResult, type Variant, type Holding, type Metrics } from "./engine";
import { curSym, fmtCur, fmtCurShort } from "./currency";
import { Donut, AllocBars, MonteCarlo } from "./charts";
import { ThesisCard, RiskContribution, CorrelationMatrix, LegendaryComparison } from "./cards";
import { genTypeColor, genTypeLabel } from "./form";

// uncoverd composite-grade colour (same convention as the dividend table).
export const gradePillColor = (g: string) =>
  g.startsWith("A") ? T.green : g.startsWith("B") ? T.gold : g === "—" ? T.faint : T.red;

export function GradePill({ grade }: { grade: string }) {
  const c = gradePillColor(grade);
  return (
    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c, background: c + "16", border: `1px solid ${c}44`, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>
      {grade}
    </span>
  );
}

/* ---------- six frontier portfolios grid ---------- */
export function FrontierGrid({ variants, selected, onSelect }: { variants: Variant[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <Panel pad={20}>
      <Eyebrow icon="zap">Six frontier portfolios</Eyebrow>
      <div className="gen-frontierGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {variants.map((v) => {
          const on = selected === v.id;
          const c = v.tag.color;
          return (
            <button key={v.id} onClick={() => onSelect(v.id)} className="gen-frontierCard" style={{
              textAlign: "left", cursor: "pointer", borderRadius: 13, padding: "14px 16px",
              background: on ? `linear-gradient(135deg, ${c}1f, ${T.panel2})` : T.bg,
              border: `1px solid ${on ? c : T.line}`, boxShadow: on ? `0 0 0 1px ${c}, 0 12px 30px -16px ${c}66` : "none",
              transition: "border-color .15s, background .15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: on ? c : T.faint, fontWeight: 600 }}>
                  {v.label}{v.rec ? " · rec" : ""}
                </span>
                {on && <Icon name="check" size={14} color={c} />}
              </div>
              <div style={{ fontFamily: display, fontSize: 21, fontWeight: 800, color: c, letterSpacing: "-0.01em", lineHeight: 1 }}>{v.tag.a}</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginTop: 6 }}>{v.tag.b}</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="sparkles" size={13} color={T.gold} />
        New here? <span style={{ color: T.muted }}>Min Variance minimizes downside · Max Sharpe targets the best risk-adjusted return · Max Return swings for upside.</span>
      </div>
    </Panel>
  );
}

/* ---------- eight stats grid ---------- */
export function StatGrid({ stats }: { stats: Metrics["stats"] }) {
  return (
    <div className="gen-statGrid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 11 }}>
      {stats.map((s: any) => {
        const col = s.pos ? T.green : s.neg ? T.red : T.ink;
        return (
          <div key={s.k} style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint, marginBottom: 7 }}>{s.k}</div>
            <div style={{ fontFamily: display, fontSize: 21, fontWeight: 800, color: col, letterSpacing: "-0.01em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- historical stress tests ---------- */
export function StressTests({ metrics }: { metrics: Metrics }) {
  return (
    <Panel pad={20}>
      <Eyebrow icon="alert" accent={T.amber}>Historical stress tests</Eyebrow>
      <div style={{ display: "grid", gap: 10 }}>
        {metrics.stress.map((s) => (
          <div key={s.name} className="gen-stressRow" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 12, alignItems: "center", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 11, padding: "12px 15px" }}>
            <div>
              <div style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{s.name}</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: T.faint, marginTop: 2 }}>{s.window}</div>
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: T.faint, marginBottom: 3 }}>PORTFOLIO</div>
              <div style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: T.ink }}>{s.port}%</div>
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: T.faint, marginBottom: 3 }}>SPY</div>
              <div style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: T.faint }}>{s.spy}%</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.green, background: T.green + "16", border: `1px solid ${T.green}44`, borderRadius: 7, padding: "4px 9px", whiteSpace: "nowrap" }}>
                +{s.outperf}% vs SPY
              </span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 13, fontSize: 12.5, color: metrics.survived ? T.green : T.amber, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name={metrics.survived ? "check" : "alert"} size={14} color={metrics.survived ? T.green : T.amber} />
        {metrics.survived
          ? "Survived all four regime breaks — drawdowns stayed inside the risk-profile ceiling."
          : `Worst-case drawdown (${metrics.worst}%) breached the risk-profile ceiling. Consider a lower-risk variant.`}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: T.faint }}>
        Modelled from portfolio beta and bond share applied to each crisis — not a holdings-level backtest.
      </div>
    </Panel>
  );
}

/* ---------- per-holding rationale ---------- */
export function Rationale({ holdings }: { holdings: Holding[] }) {
  return (
    <Panel pad={20}>
      <Eyebrow icon="sparkles">Why these picks</Eyebrow>
      <div style={{ display: "grid", gap: 0 }}>
        {holdings.slice(0, 7).map((h, i) => (
          <div key={h.tk} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
            <div style={{ width: 92, flexShrink: 0 }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{h.tk}</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: T.green, marginTop: 2 }}>{(h.w * 100).toFixed(0)}%</div>
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{rationaleOf(h)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- holdings table ---------- */
const HCOLS = "minmax(180px, 1.9fr) 64px 0.7fr 0.8fr 0.9fr 56px";
function HoldingsTable({ holdings, sym, onPin, onRemove }: { holdings: Holding[]; sym: string; onPin: (tk: string) => void; onRemove: (tk: string) => void }) {
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: HCOLS, gap: 8, padding: "11px 16px", background: T.panel2, borderBottom: `1px solid ${T.line2}`, fontFamily: mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>
        <span>Holding</span><span>Rating</span><span style={{ textAlign: "right" }}>Weight</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Yield</span><span></span>
      </div>
      {holdings.map((h) => {
        const c = genTypeColor(h.type);
        return (
          <div key={h.tk} className="gen-row" style={{ display: "grid", gridTemplateColumns: HCOLS, gap: 8, padding: "12px 16px", alignItems: "center", borderBottom: `1px solid ${T.line}`, transition: "background .12s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{h.tk}</span>
                  {h.isAnchor && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: mono, fontSize: 8, color: T.green, border: `1px solid ${T.green}66`, borderRadius: 4, padding: "1px 4px" }}><Icon name="sparkles" size={8} color={T.green} /> ANCHOR</span>}
                  <span style={{ fontFamily: mono, fontSize: 8, color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "1px 4px" }}>{genTypeLabel(h.type)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name} · {h.sector}</div>
              </div>
            </div>
            <div><GradePill grade={h.rate} /></div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{(h.w * 100).toFixed(1)}%</span>
              <div style={{ height: 4, borderRadius: 2, background: T.raised, overflow: "hidden", marginTop: 4 }}>
                <div className="gen-fill" style={{ height: "100%", background: c, borderRadius: 2, ["--fw" as any]: `${Math.min(100, (h.w / 0.42) * 100)}%` }} />
              </div>
            </div>
            <span style={{ textAlign: "right", fontFamily: mono, fontSize: 12.5, color: T.muted }}>{fmtCurShort(h.usd, sym)}</span>
            <span style={{ textAlign: "right", fontFamily: mono, fontSize: 12.5, color: h.yield > 0 ? T.green : T.faint }}>{h.yield > 0 ? h.yield.toFixed(1) + "%" : "—"}</span>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              {!h.isAnchor && h.cls !== "cash" && (
                <button onClick={() => onPin(h.tk)} title="Pin as anchor" className="gen-rowBtn" style={{ display: "flex", background: "transparent", border: `1px solid ${T.line2}`, borderRadius: 7, padding: 5, cursor: "pointer", color: T.faint }}>
                  <Icon name="sparkles" size={13} />
                </button>
              )}
              {h.cls !== "cash" && (
                <button onClick={() => onRemove(h.tk)} title="Remove & re-roll" className="gen-rowBtn" style={{ display: "flex", background: "transparent", border: `1px solid ${T.line2}`, borderRadius: 7, padding: 5, cursor: "pointer", color: T.faint }}>
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function downloadCsv(holdings: Holding[], amount: number, code: string) {
  const head = `symbol,name,type,sector,rating,weight_pct,amount_${code.toLowerCase()},yield_pct`;
  const rows = holdings.map((h) =>
    [h.tk, `"${(h.name || "").replace(/"/g, '""')}"`, h.type, `"${h.sector}"`, h.rate, (h.w * 100).toFixed(2), Math.round(h.usd), h.yield.toFixed(2)].join(",")
  );
  const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `uncoverd-portfolio-${Math.round(amount / 1000)}k.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- main results (premium) ---------- */
export function ResultsView({ result, selected, onSelect, onPin, onRemove }: {
  result: GenResult;
  selected: string;
  onSelect: (id: string) => void;
  onPin: (tk: string) => void;
  onRemove: (tk: string) => void;
}) {
  const variant = result.variants.find((v) => v.id === selected) || result.variants.find((v) => v.rec) || result.variants[0];
  const m = variant.metrics;
  const holdings = variant.holdings;
  const { risk, objective } = result.inputs;
  const sym = curSym(result.inputs.currency);
  const name = `${RISK_ALLOC[risk].label} ${OBJ_W[objective].label}`;
  const col = scoreColor(m.overall);
  const notes = autoNotes(m, holdings, result.inputs, sym);
  const beat = m.projEnd.p50 - m.projEnd.sp;

  return (
    <div className="gen-fade">
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.green, marginBottom: 9 }}>Your generated portfolio</div>
          <h2 style={{ fontFamily: display, fontSize: 28, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>{name}</h2>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>{variant.label} optimization · {holdings.length} holdings · sized to {fmtCur(result.inputs.amount, sym)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint, marginBottom: 5 }}>Health grade</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
              <span style={{ fontFamily: display, fontSize: 30, fontWeight: 800, color: col, lineHeight: 1 }}>{gradeOf(m.overall)}</span>
              <span style={{ fontFamily: mono, fontSize: 13, color: T.muted }}>{m.overall}<span style={{ color: T.faint }}>/100</span></span>
            </div>
          </div>
          <div style={{ width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `conic-gradient(${col} ${m.overall * 3.6}deg, ${T.raised} 0)` }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.panel, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="gauge" size={20} color={col} />
            </div>
          </div>
        </div>
      </div>

      {/* thesis */}
      <ThesisCard text={thesisOf(result, variant)} />

      {/* frontier grid */}
      <div style={{ marginBottom: 20 }}>
        <FrontierGrid variants={result.variants} selected={selected} onSelect={onSelect} />
      </div>

      {/* correlation matrix — full width, above the holdings */}
      <div style={{ marginBottom: 20 }}>
        <CorrelationMatrix corr={m.corr} divR={m.divR} />
      </div>

      {/* allocation: donut + holdings (holdings get the wide column) */}
      <div className="gen-twoColWide" style={{ display: "grid", gridTemplateColumns: "0.65fr 1.35fr", gap: 16, marginBottom: 20 }}>
        <Panel pad={20}>
          <Eyebrow icon="pie">Asset mix</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Donut data={m.classAlloc} centerTop={Math.round(m.eqW * 100) + "%"} centerBottom="EQUITY" />
            <div style={{ display: "grid", gap: 9, width: "100%" }}>
              {m.classAlloc.map((c) => (
                <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                  <span style={{ fontSize: 12.5, color: T.muted, flex: 1 }}>{c.k}</span>
                  <span style={{ fontFamily: mono, fontSize: 12.5, color: T.ink, fontWeight: 600 }}>{Math.round(c.w * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Eyebrow icon="building" style={{ marginBottom: 0 }}>Recommended allocation · {holdings.length}</Eyebrow>
            <span style={{ fontSize: 11.5, color: T.faint, display: "inline-flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="sparkles" size={12} color={T.green} /> pin</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="x" size={12} /> re-roll</span>
            </span>
          </div>
          <HoldingsTable holdings={holdings} sym={sym} onPin={onPin} onRemove={onRemove} />
        </div>
      </div>

      {/* eight stats */}
      <div style={{ marginBottom: 20 }}>
        <Eyebrow icon="bars">The eight stats that matter</Eyebrow>
        <StatGrid stats={m.stats} />
      </div>

      {/* monte carlo */}
      <Panel pad={20} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <Eyebrow icon="line" style={{ marginBottom: 0 }}>Monte Carlo projection · {m.years} years</Eyebrow>
          <span style={{ fontFamily: mono, fontSize: 11, color: beat >= 0 ? T.green : T.red }}>{beat >= 0 ? "+" : ""}{fmtCurShort(beat, sym)} vs S&P median</span>
        </div>
        <MonteCarlo proj={m.proj} amount={result.inputs.amount} sym={sym} />
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8, paddingTop: 13, borderTop: `1px solid ${T.line}` }}>
          {([["p10 · worst case", m.projEnd.p10, T.amber], ["p50 · median", m.projEnd.p50, T.ink], ["p90 · best case", m.projEnd.p90, T.green]] as const).map(([lab, val, cc]) => (
            <div key={lab} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: T.faint, letterSpacing: "0.06em" }}>{lab.toUpperCase()}</div>
              <div style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color: cc, marginTop: 3 }}>{fmtCur(val, sym)}</div>
            </div>
          ))}
        </div>
        {result.inputs.monthlyDCA > 0 && (
          <div style={{ marginTop: 12, fontSize: 11.5, color: T.faint, textAlign: "center" }}>
            Includes {fmtCur(result.inputs.monthlyDCA, sym)}/mo contributions · {fmtCur(m.contributed, sym)} total invested over {m.years} years.
          </div>
        )}
      </Panel>

      {/* stress tests */}
      <div style={{ marginBottom: 20 }}><StressTests metrics={m} /></div>

      {/* risk contribution — full width */}
      <div style={{ marginBottom: 20 }}><RiskContribution metrics={m} /></div>

      {/* sectors + scores */}
      <div className="gen-twoCol" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Panel pad={20}>
          <Eyebrow icon="layers">Sector exposure</Eyebrow>
          <AllocBars data={m.sectorAlloc} />
        </Panel>
        <Panel pad={20}>
          <Eyebrow icon="gauge">Why this grade</Eyebrow>
          {m.subscores.map((s) => <ScoreBar key={s.k} label={s.k} s={s.s} note={s.note} />)}
        </Panel>
      </div>

      {/* per-holding rationale */}
      <div style={{ marginBottom: 20 }}><Rationale holdings={holdings} /></div>

      {/* legendary comparison */}
      <div style={{ marginBottom: 20 }}><LegendaryComparison rows={legendaryComparison(m)} /></div>

      {/* notes */}
      {notes.length > 0 && (
        <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
          {notes.map((n, i) => {
            const c = n.sev === "positive" ? T.green : T.amber;
            return (
              <div key={i} style={{ display: "flex", gap: 13, background: T.panel, border: `1px solid ${T.line}`, borderLeft: `3px solid ${c}`, borderRadius: 12, padding: "15px 18px" }}>
                <Icon name={n.sev === "positive" ? "check" : "alert"} size={17} color={c} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{n.t}</div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{n.b}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <div style={{ display: "flex", gap: 11, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => downloadCsv(holdings, result.inputs.amount, result.inputs.currency)} className="gen-btnPrimary" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: T.green, color: T.bg, border: `1px solid ${T.green}`, borderRadius: 11, padding: "13px 20px", fontFamily: body, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          <Icon name="send" size={15} /> Download allocation (CSV)
        </button>
        <Link href="/tools/portfolio-healthcheck" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9, background: T.panel, color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "13px 20px", fontFamily: body, fontSize: 14, fontWeight: 600 }}>
          <Icon name="gauge" size={15} color={T.muted} /> Open Portfolio Healthcheck
        </Link>
        <span style={{ fontSize: 11.5, color: T.faint, maxWidth: 300 }}>Not investment advice. Forward figures are modelled assumptions, not guarantees.</span>
      </div>
    </div>
  );
}

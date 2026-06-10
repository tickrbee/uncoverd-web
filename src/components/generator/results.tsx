/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Portfolio Generator — full results view (premium / paying users).

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { T, display, body, mono, Icon, Panel, Eyebrow, ScoreBar, gradeOf, scoreColor } from "@/components/healthcheck/theme";
import { RISK_ALLOC, OBJ_W, thesisOf, rationaleOf, legendaryComparison, legendaryWindowYears, autoNotes, type GenResult, type Variant, type Holding, type Metrics } from "./engine";
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

/* Measured-vs-modelled status: once the price-history analysis lands, the
   risk numbers are real; until then they're model estimates. */
export function MeasuredBadge({ measured, loading }: { measured: boolean; loading: boolean }) {
  if (measured) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.green, background: T.green + "14", border: `1px solid ${T.green}44`, borderRadius: 999, padding: "4px 10px" }}>
        <Icon name="check" size={12} color={T.green} /> MEASURED · REAL PRICE HISTORY
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.amber, background: T.amber + "14", border: `1px solid ${T.amber}44`, borderRadius: 999, padding: "4px 10px" }}>
      {loading && <span style={{ display: "inline-flex", animation: "gen-spin 1s linear infinite" }}><Icon name="loader" size={12} color={T.amber} /></span>}
      {loading ? "MEASURING REAL DATA…" : "MODEL ESTIMATES"}
    </span>
  );
}

/* Hand the generated book (with weights + amount) to the Portfolio
   Healthcheck via its sessionStorage seed slot. */
export function openInHealthcheck(holdings: Holding[], name: string, amount: number) {
  try {
    const picks = holdings
      .filter((h) => h.cls !== "cash")
      .map((h) => ({
        symbol: h.tk,
        name: h.name,
        sector: h.sector,
        is_etf: h.etf,
        type: h.type === "stock" ? "stock" : "etf",
        weight: +(h.w * 100).toFixed(2),
      }));
    sessionStorage.setItem("hc-seed-picks", JSON.stringify({ picks, name, value: amount }));
  } catch { /* navigation still works; healthcheck just starts empty */ }
  window.location.href = "/tools/portfolio-healthcheck";
}

/* ---------- REAL historical backtest (growth of 100 vs SPY) ---------- */
export function BacktestChart({ curve, er }: { curve: { i: number; port: number; bench: number }[]; er: number }) {
  const W = 1000, H = 240, padL = 4, padR = 56, padT = 12, padB = 10;
  const all = curve.flatMap((p) => [p.port, p.bench]);
  let lo = Math.min(...all), hi = Math.max(...all);
  const padY = (hi - lo) * 0.07 || 4; lo -= padY; hi += padY;
  const n = curve.length;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = (key: "port" | "bench") => curve.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");
  const last = curve[n - 1];
  // Crosshair hover (same treatment as the compare price chart).
  const [hov, setHov] = React.useState<number | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const plotFrac = (W - padL - padR) / W;
  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const f = (e.clientX - rect.left) / rect.width / plotFrac;
    setHov(f >= 0 && f <= 1 ? Math.round(f * (n - 1)) : null);
  };
  const hp = hov != null ? curve[hov] : null;
  return (
    <Panel pad={20} style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <Eyebrow icon="line" style={{ marginBottom: 0 }}>Historical backtest · real daily closes</Eyebrow>
        <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>
          {hp ? (
            <>
              <span style={{ color: T.green, fontWeight: 700 }}>portfolio {(hp.port - 100 >= 0 ? "+" : "") + (hp.port - 100).toFixed(1)}%</span>
              {" · "}SPY {(hp.bench - 100 >= 0 ? "+" : "") + (hp.bench - 100).toFixed(1)}% at cursor
            </>
          ) : (
            <>
              <span style={{ color: T.green, fontWeight: 700 }}>portfolio {last ? (last.port - 100 >= 0 ? "+" : "") + (last.port - 100).toFixed(1) + "%" : ""}</span>
              {" · "}SPY {last ? (last.bench - 100 >= 0 ? "+" : "") + (last.bench - 100).toFixed(1) + "%" : ""}
              {" · "}{er.toFixed(1)}%/yr annualized
            </>
          )}
        </span>
      </div>
      <div ref={wrapRef} style={{ position: "relative", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
      {hov != null && hp && (
        <>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(x(hov) / W) * 100}%`, width: 1, background: T.line2, pointerEvents: "none" }} />
          <span style={{ position: "absolute", left: `calc(${(x(hov) / W) * 100}% - 4px)`, top: y(hp.port) - 4, width: 8, height: 8, borderRadius: "50%", background: T.green, border: `1.5px solid ${T.bg}`, pointerEvents: "none" }} />
          <span style={{ position: "absolute", left: `calc(${(x(hov) / W) * 100}% - 4px)`, top: y(hp.bench) - 4, width: 8, height: 8, borderRadius: "50%", background: T.faint, border: `1.5px solid ${T.bg}`, pointerEvents: "none" }} />
        </>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={240} preserveAspectRatio="none" style={{ display: "block" }}>
        {[0, 1, 2, 3].map((i) => {
          const g = lo + ((hi - lo) * i) / 3;
          return (
            <g key={i}>
              <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke={T.line} strokeWidth="1" opacity={Math.abs(g - 100) < 1 ? 0.9 : 0.4} strokeDasharray={Math.abs(g - 100) < 1 ? "0" : "3 5"} />
              <text x={W - padR + 8} y={y(g)} fill={T.faint} fontSize="13" fontFamily={mono} dominantBaseline="middle">{g.toFixed(0)}</text>
            </g>
          );
        })}
        <path d={path("bench")} fill="none" stroke={T.faint} strokeWidth="1.6" strokeDasharray="5 4" style={{ vectorEffect: "non-scaling-stroke" }} />
        <path d={path("port")} fill="none" stroke={T.green} strokeWidth="2.4" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 5px ${T.green}44)`, vectorEffect: "non-scaling-stroke" }} />
      </svg>
      </div>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8 }}>
        This exact basket at these weights, replayed over the overlapping daily price history (≈1.5y) against SPY — growth of 100, price-only. This is what &quot;Annualized&quot; in the stats is built on.
      </div>
    </Panel>
  );
}

/* ---------- factor exposures (real, vs S&P 500) ---------- */
export function FactorPanel({ factors }: { factors: { factor: string; port: number; bench: number }[] }) {
  return (
    <Panel pad={20} style={{ marginBottom: 20 }}>
      <Eyebrow icon="layers">Factor exposure · vs S&P 500</Eyebrow>
      <div style={{ display: "grid", gap: 11 }}>
        {factors.map((f) => (
          <div key={f.factor}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 4 }}>
              <span>{f.factor}</span>
              <span><span style={{ color: T.green, fontWeight: 700 }}>{Math.round(f.port)}</span> <span style={{ color: T.faint }}>vs {Math.round(f.bench)}</span></span>
            </div>
            <div style={{ position: "relative", height: 7, background: T.raised, borderRadius: 4 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, f.port))}%`, background: T.green, borderRadius: 4, opacity: 0.85 }} />
              <div style={{ position: "absolute", left: `${Math.min(100, Math.max(0, f.bench))}%`, top: -2, bottom: -2, width: 2, background: T.faint, borderRadius: 1 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: T.faint }}>Weighted from the holdings&apos; rating pillars and market stats; the grey tick marks the S&amp;P 500 baseline.</div>
    </Panel>
  );
}

/* ---------- AI analysis (LLM layer, premium) ---------- */
function AiAnalysis({ result, variant, auto = false }: { result: GenResult; variant: Variant; auto?: boolean }) {
  const [answer, setAnswer] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const m = variant.metrics;

  async function run() {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const supabase = createClient();
      const portfolio = {
        inputs: {
          amount: result.inputs.amount, risk: result.inputs.risk, objective: result.inputs.objective,
          horizonYears: result.inputs.years, goal: result.inputs.goal || undefined,
          sectors: result.inputs.sectors.length ? result.inputs.sectors : undefined,
        },
        optimization: variant.label,
        holdings: variant.holdings.map((h) => ({
          symbol: h.tk, name: h.name, type: h.type, sector: h.sector,
          weightPct: +(h.w * 100).toFixed(1), yieldPct: h.yield, beta: h.beta, rating: h.rate,
        })),
        metrics: {
          annualReturnPct: m.er, volatilityPct: m.vol, sharpe: m.sharpe, sortino: m.sortino,
          maxDrawdownPct: m.maxDD, betaVsSp500: m.beta, blendedYieldPct: m.yield,
          diversificationRatio: m.divR, measuredFromPriceHistory: m.measured,
          sectorWeights: m.sectorAlloc.map((s) => ({ sector: s.k, pct: +(s.w * 100).toFixed(1) })),
        },
      };
      const question =
        "Write the investment thesis for this generated portfolio: why this mix fits the stated inputs, what drives its risk and income, the concentration to watch, and the role of the largest holdings.";
      const { data, error } = await supabase.functions.invoke("portfolio-analyst", { body: { question, portfolio } });
      if (error) throw error;
      const a = (data as { answer?: string; error?: string }) ?? {};
      if (a.answer) setAnswer(a.answer);
      else setErr(a.error || "No answer — try again.");
    } catch {
      setErr("AI analysis is unavailable right now — try again in a minute.");
    }
    setBusy(false);
  }

  // Auto-run once the variant is measured (premium UX: no extra click).
  const ranFor = React.useRef("");
  React.useEffect(() => {
    if (!auto || busy) return;
    const key = variant.id + variant.holdings.map((h) => h.tk).join(",");
    if (ranFor.current === key) return;
    ranFor.current = key;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, variant.id]);

  return (
    <Panel pad={20}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: answer || err ? 12 : 0 }}>
        <Eyebrow icon="sparkles" style={{ marginBottom: 0 }}>AI analysis</Eyebrow>
        <button onClick={run} disabled={busy} className="gen-btnPrimary" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: busy ? T.raised : T.green, color: busy ? T.muted : T.bg, border: "none", borderRadius: 10, padding: "9px 16px", fontFamily: body, fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
          {busy
            ? <><span style={{ display: "inline-flex", animation: "gen-spin 1s linear infinite" }}><Icon name="loader" size={14} /></span> Analysing…</>
            : <><Icon name="sparkles" size={14} /> {answer ? "Re-analyse" : "Analyse this portfolio"}</>}
        </button>
      </div>
      {err && <div style={{ fontSize: 13, color: T.red }}>{err}</div>}
      {answer && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: T.ink, textWrap: "pretty" }}>{answer}</p>}
      {!answer && !err && !busy && (
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: T.faint, lineHeight: 1.5 }}>
          An AI analyst reads this exact book — holdings, weights, measured risk — and writes the thesis in plain English. Educational analysis, not advice.
        </p>
      )}
    </Panel>
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
              <div style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: T.ink, display: "flex", alignItems: "center", gap: 7 }}>
                {s.name}
                <span style={{ fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: s.real ? T.green : T.faint, border: `1px solid ${s.real ? T.green + "55" : T.line2}`, borderRadius: 5, padding: "1.5px 6px" }}>
                  {s.real ? "MEASURED" : "MODELLED"}
                </span>
              </div>
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
        {metrics.stress.some((s) => s.real)
          ? "MEASURED rows replay this exact basket through the crisis window using real daily closes (weights renormalised over holdings that traded then). 2008 predates the stored history and stays modelled from beta and bond share."
          : "Modelled from portfolio beta and bond share applied to each crisis — not a holdings-level backtest."}
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
export function ResultsView({ result, selected, onSelect, onPin, onRemove, realLoading = false }: {
  result: GenResult;
  selected: string;
  onSelect: (id: string) => void;
  onPin: (tk: string) => void;
  onRemove: (tk: string) => void;
  realLoading?: boolean;
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
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <MeasuredBadge measured={!!m.measured} loading={realLoading} />
            {variant.optimized && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#7aa7ff", background: "#7aa7ff14", border: "1px solid #7aa7ff44", borderRadius: 7, padding: "4px 9px" }}>
                <Icon name="zap" size={11} color="#7aa7ff" /> BLACK–LITTERMAN OPTIMIZED
              </span>
            )}
            {variant.optimized && variant.costBps != null && (
              <span style={{ fontFamily: mono, fontSize: 10, color: T.faint }}>est. cost to implement ~{variant.costBps} bps</span>
            )}
          </div>
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
        <CorrelationMatrix corr={m.corr} divR={m.divR} measured={!!m.measured} />
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
        {m.projCapped && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.amber, textAlign: "center" }}>
            Forward paths use a capped 15%/yr expected return — the measured {m.er.toFixed(0)}%/yr came from a hot ~1.5y window and won&apos;t compound for {m.years} years.
          </div>
        )}
      </Panel>

      {/* REAL backtest — this exact basket replayed against SPY */}
      {m.curve && m.curve.length > 10 && <BacktestChart curve={m.curve} er={m.er} />}

      {/* stress tests */}
      <div style={{ marginBottom: 20 }}><StressTests metrics={m} /></div>

      {/* risk contribution — full width */}
      <div style={{ marginBottom: 20 }}><RiskContribution metrics={m} /></div>

      {/* factor exposures (real) */}
      {m.factorsReal && m.factorsReal.length > 0 && <FactorPanel factors={m.factorsReal} />}

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

      {/* AI analysis (LLM) — auto-runs once the variant is measured */}
      <div style={{ marginBottom: 20 }}><AiAnalysis result={result} variant={variant} auto={!!m.measured} /></div>

      {/* per-holding rationale */}
      <div style={{ marginBottom: 20 }}><Rationale holdings={holdings} /></div>

      {/* legendary comparison */}
      <div style={{ marginBottom: 20 }}>
        <LegendaryComparison rows={legendaryComparison(m)}
          note={legendaryWindowYears(m)
            ? `All cards — including yours — are measured over the same ~${legendaryWindowYears(m)}y window of real daily closes. Like for like.`
            : m.measured ? "Your figures are measured over the recent price window; the legendary rows are long-run estimates — different horizons, compare direction not decimals." : undefined} />
      </div>

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
        <button onClick={() => openInHealthcheck(holdings, name, result.inputs.amount)} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: T.panel, color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "13px 20px", fontFamily: body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Icon name="gauge" size={15} color={T.muted} /> Open in Healthcheck — holdings &amp; weights included
        </button>
        <span style={{ fontSize: 11.5, color: T.faint, maxWidth: 300 }}>Not investment advice. Forward figures are modelled assumptions, not guarantees.</span>
      </div>
    </div>
  );
}

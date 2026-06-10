/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Portfolio Generator — FREE results view. Free accounts can generate, but the
// stock/ETF names are blurred and the decision-grade analytics are locked
// behind Premium.

import React from "react";
import Link from "next/link";
import { T, display, body, mono, Icon, Panel, Eyebrow, gradeOf, scoreColor } from "@/components/healthcheck/theme";
import { RISK_ALLOC, OBJ_W, thesisOf, legendaryComparison, type GenResult, type Holding } from "./engine";
import { curSym, fmtCur, fmtCurShort } from "./currency";
import { Donut, AllocBars, MonteCarlo } from "./charts";
import { ThesisCard, RiskContribution, CorrelationMatrix, LegendaryComparison } from "./cards";
import { FrontierGrid, StatGrid, StressTests, Rationale, GradePill, MeasuredBadge, BacktestChart } from "./results";
import { genTypeColor, genTypeLabel } from "./form";

/* blur a ticker/name so free users can't read the actual picks */
export function Blur({ children, pad = 6 }: { children: React.ReactNode; pad?: number }) {
  return <span style={{ filter: "blur(5px)", userSelect: "none", color: T.muted, fontWeight: 700, padding: `0 ${pad}px` }} aria-hidden="true">{children}</span>;
}

function ThesisBlurred({ text, tickers }: { text: string; tickers: string[] }) {
  const uniq = [...new Set(tickers)].filter(Boolean).sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!uniq.length) return <>{text}</>;
  const re = new RegExp("\\b(" + uniq.join("|") + ")\\b", "g");
  const parts = text.split(re);
  const set = new Set(tickers);
  return <>{parts.map((p, i) => (set.has(p) ? <Blur key={i} pad={2}>{p}</Blur> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}

/* slim upsell banner under the hero */
export function PremiumBanner({ signedIn }: { signedIn: boolean }) {
  return (
    <Link href={signedIn ? "/go-pro" : "/pricing"} style={{ textDecoration: "none", display: "block", background: "linear-gradient(90deg, #11202f, #0d1722)", border: `1px solid ${T.green}33`, borderRadius: 13, marginBottom: 20 }}>
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: T.gold, background: T.gold + "1c", border: `1px solid ${T.gold}55`, borderRadius: 16, padding: "3px 9px" }}>
          <Icon name="crown" size={11} color={T.gold} /> FREE PREVIEW
        </span>
        <span style={{ fontSize: 13, color: T.muted, flex: 1, minWidth: 200 }}>
          You can generate freely — <span style={{ color: T.ink, fontWeight: 600 }}>Pro</span> reveals every holding and unlocks stress tests, correlation & the full rationale.
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: body, fontSize: 13, fontWeight: 700, color: T.green }}>
          See plans <Icon name="arrowRight" size={15} color={T.green} />
        </span>
      </div>
    </Link>
  );
}

/* a locked card: real content blurred behind a lock + upsell */
function LockedCard({ eyebrow, icon, title, blurb, bullets, previewHeight = 200, ctaHref, children }: {
  eyebrow: string; icon: string; title: string; blurb: string; bullets?: string[]; previewHeight?: number; ctaHref: string; children?: React.ReactNode;
}) {
  return (
    <Panel pad={0} style={{ overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icon name={icon} size={15} color={T.faint} />
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted }}>{eyebrow}</span>
          <span style={{ fontFamily: mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: T.gold, background: T.gold + "18", border: `1px solid ${T.gold}44`, borderRadius: 5, padding: "2px 6px" }}>PRO</span>
        </div>
      </div>
      <div style={{ position: "relative", marginTop: 14 }}>
        {children && (
          <div aria-hidden="true" style={{ filter: "blur(7px)", opacity: 0.45, pointerEvents: "none", maxHeight: previewHeight, overflow: "hidden", padding: "0 20px 20px", maskImage: "linear-gradient(180deg, #000 35%, transparent)", WebkitMaskImage: "linear-gradient(180deg, #000 35%, transparent)" }}>
            {children}
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 24px", background: "radial-gradient(120% 80% at 50% 50%, rgba(7,11,19,0.55), rgba(7,11,19,0.88))" }}>
          <span style={{ display: "flex", width: 46, height: 46, borderRadius: 13, background: T.green + "18", border: `1px solid ${T.green}44`, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Icon name="lock" size={20} color={T.green} />
          </span>
          <h3 style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color: T.ink, margin: "0 0 7px", maxWidth: 380 }}>{title}</h3>
          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 14px", maxWidth: 420, lineHeight: 1.55 }}>{blurb}</p>
          {bullets && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", justifyContent: "center", marginBottom: 18, maxWidth: 540 }}>
              {bullets.map((b) => (
                <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.muted }}><Icon name="check" size={13} color={T.green} /> {b}</span>
              ))}
            </div>
          )}
          <Link href={ctaHref} className="gen-btnPrimary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, background: T.green, color: T.bg, borderRadius: 11, padding: "11px 20px", fontFamily: body, fontSize: 13.5, fontWeight: 700 }}>
            <Icon name="crown" size={15} /> Unlock with Pro
          </Link>
        </div>
      </div>
    </Panel>
  );
}

/* compact holdings table — names blurred (the rating stays visible as a
   teaser), no controls */
const FREE_COLS = "1.9fr 64px 0.7fr 0.9fr";
function FreeHoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: FREE_COLS, gap: 8, padding: "11px 16px", background: T.panel2, borderBottom: `1px solid ${T.line2}`, fontFamily: mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>
        <span>Holding</span><span>Rating</span><span style={{ textAlign: "right" }}>Weight</span><span style={{ textAlign: "right" }}>Yield</span>
      </div>
      {holdings.map((h) => {
        const c = genTypeColor(h.type);
        return (
          <div key={h.tk} className="gen-row" style={{ display: "grid", gridTemplateColumns: FREE_COLS, gap: 8, padding: "12px 16px", alignItems: "center", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Blur pad={4}>{h.tk}</Blur>
                  {h.isAnchor && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: mono, fontSize: 8, color: T.green, border: `1px solid ${T.green}66`, borderRadius: 4, padding: "1px 4px" }}><Icon name="sparkles" size={8} color={T.green} /> ANCHOR</span>}
                  <span style={{ fontFamily: mono, fontSize: 8, color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "1px 4px" }}>{genTypeLabel(h.type)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Blur pad={3}>{h.name}</Blur> · {h.sector}</div>
              </div>
            </div>
            <div><GradePill grade={h.rate} /></div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{(h.w * 100).toFixed(1)}%</span>
              <div style={{ height: 4, borderRadius: 2, background: T.raised, overflow: "hidden", marginTop: 4 }}>
                <div className="gen-fill" style={{ height: "100%", background: c, borderRadius: 2, ["--fw" as any]: `${Math.min(100, (h.w / 0.42) * 100)}%` }} />
              </div>
            </div>
            <span style={{ textAlign: "right", fontFamily: mono, fontSize: 12.5, color: h.yield > 0 ? T.green : T.faint }}>{h.yield > 0 ? h.yield.toFixed(1) + "%" : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

/* free results: hooks shown, decision-grade tools locked */
export function FreeResultsView({ result, selected, onSelect, signedIn, realLoading = false }: {
  result: GenResult;
  selected: string;
  onSelect: (id: string) => void;
  signedIn: boolean;
  realLoading?: boolean;
}) {
  const variant = result.variants.find((v) => v.id === selected) || result.variants.find((v) => v.rec) || result.variants[0];
  const m = variant.metrics;
  const holdings = variant.holdings;
  const { risk, objective } = result.inputs;
  const sym = curSym(result.inputs.currency);
  const name = `${RISK_ALLOC[risk].label} ${OBJ_W[objective].label}`;
  const col = scoreColor(m.overall);
  const shown = holdings.slice(0, 5);
  const beat = m.projEnd.p50 - m.projEnd.sp;
  const ctaHref = signedIn ? "/go-pro" : "/pricing";

  return (
    <div className="gen-fade">
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.green, marginBottom: 9 }}>Your generated portfolio</div>
          <h2 style={{ fontFamily: display, fontSize: 28, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>{name}</h2>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>{variant.label} optimization · {holdings.length} holdings · sized to {fmtCur(result.inputs.amount, sym)}</div>
          <div style={{ marginTop: 10 }}><MeasuredBadge measured={!!m.measured} loading={realLoading} /></div>
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

      {/* thesis (free hook — tickers blurred) */}
      <ThesisCard text={<ThesisBlurred text={thesisOf(result, variant)} tickers={holdings.map((h) => h.tk)} />} />

      {/* frontier grid (free hook, interactive) */}
      <div style={{ marginBottom: 20 }}>
        <FrontierGrid variants={result.variants} selected={selected} onSelect={onSelect} />
      </div>

      {/* allocation: donut + top-5 holdings + locked full allocation */}
      <div className="gen-twoColWide" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 16, marginBottom: 20 }}>
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
            <Eyebrow icon="building" style={{ marginBottom: 0 }}>Top holdings</Eyebrow>
            <span style={{ fontFamily: mono, fontSize: 10.5, color: T.faint }}>showing top 5 of {holdings.length}</span>
          </div>
          <FreeHoldingsTable holdings={shown} />
          <Link href={ctaHref} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 10, background: T.panel2, border: `1px dashed ${T.green}55`, borderRadius: 11, padding: "13px", fontFamily: body, fontSize: 13, fontWeight: 600, color: T.green }}>
          <Icon name="lock" size={14} color={T.green} /> See all {holdings.length} holdings with exact weights & dollar amounts
          </Link>
        </div>
      </div>

      {/* eight stats (free hook) */}
      <div style={{ marginBottom: 20 }}>
        <Eyebrow icon="bars">The eight stats that matter</Eyebrow>
        <StatGrid stats={m.stats} />
      </div>

      {/* monte carlo (free hook) */}
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
        {m.projCapped && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.amber, textAlign: "center" }}>
            Forward paths use a capped 15%/yr expected return — the measured {m.er.toFixed(0)}%/yr came from a hot ~1.5y window and won&apos;t compound for {m.years} years.
          </div>
        )}
      </Panel>

      {/* REAL backtest (free hook) */}
      {m.curve && m.curve.length > 10 && <BacktestChart curve={m.curve} er={m.er} />}

      {/* sector exposure (free) */}
      <Panel pad={20} style={{ marginBottom: 20 }}>
        <Eyebrow icon="layers">Sector exposure</Eyebrow>
        <AllocBars data={m.sectorAlloc} />
      </Panel>

      {/* LOCKED: stress tests */}
      <div style={{ marginBottom: 20 }}>
        <LockedCard eyebrow="Historical stress tests" icon="alert" previewHeight={210} ctaHref={ctaHref}
          title="Stress-test against every modern crisis"
          blurb="See exactly how this portfolio would have held up in 2008, the 2020 COVID crash and the 2022 stocks-and-bonds bear — drawdown depth and recovery, versus the S&P."
          bullets={["Crisis-by-crisis drawdowns", "Worst-case vs benchmark", "Survival vs your risk ceiling"]}>
          <StressTests metrics={m} />
        </LockedCard>
      </div>

      {/* LOCKED: risk contribution + correlation */}
      <div className="gen-twoCol" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, alignItems: "start" }}>
        <LockedCard eyebrow="Risk contribution" icon="network" previewHeight={230} ctaHref={ctaHref}
          title="Find your hidden risk drivers"
          blurb="See which holdings carry more risk than their weight suggests — the positions that really move your portfolio."
          bullets={["Risk vs weight per holding", "Concentration flags"]}>
          <RiskContribution metrics={m} />
        </LockedCard>
        <LockedCard eyebrow="Correlation matrix" icon="grid" previewHeight={230} ctaHref={ctaHref}
          title="See what really diversifies"
          blurb="A full pairwise correlation heatmap plus your diversification ratio — the volatility you save by combining these holdings."
          bullets={["Pairwise correlations", "Diversification ratio"]}>
          <CorrelationMatrix corr={m.corr} divR={m.divR} />
        </LockedCard>
      </div>

      {/* legendary comparison (free hook) */}
      <div style={{ marginBottom: 20 }}><LegendaryComparison rows={legendaryComparison(m)} /></div>

      {/* LOCKED: rationale */}
      <div style={{ marginBottom: 22 }}>
        <LockedCard eyebrow="Holding rationale" icon="sparkles" previewHeight={240} ctaHref={ctaHref}
          title="See the full per-holding reasoning"
          blurb="Why each holding was chosen, the role it plays, and how the engine balanced risk versus return across the book."
          bullets={["Per-asset thesis", "Role of each holding", "Exact weights & dollars"]}>
          <Rationale holdings={holdings} />
        </LockedCard>
      </div>

      {/* action bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Link href={ctaHref} className="gen-btnPrimary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, background: T.green, color: T.bg, borderRadius: 11, padding: "14px 22px", fontFamily: body, fontSize: 14, fontWeight: 700 }}>
          <Icon name="crown" size={16} /> Get Pro — reveal every holding
        </Link>
        <span style={{ fontSize: 12, color: T.faint }}>Unlock every holding, stress tests, correlation & the full rationale.</span>
      </div>
    </div>
  );
}

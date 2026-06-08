/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { T, display, body, mono, Icon, Pill, pct, usd } from "./theme";
import { PORTFOLIOS, PRICING, buildCustomPortfolio, adaptHealthResult } from "./data";
import { HoldingSearch, PortfolioTabs, Hero, SectionIntro, Pricing, UpgradeBar, SignupModal } from "./ui";
import {
  Overview, RiskSection, ConsistencySection, FrontierSection, OptimizeSection,
  CorrSection, ConcentrationSection, CompareSection, HoldingsSection, EtfSection, AiSection,
} from "./sections";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "gauge", kicker: "Investor Grade", title: "One score for your whole portfolio", body: "We blend risk-adjusted return, quality, cost, diversification and concentration into a single 0–100 grade — so you know in five seconds whether your portfolio is healthy.", premium: false },
  { id: "risk", label: "Risk", icon: "shield", kicker: "Risk X-ray", title: "See exactly where your risk comes from", body: "Volatility, beta, drawdown and Value-at-Risk — plus a contribution-to-risk breakdown that reveals which holdings carry more danger than their weight suggests.", premium: false },
  { id: "consistency", label: "Consistency", icon: "calendar", kicker: "New", title: "How reliably does it actually go up?", body: "Most tools only show total return. We grade the journey: your share of positive months, longest winning streak, and the probability that any rolling 12-month window finished in the green.", premium: false },
  { id: "frontier", label: "Risk / Return", icon: "target", kicker: "New · Premium", title: "Are you being paid for the risk you take?", body: "We plot your portfolio against the efficient frontier — the best possible return for every level of risk — and show whether you could earn more for the same risk, or hold the same return for less.", premium: true },
  { id: "optimize", label: "Optimize", icon: "zap", kicker: "New · Premium", title: "An illustrative, more efficient mix", body: "How the weights would shift to move your book toward the best risk-adjusted (max-Sharpe) point on the frontier. Shown to illustrate trade-offs — it's not investment advice.", premium: true },
  { id: "corr", label: "Correlation", icon: "network", kicker: "Hidden risk", title: "Your 13 holdings might be 6 real bets", body: "A correlation matrix surfaces clusters of holdings that move as one. Effective diversification is almost always lower than your position count — we quantify it.", premium: false },
  { id: "conc", label: "Concentration", icon: "pie", kicker: "Look-through", title: "We unwrap your ETFs", body: "Your funds hide your true exposure. We decompose every ETF into its underlying sectors and names so you can see real concentration and your active bets versus the S&P 500.", premium: false },
  { id: "compare", label: "vs S&P 500", icon: "line", kicker: "New · Premium", title: "Would an index fund have beaten you?", body: "The honest benchmark every portfolio deserves. Growth of $10k, CAGR, drawdown, Sharpe and up/down capture — head-to-head against the S&P 500.", premium: true },
  { id: "etf", label: "ETF Overlap", icon: "layers", kicker: "Crowding", title: "Passive ownership & overlap risk", body: "How much of each name is held by ETFs (crowding & flow risk), and how your direct positions stack on top of your fund exposure once everything is unwrapped.", premium: false },
  { id: "ai", label: "AI Insights", icon: "sparkles", kicker: "Premium", title: "An analyst that reads your data", body: "Plain-English diagnosis, prioritized actions, and a chat analyst that reasons over your actual holdings — ask it anything about your portfolio.", premium: true },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.hc-root *{box-sizing:border-box}
.hc-root ::-webkit-scrollbar{width:10px;height:10px}
.hc-root ::-webkit-scrollbar-track{background:#070b13}
.hc-root ::-webkit-scrollbar-thumb{background:#2a3a50;border-radius:5px}
.hc-secnav::-webkit-scrollbar{height:0}
.hc-row:hover{background:#141d2b}
.hc-chip:hover{border-color:#2fe3a0 !important;color:#eef2f7 !important}
.hc-sampleChip:hover,.hc-pfTab:hover{border-color:#2a3a50 !important}
.hc-secpill:hover{color:#eef2f7}
.hc-btnPrimary:hover{filter:brightness(1.07)}
.hc-root input::placeholder{color:#5d6b80}
.hc-fade{opacity:1}
.hc-fill{width:var(--fw)}
.hc-gaugeArc{stroke-dasharray:1000;stroke-dashoffset:0}
@media (prefers-reduced-motion: no-preference){
  .hc-fade{animation:hc-fade .45s ease both}
  .hc-fill{animation:hc-grow 1s cubic-bezier(.2,.7,.2,1) both}
  .hc-gaugeArc{animation:hc-dash 1.2s cubic-bezier(.2,.7,.2,1) both}
}
@keyframes hc-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes hc-grow{from{width:0}to{width:var(--fw)}}
@keyframes hc-dash{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
@keyframes hc-spin{to{transform:rotate(360deg)}}
@media (max-width:920px){
  .hc-grid2,.hc-grid4,.hc-grid5,.hc-pricing-grid{grid-template-columns:1fr !important}
}
`;

export function PortfolioHealthcheckApp() {
  // Starter selection (objects with metadata, like the search returns).
  const STARTER = [
    { symbol: "AAPL", name: "Apple Inc.", type: "stock", sector: "Technology" },
    { symbol: "MSFT", name: "Microsoft", type: "stock", sector: "Technology" },
    { symbol: "SCHD", name: "Schwab US Dividend Equity ETF", type: "etf", sector: "Diversified" },
    { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", sector: "Health Care" },
    { symbol: "KO", name: "Coca-Cola", type: "stock", sector: "Cons. Staples" },
  ];
  const [selected, setSelected] = React.useState<any[]>(STARTER);
  const [activePf, setActivePf] = React.useState("income");
  const [section, setSection] = React.useState("overview");
  const [modal, setModal] = React.useState<any>({ open: false, reason: "", plan: null });
  const [barOff, setBarOff] = React.useState(false);
  const [customPf, setCustomPf] = React.useState<any>(null);
  const [customName, setCustomName] = React.useState("My portfolio");
  const [isPremium, setIsPremium] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [savedList, setSavedList] = React.useState<any[]>([]);
  const [savedActiveId, setSavedActiveId] = React.useState<string | null>(null);

  const fetchSaved = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("healthcheck_portfolios").select("id,name,picks").order("updated_at", { ascending: false });
      setSavedList(data ?? []);
    } catch { /* not logged in / RLS — no saved list */ }
  }, []);

  // Detect a logged-in premium user → hide the freemium chrome and load their
  // saved portfolios.
  React.useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase
          .from("user_profiles").select("subscription_tier").eq("id", session.user.id).maybeSingle<{ subscription_tier: string | null }>();
        if (profile && (profile.subscription_tier === "plus" || profile.subscription_tier === "gold")) setIsPremium(true);
        fetchSaved();
      } catch { /* best effort — fall back to free chrome */ }
    })();
  }, [fetchSaved]);

  // Premium users only view their own portfolio; free/demo users view samples.
  const p = isPremium
    ? (customPf || PORTFOLIOS[0])
    : (activePf === "custom" && customPf ? customPf : (PORTFOLIOS.find((x: any) => x.id === activePf) || PORTFOLIOS[0]));
  const premiumEmpty = isPremium && !customPf;
  const up = p.dayChg >= 0;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
  };
  // Building your own portfolio is a Pro feature — free users get an upgrade prompt.
  const onLocked = () => setModal({ open: true, plan: PRICING.find((x: any) => x.id === "premium"), reason: "Building and analyzing your own portfolio is a Pro feature. Get Pro to add holdings, save portfolios and run every section on your real holdings." });
  // Analyze the user's own selection → build a portfolio object and show it.
  // Run the engine on a set of picks and show the result (live, estimated fallback).
  const runAnalysis = async (picks: any[], nm: string, savedId: string | null) => {
    if (!isPremium) { onLocked(); return; }
    if (picks.length < 2) return;
    setAnalyzing(true);
    let pf: any = null;
    try {
      const res = await fetch("/api/portfolio/healthcheck", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: picks.map((s: any) => s.symbol) }),
      });
      const result = await res.json();
      if (res.ok && result?.ok) pf = adaptHealthResult(result, picks, 100000, nm);
    } catch { /* fall through to estimated */ }
    if (!pf) pf = buildCustomPortfolio(picks, 100000, nm); // estimated fallback
    setAnalyzing(false);
    if (!pf) return;
    setCustomPf(pf);
    setSavedActiveId(savedId);
    setActivePf("custom");
    setSection("overview");
    setTimeout(() => scrollTo("hc-tool"), 60);
  };
  // Re-analyzing keeps the active portfolio (saved or draft) — adding a holding
  // updates THIS book rather than spawning a new one. "New portfolio" resets it.
  const analyzeCustom = () => runAnalysis(selected, customPf?.name || customName || "My portfolio", savedActiveId);
  const loadSaved = (item: any) => { setSelected(item.picks ?? []); setCustomName(item.name); runAnalysis(item.picks ?? [], item.name, item.id); };

  // New portfolio → start a fresh build at the search box (Pro only).
  const newPortfolio = () => { if (!isPremium) { onLocked(); return; } setSelected([]); setCustomPf(null); setSavedActiveId(null); scrollTo("hc-builder"); };
  const editHoldings = () => { setSelected(customPf?.picks ?? []); scrollTo("hc-builder"); };
  // Remove a holding directly from the analysis → re-score the smaller book.
  const removeHolding = (tk: string) => {
    if (!customPf?.picks) return;
    const newPicks = customPf.picks.filter((s: any) => s.symbol !== tk);
    if (newPicks.length < 2) return;
    setSelected(newPicks);
    runAnalysis(newPicks, customPf.name, savedActiveId);
  };
  const renamePf = (name: string) => { setCustomName(name); setCustomPf((prev: any) => (prev ? { ...prev, name } : prev)); };

  // Persistence (Supabase, RLS-protected to the logged-in user).
  const saveCurrent = async () => {
    if (!customPf?.picks) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { onLocked(); return; }
      if (savedActiveId) {
        await supabase.from("healthcheck_portfolios").update({ name: customPf.name, picks: customPf.picks, updated_at: new Date().toISOString() }).eq("id", savedActiveId);
      } else {
        const { data } = await supabase.from("healthcheck_portfolios").insert({ user_id: session.user.id, name: customPf.name, picks: customPf.picks }).select("id").single();
        if (data?.id) setSavedActiveId(data.id);
      }
      await fetchSaved();
    } catch { /* best effort */ }
  };
  const deletePf = async () => {
    try {
      if (savedActiveId) {
        const supabase = createClient();
        await supabase.from("healthcheck_portfolios").delete().eq("id", savedActiveId);
        await fetchSaved();
      }
    } catch { /* best effort */ }
    setCustomPf(null); setSavedActiveId(null); setActivePf("income"); setSection("overview");
  };
  // Real AI analyst — calls the portfolio-analyst edge function (OpenAI).
  const askAnalyst = async (question: string, portfolio: any): Promise<string> => {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("portfolio-analyst", { body: { question, portfolio } });
    if (error) throw new Error(error.message || "request failed");
    if (data?.error) throw new Error(data.error);
    return data?.answer || "No response — try rephrasing.";
  };
  const goPricing = () => scrollTo("hc-pricing");
  const pickPlan = (t: any) => t.id === "free" ? scrollTo("hc-tool") : setModal({ open: true, plan: t, reason: `Unlock the full healthcheck on your own holdings with ${t.name}.` });

  const cur = SECTIONS.find((s) => s.id === section)!;

  const renderSection = () => {
    switch (section) {
      case "overview": return <Overview p={p} onRemove={p.isCustom ? removeHolding : undefined} />;
      case "risk": return <RiskSection p={p} />;
      case "consistency": return <ConsistencySection p={p} />;
      case "frontier": return <FrontierSection p={p} onOptimize={() => setSection("optimize")} />;
      case "optimize": return <OptimizeSection p={p} />;
      case "corr": return <CorrSection p={p} />;
      case "conc": return <ConcentrationSection p={p} />;
      case "compare": return <CompareSection p={p} />;
      case "holdings": return <HoldingsSection p={p} />;
      case "etf": return <EtfSection p={p} />;
      case "ai": return <AiSection p={p} onUpgrade={goPricing} onAsk={askAnalyst} unlimited={isPremium} />;
      default: return null;
    }
  };

  return (
    <div className="hc-root" style={{ background: `radial-gradient(120% 80% at 50% -10%, #0e1830 0%, rgba(14,24,48,0) 55%), ${T.bg}`, minHeight: "100vh", color: T.ink, fontFamily: body }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ maxWidth: 1340, margin: "0 auto", padding: "26px 26px 40px" }}>
        <div id="hc-builder" style={{ scrollMarginTop: 64 }}>
          <Hero>
            <div style={{ marginTop: 26, background: "rgba(7,11,19,0.55)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 20, backdropFilter: "blur(6px)" }}>
              <HoldingSearch selected={selected} setSelected={setSelected} onAnalyze={analyzeCustom} isPremium={isPremium} onLocked={onLocked} loading={analyzing} ctaLabel={customPf ? "Update portfolio" : "Create & analyze portfolio"} addLabel={customPf ? "Add stock / ETF" : "Add holdings"} />
            </div>
          </Hero>
        </div>

        <div id="hc-tool" style={{ marginTop: 30, scrollMarginTop: 64 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.faint, marginBottom: 8 }}>{isPremium ? "Your portfolios" : "Live demo · sample portfolios"}</div>
              {isPremium ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {savedList.map((it) => {
                    const on = savedActiveId === it.id;
                    return (
                      <button key={it.id} onClick={() => loadSaved(it)} className="hc-pfTab" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: on ? T.panel : "transparent", border: `1px solid ${on ? T.line2 : "transparent"}`, borderRadius: 11, padding: "9px 14px", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ display: "flex", width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", background: on ? T.green + "22" : T.raised, flexShrink: 0 }}><Icon name="building" size={15} color={on ? T.green : T.muted} /></span>
                        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                          <span style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: on ? T.ink : T.muted }}>{it.name}</span>
                          <span style={{ fontSize: 11, color: T.faint }}>{(it.picks?.length ?? 0)} holdings · saved</span>
                        </span>
                      </button>
                    );
                  })}
                  {customPf && !savedActiveId && (
                    <button onClick={() => { setActivePf("custom"); setSection("overview"); }} className="hc-pfTab" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: activePf === "custom" ? T.panel : "transparent", border: `1px solid ${activePf === "custom" ? T.green : T.line2}`, borderRadius: 11, padding: "9px 14px", cursor: "pointer", textAlign: "left" }}>
                      <span style={{ display: "flex", width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", background: T.green + "22", flexShrink: 0 }}><Icon name="building" size={15} color={T.green} /></span>
                      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: display, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{customPf.name}<span style={{ fontFamily: mono, fontSize: 8.5, color: T.amber, border: `1px solid ${T.amber}55`, borderRadius: 4, padding: "1px 4px" }}>UNSAVED</span></span>
                        <span style={{ fontSize: 11, color: T.faint }}>{(customPf.picks?.length ?? 0)} holdings</span>
                      </span>
                    </button>
                  )}
                  <button onClick={newPortfolio} className="hc-pfTab" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: `1px dashed ${T.line2}`, borderRadius: 11, padding: "9px 15px", cursor: "pointer", color: T.muted, fontFamily: body, fontSize: 13, fontWeight: 600 }}>
                    <Icon name="plus" size={15} /> New portfolio
                  </button>
                </div>
              ) : (
                <PortfolioTabs active={activePf} setActive={(id: string) => { setActivePf(id); setSection("overview"); }} onNew={newPortfolio} custom={customPf} isPremium={isPremium} />
              )}
            </div>
            {!premiumEmpty && (
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                {p.dayChgUsd !== 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Today</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: display, fontSize: 17, fontWeight: 700, color: up ? T.green : T.red }}>
                      <Icon name={up ? "upRight" : "downRight"} size={15} />{pct(p.dayChg)} · {usd(p.dayChgUsd)}
                    </div>
                  </div>
                )}
                <Pill color={T.green}>{p.holdings.length} HOLDINGS</Pill>
              </div>
            )}
          </div>

          {activePf === "custom" && customPf && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16, padding: "12px 14px", background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 12 }}>
              <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>Name</span>
              <input value={customPf.name} onChange={(e) => renamePf(e.target.value)} aria-label="Portfolio name"
                style={{ flex: "1 1 200px", minWidth: 160, background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 9, padding: "8px 11px", color: T.ink, fontFamily: display, fontSize: 14, fontWeight: 700, outline: "none" }} />
              <button onClick={saveCurrent} className="hc-btnPrimary" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.green, color: T.bg, border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: 700 }}>
                <Icon name="check" size={14} color={T.bg} /> {savedActiveId ? "Saved ✓ · Update" : "Save portfolio"}
              </button>
              <button onClick={editHoldings} className="hc-pfTab" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.panel2, color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 10, padding: "8px 13px", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: 600 }}>
                <Icon name="plus" size={14} color={T.green} /> Edit holdings
              </button>
              <button onClick={deletePf} className="hc-pfTab" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", color: T.red, border: `1px solid ${T.red}55`, borderRadius: 10, padding: "8px 13px", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: 600 }}>
                <Icon name="x" size={14} color={T.red} /> Delete portfolio
              </button>
            </div>
          )}

          {premiumEmpty ? (
            <div className="panel" style={{ textAlign: "center", padding: "44px 22px" }}>
              <Icon name="building" size={28} color={T.green} />
              <h3 style={{ fontFamily: display, fontSize: 20, fontWeight: 800, color: T.ink, margin: "12px 0 6px" }}>{savedList.length ? "Open a portfolio" : "Build your first portfolio"}</h3>
              <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 18px" }}>{savedList.length ? "Select a saved portfolio above, or build a new one." : "Add your holdings above and run a live healthcheck on your own book."}</p>
              <button onClick={() => scrollTo("hc-builder")} className="hc-btnPrimary" style={{ background: T.green, color: T.bg, border: "none", borderRadius: 11, padding: "11px 20px", fontFamily: body, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Go to the builder</button>
            </div>
          ) : (<>
          <div className="hc-secnav" style={{ position: "sticky", top: 56, zIndex: 30, display: "flex", gap: 6, overflowX: "auto", padding: "10px 0", background: T.bg, borderBottom: `1px solid ${T.line}`, marginBottom: 22 }}>
            {SECTIONS.map((s) => {
              const on = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} className="hc-secpill" style={{
                  display: "inline-flex", alignItems: "center", gap: 7, background: on ? T.green : "transparent", color: on ? T.bg : T.muted,
                  border: `1px solid ${on ? T.green : T.line}`, borderRadius: 10, padding: "8px 13px", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: on ? 700 : 500, whiteSpace: "nowrap",
                }}>
                  <Icon name={s.icon} size={14} />{s.label}
                  {s.premium && !on && <Icon name="crown" size={11} color={T.gold} />}
                </button>
              );
            })}
          </div>

          <SectionIntro kicker={cur.kicker} title={cur.title} body={cur.body} premium={isPremium ? false : cur.premium} />
          {p.estimated && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "11px 14px", background: T.amber + "12", border: `1px solid ${T.amber}33`, borderRadius: 11 }}>
              <Icon name="alert" size={16} color={T.amber} />
              <span style={{ fontSize: 12.5, color: T.muted }}><b style={{ color: T.amber }}>Estimated analysis.</b> We couldn't pull live data for this set, so figures are modelled from sector &amp; type and assume a $100,000 equally-weighted book.</span>
            </div>
          )}
          {p.live && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "11px 14px", background: T.green + "12", border: `1px solid ${T.green}33`, borderRadius: 11 }}>
              <Icon name="check" size={16} color={T.green} />
              <span style={{ fontSize: 12.5, color: T.muted }}><b style={{ color: T.green }}>Live analysis</b> — your ratings, risk, correlation, factors and S&amp;P benchmark are computed from the last year of market prices, equally weighted. Consistency and ETF look-through are indicative.</span>
            </div>
          )}
          <div className="hc-fade" key={section + activePf}>{renderSection()}</div>
          </>)}
        </div>

        {!isPremium && (
          <div style={{ marginTop: 56, paddingTop: 44, borderTop: `1px solid ${T.line}` }}>
            <Pricing onPick={pickPlan} />
          </div>
        )}
      </div>

      {!isPremium && !barOff && <UpgradeBar onUpgrade={goPricing} onDismiss={() => setBarOff(true)} />}
      <SignupModal open={modal.open} reason={modal.reason} plan={modal.plan} onClose={() => setModal({ open: false, reason: "", plan: null })} />
    </div>
  );
}

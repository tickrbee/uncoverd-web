/* eslint-disable react/no-unescaped-entities */
"use client";

// Portfolio Generator — app shell. Loads the real instrument universe, detects
// the user's tier, and renders the form + (free | premium) results.

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { T, display, body, mono, Icon, Panel } from "@/components/healthcheck/theme";
import { generatePortfolio } from "./engine";
import type { GenInstrument, GenOptions } from "./types";
import { GenForm } from "./form";
import { ResultsView } from "./results";
import { FreeResultsView, PremiumBanner } from "./free";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.gen-root *{box-sizing:border-box}
.gen-root input::placeholder,.gen-root textarea::placeholder{color:#5d6b80}
.gen-chip:hover{filter:brightness(1.12)}
.gen-segBtn:hover,.gen-quickAmt:hover,.gen-rowBtn:hover{border-color:#2fe3a0 !important}
.gen-rowBtn:hover{color:#eef2f7 !important}
.gen-row:hover{background:#111a27}
.gen-btnPrimary:hover{filter:brightness(1.07)}
.gen-input{transition:border-color .15s, box-shadow .15s}
.gen-input:focus-within,textarea.gen-input:focus{border-color:#2fe3a0 !important;box-shadow:0 0 0 3px rgba(47,227,160,.13)}
.gen-formWrap,.gen-formWrap *{min-width:0}
.gen-generate{box-shadow:0 12px 30px -12px rgba(47,227,160,.55)}
.gen-fade{opacity:1}
.gen-fill{width:var(--fw)}
@media (prefers-reduced-motion: no-preference){
  .gen-fade{animation:gen-fade .45s ease both}
  .gen-fill{animation:gen-grow 1s cubic-bezier(.2,.7,.2,1) both}
}
@keyframes gen-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes gen-grow{from{width:0}to{width:var(--fw)}}
@keyframes gen-spin{to{transform:rotate(360deg)}}
.gen-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:4px;
  background:linear-gradient(90deg,#2fe3a0 0%,#2fe3a0 var(--p,33%),#1a2433 var(--p,33%),#1a2433 100%);outline:none}
.gen-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;
  background:#2fe3a0;border:3px solid #070b13;box-shadow:0 0 0 1px #2fe3a0,0 2px 8px rgba(0,0,0,.5);cursor:pointer}
.gen-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#2fe3a0;border:3px solid #070b13;cursor:pointer}
@media (max-width:1000px){
  .gen-grid{grid-template-columns:1fr !important}
  .gen-formWrap{position:static !important}
  .gen-statGrid{grid-template-columns:1fr 1fr !important}
  .gen-twoCol,.gen-twoColWide{grid-template-columns:1fr !important}
}
@media (max-width:620px){
  .gen-frontierGrid,.gen-statGrid{grid-template-columns:1fr !important}
  .gen-stressRow{grid-template-columns:1fr 1fr !important}
}
`;

const DEFAULT_STATE: GenOptions = {
  amount: 10000, currency: "USD", risk: "balanced", objective: "balanced", horizon: "medium",
  sectors: [], anchors: [], count: 10, goal: "", target: 0, monthlyDCA: 0,
};

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", height: "100%", minHeight: 460, padding: 30 }}>
      <span style={{ display: "flex", width: 62, height: 62, borderRadius: 17, background: T.green + "16", border: `1px solid ${T.green}44`, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Icon name="sparkles" size={28} color={T.green} />
      </span>
      <h3 style={{ fontFamily: display, fontSize: 21, fontWeight: 800, color: T.ink, margin: "0 0 10px", maxWidth: 340 }}>Set your preferences, then generate</h3>
      <p style={{ fontSize: 14, color: T.muted, margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
        We'll build a diversified, top-rated portfolio — optimised for the best risk-adjusted return, sized to your amount, and built around any holdings you pin.
      </p>
      <div style={{ display: "flex", gap: 18, marginTop: 26, flexWrap: "wrap", justifyContent: "center" }}>
        {([["bars", "Rated holdings"], ["pie", "Smart weighting"], ["line", "Monte Carlo projection"]] as const).map(([ic, tx]) => (
          <div key={tx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.faint }}>
            <Icon name={ic} size={15} color={T.green} /> {tx}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioGeneratorApp() {
  const [universe, setUniverse] = React.useState<GenInstrument[] | null>(null);
  // Instruments resolved on demand when the user pins a ticker outside the
  // curated universe (e.g. QQQI) — merged into the pool for this session.
  const [extras, setExtras] = React.useState<GenInstrument[]>([]);
  const [loadErr, setLoadErr] = React.useState(false);
  const [state, setState] = React.useState<GenOptions>(DEFAULT_STATE);
  const [generated, setGenerated] = React.useState(false);
  const [selected, setSelected] = React.useState("maxSharpe");
  const [exclude, setExclude] = React.useState<string[]>([]);
  const [dirty, setDirty] = React.useState(true);
  const [isPremium, setIsPremium] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Real instrument universe (top-rated stocks + ETF/bond sleeve).
  React.useEffect(() => {
    let alive = true;
    fetch("/api/portfolio/universe")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) setUniverse(d.universe); })
      .catch(() => { if (alive) setLoadErr(true); });
    return () => { alive = false; };
  }, []);

  // Detect Pro so holdings are revealed for paying users, blurred otherwise.
  React.useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setSignedIn(true);
        const { data: profile } = await supabase.from("user_profiles").select("subscription_tier").eq("id", session.user.id).maybeSingle<{ subscription_tier: string | null }>();
        if (profile && (profile.subscription_tier === "plus" || profile.subscription_tier === "gold")) setIsPremium(true);
      } catch { /* free chrome */ }
    })();
  }, []);

  const set = (patch: Partial<GenOptions>) => { setState((s) => ({ ...s, ...patch })); setDirty(true); };
  const onExtra = (inst: GenInstrument) => setExtras((xs) => (xs.some((x) => x.tk === inst.tk) ? xs : [...xs, inst]));

  const pool = React.useMemo(
    () => (universe ? (extras.length ? [...universe, ...extras] : universe) : null),
    [universe, extras]
  );

  // Always compute live — powers the goal-feasibility card and instant re-rolls.
  const result = React.useMemo(
    () => (pool ? generatePortfolio(pool, { ...state, exclude }) : null),
    [pool, state, exclude]
  );

  const generate = () => {
    setExclude([]);
    setSelected("maxSharpe");
    setGenerated(true);
    setDirty(false);
    setTimeout(() => {
      if (resultsRef.current && window.innerWidth < 1000) resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const onPin = (tk: string) => { if (!state.anchors.includes(tk)) set({ anchors: [...state.anchors, tk] }); };
  const onRemove = (tk: string) => setExclude((e) => (e.includes(tk) ? e : [...e, tk]));

  return (
    <div className="gen-root" style={{ background: T.bg, minHeight: "100vh", color: T.ink, fontFamily: body }}>
      <style>{CSS}</style>

      {/* hero */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 8px", textAlign: "center" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: T.green, marginBottom: 14 }}>Tools{isPremium ? "" : " · Free"}</div>
        <h1 style={{ fontFamily: display, fontSize: 40, fontWeight: 800, color: T.ink, margin: "0 0 14px", letterSpacing: "-0.03em" }}>Portfolio generator</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "0 auto", maxWidth: 620, lineHeight: 1.6 }}>
          Answer a few questions — or pin the stocks and ETFs you already love — and we'll build a diversified, top-rated portfolio sized to your amount.
        </p>
      </div>

      {/* split layout */}
      <div className="gen-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "26px 24px 60px", display: "grid", gridTemplateColumns: "minmax(360px, 440px) 1fr", gap: 24, alignItems: "start" }}>
        {/* form */}
        <div className="gen-formWrap" style={{ position: "sticky", top: 72 }}>
          <Panel pad={26}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
              <span style={{ display: "flex", width: 30, height: 30, borderRadius: 9, background: T.green + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="zap" size={16} color={T.green} /></span>
              <span style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: T.ink, whiteSpace: "nowrap" }}>Build your portfolio</span>
            </div>
            {pool ? (
              <GenForm universe={pool} state={state} set={set} onGenerate={generate} onExtra={onExtra} dirty={dirty}
                feasibility={state.target > 0 && result ? result.feasibility : null} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.muted, fontSize: 13.5, padding: "30px 0" }}>
                {loadErr
                  ? <>Could not load the instrument universe. Refresh to try again.</>
                  : <><span style={{ display: "inline-flex", animation: "gen-spin 1s linear infinite" }}><Icon name="loader" size={16} color={T.green} /></span> Loading the rated universe…</>}
              </div>
            )}
          </Panel>
        </div>

        {/* results */}
        <div ref={resultsRef} style={{ minWidth: 0 }}>
          {!isPremium && <PremiumBanner signedIn={signedIn} />}
          {generated && result ? (
            isPremium
              ? <ResultsView result={result} selected={selected} onSelect={setSelected} onPin={onPin} onRemove={onRemove} />
              : <FreeResultsView result={result} selected={selected} onSelect={setSelected} signedIn={signedIn} />
          ) : (
            <Panel pad={0} style={{ overflow: "hidden" }}><EmptyState /></Panel>
          )}
        </div>
      </div>
    </div>
  );
}

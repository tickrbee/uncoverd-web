/* eslint-disable react/no-unescaped-entities */
"use client";

// Portfolio Generator — app shell. Loads the real instrument universe, detects
// the user's tier, and renders the form + (free | premium) results.

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { T, display, body, mono, Icon, Panel } from "@/components/healthcheck/theme";
import { generatePortfolio, applyReal } from "./engine";
import type { GenInstrument, GenOptions, ParsedGoal } from "./types";
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
  amount: 10000, currency: "USD", country: "GLOBAL", seed: 0, risk: "balanced", objective: "balanced", horizon: "medium",
  sectors: [], anchors: [], count: 10, goal: "", target: 0, monthlyDCA: 0, parsed: null,
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

  // Real instrument universe (top-rated stocks + ETF/bond sleeve), per market.
  const uniCache = React.useRef<Map<string, GenInstrument[]>>(new Map());
  React.useEffect(() => {
    const cc = state.country || "US";
    const hit = uniCache.current.get(cc);
    if (hit) { setUniverse(hit); return; }
    let alive = true;
    fetch(`/api/portfolio/universe?country=${encodeURIComponent(cc)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        uniCache.current.set(cc, d.universe);
        setUniverse(d.universe);
        setLoadErr(false);
      })
      .catch(() => { if (alive && !universe) setLoadErr(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.country]);

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

  // Generate is ALWAYS clickable — if the universe is still loading, the
  // click queues and fires the moment data lands (no dead button).
  const [pendingGen, setPendingGen] = React.useState(false);
  const generate = React.useCallback(() => {
    if (!pool) { setPendingGen(true); return; }
    // Regenerate with unchanged inputs = "show me another build": bump the
    // seed so the engine's deterministic jitter produces a fresh mix.
    if (!dirty && generated) setState((s) => ({ ...s, seed: s.seed + 1 }));
    setExclude([]);
    setSelected("maxSharpe");
    setGenerated(true);
    setDirty(false);
    setTimeout(() => {
      if (resultsRef.current && window.innerWidth < 1000) resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [pool, dirty, generated]);
  // Queued click fires as soon as the universe lands — intentional state set.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (pool && pendingGen) { setPendingGen(false); generate(); }
  }, [pool, pendingGen, generate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onPin = (tk: string) => { if (!state.anchors.includes(tk)) set({ anchors: [...state.anchors, tk] }); };
  const onRemove = (tk: string) => setExclude((e) => (e.includes(tk) ? e : [...e, tk]));

  // ---- LLM goal parser: turn the free-text goal into machine-enforced
  // constraints (exclusions, geographies, sector avoid/boost, yield floor).
  // The build regenerates automatically when the parse lands.
  const parsedCache = React.useRef<Map<string, ParsedGoal | null>>(new Map());
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    const goal = state.goal.trim();
    if (!generated || goal.length < 12) return;
    if (parsedCache.current.has(goal)) {
      const hit = parsedCache.current.get(goal) ?? null;
      if (hit && state.parsed !== hit) setState((s) => (s.goal.trim() === goal ? { ...s, parsed: hit } : s));
      return;
    }
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.functions.invoke("goal-parser", { body: { goal } });
        const parsed = (data?.parsed ?? null) as ParsedGoal | null;
        parsedCache.current.set(goal, parsed);
        if (alive && parsed) setState((s) => (s.goal.trim() === goal ? { ...s, parsed } : s));
      } catch {
        parsedCache.current.set(goal, null);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, state.goal]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ---- v4 COMPOSE: the engine picks the candidates; the server runs
  // Black–Litterman (equilibrium prior from USD caps + rating views) over the
  // real covariance and returns OPTIMIZED weights per scheme. Cached per
  // candidate set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [composeBy, setComposeBy] = React.useState<Record<string, any>>({});
  const composeKey = result
    ? result.variants[0].holdings.filter((h) => h.cls !== "cash").map((h) => h.tk).sort().join(",")
    : "";
  React.useEffect(() => {
    if (!generated || !result || !composeKey || composeBy[composeKey]) return;
    const symbols = composeKey.split(",").filter(Boolean);
    if (symbols.length < 4) return;
    let alive = true;
    fetch("/api/portfolio/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols, horizonYears: result.inputs.years }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.ok) setComposeBy((prev) => ({ ...prev, [composeKey]: d })); })
      .catch(() => { /* heuristic weights stay */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, composeKey]);

  // Apply the optimizer's weights to the matching variants (the others keep
  // the engine heuristics, clearly unlabeled as optimized).
  const composedResult = React.useMemo(() => {
    if (!result) return null;
    const cp = composeBy[composeKey];
    if (!cp?.weights) return result;
    return {
      ...result,
      variants: result.variants.map((v) => {
        const wMap = cp.weights[v.id] as Record<string, number> | undefined;
        if (!wMap) return v;
        const cashW = v.holdings.find((h) => h.cls === "cash")?.w ?? 0;
        const droppedW = v.holdings.filter((h) => h.cls !== "cash" && wMap[h.tk] == null).reduce((a, h) => a + h.w, 0);
        const scale = Math.max(0, 1 - cashW - droppedW);
        const holdings = v.holdings
          .map((h) => (h.cls === "cash" || wMap[h.tk] == null ? h : { ...h, w: wMap[h.tk] * scale }))
          .filter((h) => h.cls === "cash" || h.w > 0.004)
          .sort((a, b) => (a.cls === "cash" ? 1 : b.cls === "cash" ? -1 : b.w - a.w));
        return { ...v, holdings, optimized: true, costBps: cp.implementationBps?.[v.id] };
      }),
    };
  }, [result, composeBy, composeKey]);

  // ---- REAL metrics: measure the selected variant against actual price
  // history via the weighted healthcheck API, then overlay the modelled
  // estimates. Cached per (variant + holdings) so switching back is instant.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [realBy, setRealBy] = React.useState<Record<string, any>>({});
  const [realLoading, setRealLoading] = React.useState(false);
  const curVariant = composedResult?.variants.find((v) => v.id === selected) ?? composedResult?.variants[0];
  const realKey = curVariant
    ? curVariant.id + ":" + curVariant.holdings.filter((h) => h.cls !== "cash").map((h) => h.tk + Math.round(h.w * 1000)).join(",")
    : "";
  React.useEffect(() => {
    if (!generated || !curVariant || !realKey || realBy[realKey]) return;
    const holdings = curVariant.holdings
      .filter((h) => h.cls !== "cash")
      .map((h) => ({ symbol: h.tk, weight: +(h.w * 100).toFixed(2) }));
    if (holdings.length < 2) return;
    let alive = true;
    // Loading flag + fetch are one async "measure" operation; the sync set is
    // intentional so the badge flips immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRealLoading(true);
    fetch("/api/portfolio/healthcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ~10y window: enables real crisis replays + same-window legendary stats.
      body: JSON.stringify({ holdings, days: 3650 }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.ok) setRealBy((prev) => ({ ...prev, [realKey]: d })); })
      .catch(() => { /* modelled stays */ })
      .finally(() => { if (alive) setRealLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, realKey]);

  // The result the views render: selected variant's metrics get the real
  // overlay once measured (on top of the optimized weights when composed).
  const displayResult = React.useMemo(() => {
    if (!composedResult) return null;
    const real = realBy[realKey];
    if (!real) return composedResult;
    const ctx = { years: composedResult.inputs.years, amount: composedResult.inputs.amount, monthlyDCA: composedResult.inputs.monthlyDCA };
    return {
      ...composedResult,
      variants: composedResult.variants.map((v) => (v.id === (curVariant?.id ?? selected) ? { ...v, metrics: applyReal(v.metrics, real, ctx) } : v)),
    };
  }, [composedResult, realBy, realKey, curVariant?.id, selected]);

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
        <a href="/tools/portfolio-generator/validation" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 12, fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: T.green, textDecoration: "none", letterSpacing: "0.04em" }}>
          <Icon name="check" size={13} color={T.green} /> Does it work? See the live walk-forward track record →
        </a>
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
            {/* The form renders immediately — live market data hydrates in the
                background and only the Generate button waits for it. */}
            <GenForm universe={pool ?? []} state={state} set={set} onGenerate={generate} onExtra={onExtra} dirty={dirty}
              ready={!pendingGen}
              feasibility={state.target > 0 && result ? result.feasibility : null} />
            {loadErr && !pool && (
              <div style={{ color: T.red, fontSize: 12.5, marginTop: 12 }}>Could not load live market data — refresh to try again.</div>
            )}
          </Panel>
        </div>

        {/* results */}
        <div ref={resultsRef} style={{ minWidth: 0 }}>
          {!isPremium && <PremiumBanner signedIn={signedIn} />}
          {generated && displayResult ? (
            isPremium
              ? <ResultsView result={displayResult} selected={selected} onSelect={setSelected} onPin={onPin} onRemove={onRemove} realLoading={realLoading} />
              : <FreeResultsView result={displayResult} selected={selected} onSelect={setSelected} signedIn={signedIn} realLoading={realLoading} />
          ) : (
            <Panel pad={0} style={{ overflow: "hidden" }}><EmptyState /></Panel>
          )}
        </div>
      </div>
    </div>
  );
}

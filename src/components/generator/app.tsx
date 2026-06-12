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
import { GEN_STR } from "./strings";
import { useLocale } from "@/lib/use-locale";

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

// The reveal pipeline: the portfolio only shows once the REAL work is done —
// LLM goal read, Black–Litterman optimization, 10y measurement. Each stage is
// genuine latency, not theatre.
function PipelinePanel({ stage, goalActive }: { stage: number; goalActive: boolean }) {
  const t = GEN_STR[useLocale()];
  const steps = [
    ...(goalActive ? [[t.pipeGoal, t.pipeGoalSub]] : [[t.pipeScreen, t.pipeScreenSub]]),
    [t.pipeOpt, t.pipeOptSub],
    [t.pipeMeasure, t.pipeMeasureSub],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 460, padding: 30 }}>
      <div style={{ width: "100%", maxWidth: 460, display: "grid", gap: 14 }}>
        {steps.map(([title, sub], i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <div key={title} style={{ display: "flex", gap: 13, alignItems: "flex-start", opacity: done || active ? 1 : 0.38, transition: "opacity .3s" }}>
              <span style={{ display: "flex", width: 30, height: 30, borderRadius: 9, flexShrink: 0, alignItems: "center", justifyContent: "center", background: done ? T.green + "1c" : T.raised, border: `1px solid ${done || active ? T.green : T.line}` }}>
                {done
                  ? <Icon name="check" size={15} color={T.green} />
                  : active
                    ? <span style={{ display: "inline-flex", animation: "gen-spin 1s linear infinite" }}><Icon name="loader" size={15} color={T.green} /></span>
                    : <span style={{ fontFamily: mono, fontSize: 11, color: T.faint }}>{i + 1}</span>}
              </span>
              <div>
                <div style={{ fontFamily: display, fontSize: 14.5, fontWeight: 700, color: done || active ? T.ink : T.muted }}>{title}</div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 26, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", color: T.faint }}>{t.pipeFooter}</div>
    </div>
  );
}

function EmptyState() {
  const t = GEN_STR[useLocale()];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", height: "100%", minHeight: 460, padding: 30 }}>
      <span style={{ display: "flex", width: 62, height: 62, borderRadius: 17, background: T.green + "16", border: `1px solid ${T.green}44`, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Icon name="sparkles" size={28} color={T.green} />
      </span>
      <h3 style={{ fontFamily: display, fontSize: 21, fontWeight: 800, color: T.ink, margin: "0 0 10px", maxWidth: 340 }}>{t.emptyTitle}</h3>
      <p style={{ fontSize: 14, color: T.muted, margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
        {t.emptySub}
      </p>
      <div style={{ display: "flex", gap: 18, marginTop: 26, flexWrap: "wrap", justifyContent: "center" }}>
        {([["bars", t.emptyChips[0]], ["pie", t.emptyChips[1]], ["line", t.emptyChips[2]]] as const).map(([ic, tx]) => (
          <div key={tx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.faint }}>
            <Icon name={ic} size={15} color={T.green} /> {tx}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioGeneratorApp() {
  const locale = useLocale();
  const t = GEN_STR[locale];
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
    // DETERMINISTIC: same inputs → same optimal portfolio, every time. An
    // optimizer that returns a different answer per click isn't an optimizer.
    // Fresh builds come from changing inputs, not from hidden dice.
    setExclude([]);
    setSelected("maxSharpe");
    setGenerated(true);
    setDirty(false);
    setTimeout(() => {
      if (resultsRef.current && window.innerWidth < 1000) resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [pool]);
  // Queued click fires as soon as the universe lands — intentional state set.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (pool && pendingGen) { setPendingGen(false); generate(); }
  }, [pool, pendingGen, generate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onPin = (tk: string) => { if (!state.anchors.includes(tk)) set({ anchors: [...state.anchors, tk] }); };
  const onRemove = (tk: string) => setExclude((e) => (e.includes(tk) ? e : [...e, tk]));

  // ---- LLM goal parser + STOCK CURATOR: the free-text goal becomes
  // machine-enforced constraints AND an LLM-selected shortlist, chosen from
  // screened candidate dossiers we send along (so it can only pick names that
  // passed the quant screen — no hallucinated tickers). The build regenerates
  // when the result lands; `parseSettled` gates the reveal pipeline.
  const goalActive = state.goal.trim().length >= 12;
  const [parsedBy, setParsedBy] = React.useState<Record<string, ParsedGoal | null>>({});
  const goalKey = `${state.goal.trim()}|${state.country}`;
  const parseSettled = !goalActive || goalKey in parsedBy;
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    const goal = state.goal.trim();
    if (!generated || !goalActive || !pool) return;
    if (goalKey in parsedBy) {
      const hit = parsedBy[goalKey] ?? null;
      if (hit && state.parsed !== hit) setState((s) => (s.goal.trim() === goal ? { ...s, parsed: hit } : s));
      return;
    }
    let alive = true;
    (async () => {
      let parsed: ParsedGoal | null = null;
      try {
        const supabase = createClient();
        // Candidate dossiers: the top-rated screened stocks the LLM may pick from.
        const candidates = pool
          .filter((u) => u.kind === "stock")
          .sort((a, b) => b.q - a.q)
          .slice(0, 80)
          .map((u) => ({ tk: u.tk, name: u.name, sector: u.sector, country: u.country ?? null, yieldPct: u.yield, grade: u.rate, capUsd: u.capUsd ?? null, vol: u.vol }));
        const { data } = await supabase.functions.invoke("goal-parser", {
          body: { goal, candidates, count: Math.min(12, Math.max(6, state.count - 3)), locale },
        });
        parsed = (data?.parsed ?? null) as ParsedGoal | null;
      } catch { /* parse unavailable — constraints fall back to regex */ }
      if (!alive) return;
      setParsedBy((prev) => ({ ...prev, [goalKey]: parsed }));
      if (parsed) setState((s) => (s.goal.trim() === goal ? { ...s, parsed } : s));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, goalKey, pool]);
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
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    // Wait for the goal parse before composing — otherwise we optimize a
    // candidate set the LLM is about to change.
    if (!generated || !result || !composeKey || !parseSettled || composeBy[composeKey]) return;
    const symbols = composeKey.split(",").filter(Boolean);
    if (symbols.length < 4) {
      // Settle the pipeline immediately for tiny books (heuristic weights stay).
      setComposeBy((prev) => ({ ...prev, [composeKey]: { skipped: true } }));
      return;
    }
    let alive = true;
    fetch("/api/portfolio/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols, horizonYears: result.inputs.years }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setComposeBy((prev) => ({ ...prev, [composeKey]: d?.ok ? d : { failed: true } })); })
      .catch(() => { if (alive) setComposeBy((prev) => ({ ...prev, [composeKey]: { failed: true } })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, composeKey, parseSettled]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
          .sort((a, b) => (a.cls === "cash" ? 1 : b.cls === "cash" ? -1 : b.w - a.w))
          // Dollar amounts must follow the OPTIMIZED weights (the table showed
          // 11.2% next to a stale $570 on $10k).
          .map((h) => ({ ...h, usd: h.w * result.inputs.amount }));
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
      .then((d) => { if (alive) setRealBy((prev) => ({ ...prev, [realKey]: d?.ok ? d : { failed: true } })); })
      .catch(() => { if (alive) setRealBy((prev) => ({ ...prev, [realKey]: { failed: true } })); })
      .finally(() => { if (alive) setRealLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, realKey]);

  // The result the views render: selected variant's metrics get the real
  // overlay once measured (on top of the optimized weights when composed).
  const displayResult = React.useMemo(() => {
    if (!composedResult) return null;
    const real = realBy[realKey];
    if (!real || real.failed) return composedResult;
    const ctx = { years: composedResult.inputs.years, amount: composedResult.inputs.amount, monthlyDCA: composedResult.inputs.monthlyDCA };
    return {
      ...composedResult,
      variants: composedResult.variants.map((v) => (v.id === (curVariant?.id ?? selected) ? { ...v, metrics: applyReal(v.metrics, real, ctx, v.holdings) } : v)),
    };
  }, [composedResult, realBy, realKey, curVariant?.id, selected]);

  return (
    <div className="gen-root" style={{ background: T.bg, minHeight: "100vh", color: T.ink, fontFamily: body }}>
      <style>{CSS}</style>

      {/* hero */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 8px", textAlign: "center" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: T.green, marginBottom: 14 }}>{t.heroKicker}{isPremium ? "" : t.heroFree}</div>
        <h1 style={{ fontFamily: display, fontSize: 40, fontWeight: 800, color: T.ink, margin: "0 0 14px", letterSpacing: "-0.03em" }}>{t.heroTitle}</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "0 auto", maxWidth: 620, lineHeight: 1.6 }}>
          {t.heroSub}
        </p>
        <a href="/tools/portfolio-generator/validation" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 12, fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: T.green, textDecoration: "none", letterSpacing: "0.04em" }}>
          <Icon name="check" size={13} color={T.green} /> {t.heroValidation}
        </a>
      </div>

      {/* split layout */}
      <div className="gen-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "26px 24px 60px", display: "grid", gridTemplateColumns: "minmax(360px, 440px) 1fr", gap: 24, alignItems: "start" }}>
        {/* form */}
        <div className="gen-formWrap" style={{ position: "sticky", top: 72 }}>
          <Panel pad={26}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
              <span style={{ display: "flex", width: 30, height: 30, borderRadius: 9, background: T.green + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="zap" size={16} color={T.green} /></span>
              <span style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: T.ink, whiteSpace: "nowrap" }}>{t.panelTitle}</span>
            </div>
            {/* The form renders immediately — live market data hydrates in the
                background and only the Generate button waits for it. */}
            <GenForm universe={pool ?? []} state={state} set={set} onGenerate={generate} onExtra={onExtra} dirty={dirty}
              ready={!pendingGen}
              feasibility={state.target > 0 && result ? result.feasibility : null} />
            {loadErr && !pool && (
              <div style={{ color: T.red, fontSize: 12.5, marginTop: 12 }}>{t.loadErr}</div>
            )}
          </Panel>
        </div>

        {/* results — revealed only when the pipeline (parse → optimize →
            measure) has genuinely finished */}
        <div ref={resultsRef} style={{ minWidth: 0 }}>
          {!isPremium && <PremiumBanner signedIn={signedIn} />}
          {(() => {
            if (!generated || !displayResult) return <Panel pad={0} style={{ overflow: "hidden" }}><EmptyState /></Panel>;
            const composeState = composeBy[composeKey];
            const realState = realBy[realKey];
            // Steps: [parse/screen, optimize, measure] — screen is instant, so
            // without a goal the pipeline starts at stage 1.
            const stage = !parseSettled ? 0 : !composeState ? 1 : !realState ? 2 : 3;
            const done = stage === 3;
            if (!done) return <Panel pad={0} style={{ overflow: "hidden" }}><PipelinePanel stage={stage} goalActive={goalActive} /></Panel>;
            return isPremium
              ? <ResultsView result={displayResult} selected={selected} onSelect={setSelected} onPin={onPin} onRemove={onRemove} realLoading={realLoading} />
              : <FreeResultsView result={displayResult} selected={selected} onSelect={setSelected} signedIn={signedIn} realLoading={realLoading} />;
          })()}
        </div>
      </div>
    </div>
  );
}

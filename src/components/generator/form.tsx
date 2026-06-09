/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Portfolio Generator — preference form (segmented controls, anchor search,
// goal, sectors, holdings count).

import React from "react";
import { T, display, body, mono, Icon } from "@/components/healthcheck/theme";
import { GEN_SECTORS, type Feasibility } from "./engine";
import { GEN_CURRENCIES, curSym, fmtCurShort } from "./currency";
import type { GenInstrument, GenOptions } from "./types";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export const genTypeColor = (t?: string) => (t === "etf" ? T.blue : t === "bond" ? T.teal : t === "cash" ? T.faint : T.green);
export const genTypeLabel = (t?: string) => (t === "etf" ? "ETF" : t === "bond" ? "BOND" : t === "cash" ? "CASH" : "STOCK");

/* segmented control */
function Seg({ options, value, onChange }: { options: { id: string; label: string; sub: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 8, width: "100%" }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} className="gen-segBtn" style={{
            textAlign: "left", background: on ? T.green + "16" : T.bg, border: `1px solid ${on ? T.green : T.line2}`,
            borderRadius: 11, padding: "11px 12px", cursor: "pointer", minWidth: 0, overflow: "hidden",
          }}>
            <div style={{ fontFamily: display, fontSize: 13, fontWeight: 700, color: on ? T.green : T.ink, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</div>
            <div style={{ fontSize: 10.5, color: T.faint, lineHeight: 1.3 }}>{o.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

/* anchor (build-around) search — local universe first, then the FULL ticker
   DB via /api/search; picked DB tickers are resolved into instruments through
   /api/portfolio/instrument so anything (e.g. QQQI) can be pinned. */
type RemoteHit = { tk: string; name: string; type: "stock" | "etf" };

function AnchorSearch({ universe, anchors, setAnchors, onExtra }: {
  universe: GenInstrument[]; anchors: string[]; setAnchors: (a: string[]) => void;
  onExtra: (inst: GenInstrument) => void;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const [remote, setRemote] = React.useState<RemoteHit[]>([]);
  const [resolving, setResolving] = React.useState<string | null>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const byTk = React.useMemo(() => new Map(universe.map((u) => [u.tk, u])), [universe]);
  const local = React.useMemo(() => {
    const term = q.trim().toUpperCase();
    const pool = universe.filter((u) => u.cls !== "cash" && !anchors.includes(u.tk));
    if (!term) return pool.filter((u) => u.type === "stock" || u.kind === "div").slice(0, 7);
    return pool.filter((u) => u.tk.includes(term) || u.name.toUpperCase().includes(term)).slice(0, 8);
  }, [q, anchors, universe]);

  // Debounced full-DB search for anything outside the curated universe.
  React.useEffect(() => {
    const term = q.trim();
    const id = setTimeout(async () => {
      if (term.length < 2) { setRemote([]); return; }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!r.ok) return;
        const d = await r.json();
        const seen = new Set([...universe.map((u) => u.tk), ...anchors]);
        setRemote(
          ((d.results ?? []) as { symbol: string; name: string | null; is_etf: boolean | null; is_fund: boolean | null }[])
            .filter((x) => !seen.has(x.symbol))
            .slice(0, 5)
            .map((x) => ({ tk: x.symbol, name: x.name ?? x.symbol, type: x.is_etf || x.is_fund ? "etf" as const : "stock" as const }))
        );
      } catch { /* search is best-effort */ }
    }, q.trim().length < 2 ? 0 : 250);
    return () => clearTimeout(id);
  }, [q, universe, anchors]);

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const add = (tk: string) => { if (!anchors.includes(tk)) setAnchors([...anchors, tk]); setQ(""); setRemote([]); setHi(0); };
  const addRemote = async (tk: string) => {
    if (resolving) return;
    setResolving(tk);
    try {
      const r = await fetch(`/api/portfolio/instrument?symbol=${encodeURIComponent(tk)}`);
      if (r.ok) {
        const d = await r.json();
        onExtra(d.instrument as GenInstrument);
        add(tk);
      }
    } catch { /* leave the suggestion in place */ }
    setResolving(null);
  };
  const remove = (tk: string) => setAnchors(anchors.filter((t) => t !== tk));
  const total = local.length + remote.length;
  const pick = (i: number) => {
    if (i < local.length) add(local[i].tk);
    else if (remote[i - local.length]) void addRemote(remote[i - local.length].tk);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(hi); }
    else if (e.key === "Backspace" && !q && anchors.length) remove(anchors[anchors.length - 1]);
  };
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div onClick={() => setOpen(true)} style={{
        display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", minHeight: 46,
        background: T.bg, border: `1px solid ${open ? T.green : T.line2}`, borderRadius: 11, padding: "8px 10px", cursor: "text",
        boxShadow: open ? `0 0 0 3px ${T.green}22` : "none",
      }}>
        {anchors.map((tk) => {
          return (
            <span key={tk} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.green + "18", border: `1px solid ${T.green}55`, borderRadius: 8, padding: "4px 6px 4px 8px" }}>
              <Icon name="sparkles" size={11} color={T.green} />
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: T.ink }}>{tk}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(tk); }} style={{ display: "flex", border: "none", background: "transparent", color: T.faint, cursor: "pointer", padding: 0 }} aria-label={`Remove ${byTk.get(tk)?.name ?? tk}`}><Icon name="x" size={12} /></button>
            </span>
          );
        })}
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={key}
          placeholder={anchors.length ? "Add another…" : "Search a stock or ETF — e.g. AAPL, SCHD, O"}
          style={{ flex: 1, minWidth: 160, background: "transparent", border: "none", outline: "none", color: T.ink, fontFamily: body, fontSize: 13.5, padding: "4px 2px" }} />
      </div>
      {open && total > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 12, padding: 6, zIndex: 60, boxShadow: "0 18px 44px rgba(0,0,0,.5)", maxHeight: 320, overflowY: "auto" }}>
          {local.map((u, i) => (
            <div key={u.tk} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); add(u.tk); }}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 8, cursor: "pointer", background: i === hi ? T.raised : "transparent" }}>
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: T.ink, width: 52 }}>{u.tk}</span>
              <span style={{ flex: 1, fontSize: 12.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: T.green }}>{u.yield.toFixed(1)}%</span>
              <span style={{ fontFamily: mono, fontSize: 8.5, color: genTypeColor(u.type), border: `1px solid ${genTypeColor(u.type)}55`, borderRadius: 4, padding: "1px 5px" }}>{genTypeLabel(u.type)}</span>
            </div>
          ))}
          {remote.length > 0 && (
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, padding: "8px 11px 4px" }}>All tickers</div>
          )}
          {remote.map((u, j) => {
            const i = local.length + j;
            return (
              <div key={u.tk} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); void addRemote(u.tk); }}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 8, cursor: "pointer", background: i === hi ? T.raised : "transparent", opacity: resolving && resolving !== u.tk ? 0.5 : 1 }}>
                <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: T.ink, width: 52 }}>{u.tk}</span>
                <span style={{ flex: 1, fontSize: 12.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                {resolving === u.tk && <span style={{ display: "inline-flex", animation: "gen-spin 1s linear infinite" }}><Icon name="loader" size={12} color={T.green} /></span>}
                <span style={{ fontFamily: mono, fontSize: 8.5, color: genTypeColor(u.type), border: `1px solid ${genTypeColor(u.type)}55`, borderRadius: 4, padding: "1px 5px" }}>{genTypeLabel(u.type)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 11 }}>
      <span style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{children}</span>
      {hint && <span style={{ fontSize: 11.5, color: T.faint }}>{hint}</span>}
    </div>
  );
}

function FormSection({ n, title, hint, children, first }: { n: string; title: string; hint?: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{ borderTop: first ? "none" : `1px solid ${T.line}`, paddingTop: first ? 0 : 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: T.green, background: T.green + "1a", border: `1px solid ${T.green}3a`, borderRadius: 6, padding: "3px 7px", letterSpacing: "0.04em" }}>{n}</span>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: T.muted }}>{title}</span>
        {hint && <span style={{ marginLeft: "auto", fontSize: 11, color: T.faint }}>{hint}</span>}
      </div>
      <div style={{ display: "grid", gap: 22 }}>{children}</div>
    </div>
  );
}

export function GenForm({ universe, state, set, onGenerate, onExtra, dirty, feasibility }: {
  universe: GenInstrument[];
  state: GenOptions;
  set: (patch: Partial<GenOptions>) => void;
  onGenerate: () => void;
  onExtra: (inst: GenInstrument) => void;
  dirty: boolean;
  feasibility: Feasibility | null;
}) {
  const sym = curSym(state.currency);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <FormSection n="01" title="The basics" first>
        {/* amount + currency */}
        <div>
          <FieldLabel>How much do you want to invest?</FieldLabel>
          <div className="gen-input" style={{ display: "flex", alignItems: "center", gap: 0, background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "0 8px 0 6px", height: 50 }}>
            <select value={state.currency} onChange={(e) => set({ currency: e.target.value })} aria-label="Currency"
              style={{ background: "transparent", border: "none", outline: "none", color: T.faint, fontFamily: mono, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "0 2px" }}>
              {GEN_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} style={{ background: T.panel2, color: T.ink }}>{c.sym.trim() || c.code} {c.code}</option>
              ))}
            </select>
            <input type="text" inputMode="numeric" value={state.amount.toLocaleString("en-US")}
              onChange={(e) => { const n = +e.target.value.replace(/[^0-9]/g, ""); set({ amount: clamp(n || 0, 0, 100000000) }); }}
              aria-label="Investment amount"
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.ink, fontFamily: display, fontSize: 19, fontWeight: 700, padding: "0 10px", fontVariantNumeric: "tabular-nums" }} />
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
            {[1000, 10000, 50000, 100000].map((v) => (
              <button key={v} onClick={() => set({ amount: v })} className="gen-quickAmt" style={{
                background: state.amount === v ? T.green + "18" : T.panel2, border: `1px solid ${state.amount === v ? T.green : T.line2}`,
                color: state.amount === v ? T.green : T.muted, borderRadius: 8, padding: "5px 11px", fontFamily: mono, fontSize: 11.5, cursor: "pointer", fontWeight: 600,
              }}>{fmtCurShort(v, sym)}</button>
            ))}
          </div>
        </div>

        {/* risk */}
        <div>
          <FieldLabel>Risk tolerance</FieldLabel>
          <Seg value={state.risk} onChange={(v) => set({ risk: v as GenOptions["risk"] })} options={[
            { id: "conservative", label: "Conservative", sub: "Lower swings, ballast" },
            { id: "balanced", label: "Balanced", sub: "A middle path" },
            { id: "aggressive", label: "Aggressive", sub: "More risk for return" },
          ]} />
        </div>

        {/* objective */}
        <div>
          <FieldLabel>What matters more?</FieldLabel>
          <Seg value={state.objective} onChange={(v) => set({ objective: v as GenOptions["objective"] })} options={[
            { id: "income", label: "Income", sub: "Higher dividend yield" },
            { id: "balanced", label: "Balanced", sub: "Income + growth" },
            { id: "growth", label: "Growth", sub: "Capital appreciation" },
          ]} />
        </div>

        {/* horizon */}
        <div>
          <FieldLabel>Time horizon</FieldLabel>
          <Seg value={state.horizon} onChange={(v) => set({ horizon: v as GenOptions["horizon"] })} options={[
            { id: "short", label: "< 5 yrs", sub: "More ballast" },
            { id: "medium", label: "5–15 yrs", sub: "Balanced" },
            { id: "long", label: "15+ yrs", sub: "More equity" },
          ]} />
        </div>
      </FormSection>

      <FormSection n="02" title="Your goal" hint="optional">
        {/* goal in plain english */}
        <div>
          <FieldLabel hint="we read this and tilt the picks">Describe your goal</FieldLabel>
          <div style={{ position: "relative" }}>
            <textarea className="gen-input" value={state.goal} maxLength={500} onChange={(e) => set({ goal: e.target.value })} rows={3}
              placeholder="e.g. Retirement nest egg for a 45-year-old. Broad equity with bond ballast and some international. Comfortable through a 25% drawdown, not 40%."
              style={{ width: "100%", resize: "none", display: "block", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "12px 13px 26px", color: T.ink, fontFamily: body, fontSize: 13, lineHeight: 1.5, outline: "none" }} />
            <span style={{ position: "absolute", bottom: 10, left: 13, fontFamily: mono, fontSize: 10, color: T.faint }}>{state.goal.length} / 500</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {["dividend income", "tech innovation", "international", "capital preservation"].map((tag) => (
              <button key={tag} onClick={() => set({ goal: (state.goal ? state.goal.trim() + " " : "") + tag })} className="gen-quickAmt" style={{
                background: T.panel2, border: `1px dashed ${T.line2}`, color: T.muted, borderRadius: 7, padding: "4px 9px", fontSize: 11, cursor: "pointer",
              }}>+ {tag}</button>
            ))}
          </div>
        </div>

        {/* target + monthly */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel hint="what you want to end up with">Target wealth</FieldLabel>
            <div className="gen-input" style={{ display: "flex", alignItems: "center", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "0 12px", height: 44 }}>
              <span style={{ fontFamily: display, fontSize: 15, color: T.faint, fontWeight: 700 }}>{sym}</span>
              <input type="text" inputMode="numeric" value={state.target ? state.target.toLocaleString("en-US") : ""} placeholder="e.g. 100,000"
                onChange={(e) => { const n = +e.target.value.replace(/[^0-9]/g, ""); set({ target: n || 0 }); }}
                aria-label="Target wealth"
                style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.ink, fontFamily: display, fontSize: 15, fontWeight: 700, padding: "0 8px" }} />
            </div>
          </div>
          <div>
            <FieldLabel hint="added every month">Monthly top-up</FieldLabel>
            <div className="gen-input" style={{ display: "flex", alignItems: "center", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "0 12px", height: 44 }}>
              <span style={{ fontFamily: display, fontSize: 15, color: T.faint, fontWeight: 700 }}>{sym}</span>
              <input type="text" inputMode="numeric" value={state.monthlyDCA ? state.monthlyDCA.toLocaleString("en-US") : ""} placeholder="e.g. 100"
                onChange={(e) => { const n = +e.target.value.replace(/[^0-9]/g, ""); set({ monthlyDCA: n || 0 }); }}
                aria-label="Monthly contribution"
                style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.ink, fontFamily: display, fontSize: 15, fontWeight: 700, padding: "0 8px" }} />
            </div>
          </div>
        </div>

        {/* feasibility card */}
        {feasibility && (
          <div style={{ display: "flex", gap: 12, background: feasibility.color + "12", border: `1px solid ${feasibility.color}44`, borderRadius: 12, padding: "13px 15px" }}>
            <Icon name={feasibility.grade === "Comfortable" || feasibility.grade === "Already there" ? "check" : "target"} size={18} color={feasibility.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: feasibility.color, marginBottom: 3 }}>
                Goal feasibility: {feasibility.grade}{feasibility.reqCAGR > 0 && ` · ${feasibility.reqCAGR}% CAGR needed`}
              </div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{feasibility.note}</div>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection n="03" title="Refine the build">
        {/* sectors */}
        <div>
          <FieldLabel hint="leave blank for all">Favour any sectors?</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GEN_SECTORS.map((s) => {
              const on = state.sectors.includes(s);
              return (
                <button key={s} onClick={() => set({ sectors: on ? state.sectors.filter((x) => x !== s) : [...state.sectors, s] })} className="gen-chip" style={{
                  fontFamily: body, fontSize: 12, color: on ? T.bg : T.muted, background: on ? T.green : T.raised,
                  border: `1px solid ${on ? T.green : T.line}`, borderRadius: 20, padding: "6px 13px", cursor: "pointer", fontWeight: 500,
                }}>{s}</button>
              );
            })}
          </div>
        </div>

        {/* anchors */}
        <div>
          <FieldLabel hint="we'll build the rest around them">Build around specific holdings?</FieldLabel>
          <AnchorSearch universe={universe} anchors={state.anchors} setAnchors={(a) => set({ anchors: a })} onExtra={onExtra} />
          {state.anchors.length > 0 && (
            <div style={{ marginTop: 9, fontSize: 11.5, color: T.green, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="sparkles" size={12} color={T.green} /> {state.anchors.length} anchor{state.anchors.length > 1 ? "s" : ""} pinned — kept in every portfolio we build.
            </div>
          )}
        </div>

        {/* holdings count */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 11 }}>
            <span style={{ fontFamily: display, fontSize: 13.5, fontWeight: 700, color: T.ink, whiteSpace: "nowrap" }}>Number of holdings</span>
            <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: T.green }}>{state.count}</span>
          </div>
          <input type="range" min={5} max={20} step={1} value={state.count} onChange={(e) => set({ count: +e.target.value })} className="gen-range" aria-label="Number of holdings"
            style={{ width: "100%", ["--p" as any]: `${((state.count - 5) / 15) * 100}%` }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: mono, fontSize: 10.5, color: T.faint }}>
            <span>5 · focused</span><span>20 · spread out</span>
          </div>
        </div>
      </FormSection>

      <button onClick={onGenerate} className="gen-btnPrimary gen-generate" style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, background: T.green, color: T.bg,
        border: "none", borderRadius: 12, padding: "15px", fontFamily: body, fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}>
        <Icon name={dirty ? "zap" : "repeat"} size={18} /> {dirty ? "Generate my portfolio" : "Regenerate"} <Icon name="arrowRight" size={17} />
      </button>
    </div>
  );
}

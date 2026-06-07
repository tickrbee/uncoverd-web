/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { T, display, body, mono, HERO_GRAD, Icon, Pill, gradeOf, usd } from "./theme";
import { PORTFOLIOS, PRICING } from "./data";

export const typeColor = (t: string) => (t === "etf" ? T.blue : t === "bond" ? T.teal : t === "cash" ? T.faint : T.green);
export const typeLabel = (t: string) => (t === "etf" ? "ETF" : t === "bond" ? "BOND" : t === "cash" ? "CASH" : "STOCK");

/* ============================== HOLDINGS BUILDER ============================== */
type Pick = { symbol: string; name: string; type?: string | null; sector?: string | null; is_etf?: boolean | null; is_fund?: boolean | null };
const pickType = (r: any): string => (r.type === "etf" || r.is_etf || r.is_fund ? "etf" : "stock");

// Modal stock/ETF selector backed by the real DB search (/api/search).
function SelectorModal({ open, onClose, selected, setSelected }: any) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const deb = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (deb.current) clearTimeout(deb.current);
    const term = q.trim();
    if (term.length < 1) { setResults([]); return; }
    setLoading(true);
    deb.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 180);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, open]);

  if (!open || typeof document === "undefined") return null;
  const has = (sym: string) => selected.some((s: Pick) => s.symbol === sym);
  const toggle = (r: any) => {
    const sym = r.symbol;
    if (has(sym)) setSelected(selected.filter((s: Pick) => s.symbol !== sym));
    else setSelected([...selected, { symbol: sym, name: r.name, type: pickType(r), sector: r.sector, is_etf: r.is_etf, is_fund: r.is_fund }]);
  };
  const shown = results.filter((r) => filter === "all" || pickType(r) === filter);

  // Portal to <body> so the fixed overlay escapes the Hero's backdrop-filter
  // container (which would otherwise trap position:fixed and clip the modal).
  return createPortal(
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(3,6,12,0.82)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "7vh 18px 18px", fontFamily: body }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(620px, 100%)", background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: 22, position: "relative", maxHeight: "82vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color: T.ink, margin: 0 }}>Add holdings</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex" }}><Icon name="x" size={18} /></button>
        </div>

        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", display: "flex" }}><Icon name="search" size={16} color={T.faint} /></span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the database — ticker or company name"
            style={{ width: "100%", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "12px 14px 12px 38px", color: T.ink, fontFamily: body, fontSize: 14, outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
          {[{ id: "all", label: "All" }, { id: "stock", label: "Stocks" }, { id: "etf", label: "ETFs & funds" }].map((f) => {
            const on = filter === f.id;
            return <button key={f.id} onClick={() => setFilter(f.id)} className="hc-sampleChip" style={{ background: on ? T.green : T.panel2, color: on ? T.bg : T.muted, border: `1px solid ${on ? T.green : T.line2}`, borderRadius: 18, padding: "5px 12px", cursor: "pointer", fontFamily: body, fontSize: 12, fontWeight: on ? 700 : 500 }}>{f.label}</button>;
          })}
        </div>

        <div style={{ marginTop: 12, overflowY: "auto", flex: 1, border: `1px solid ${T.line}`, borderRadius: 12 }}>
          {loading ? <div style={{ padding: 18, fontSize: 13, color: T.faint, textAlign: "center" }}>Searching your database…</div>
            : q.trim().length < 1 ? <div style={{ padding: 18, fontSize: 13, color: T.faint, textAlign: "center" }}>Type a ticker or name to search.</div>
            : shown.length === 0 ? <div style={{ padding: 18, fontSize: 13, color: T.faint, textAlign: "center" }}>No matches in the database.</div>
            : shown.map((r, i) => {
              const added = has(r.symbol); const t = pickType(r);
              return (
                <button key={r.symbol} onClick={() => toggle(r)} className="hc-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", cursor: "pointer", background: "transparent", border: "none", borderTop: i ? `1px solid ${T.line}` : "none", textAlign: "left" }}>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.ink, width: 64 }}>{r.symbol}</span>
                  <span style={{ flex: 1, fontSize: 13, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  {r.sector && <span style={{ fontSize: 11, color: T.faint }}>{r.sector}</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: typeColor(t), border: `1px solid ${typeColor(t)}55`, borderRadius: 4, padding: "1px 5px" }}>{typeLabel(t)}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: body, fontSize: 12, fontWeight: 700, color: added ? T.faint : T.green, width: 64, justifyContent: "flex-end" }}>
                    {added ? <>Added</> : <><Icon name="plus" size={14} color={T.green} /> Add</>}
                  </span>
                </button>
              );
            })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>{selected.length} selected</span>
          <button onClick={onClose} className="hc-btnPrimary" style={{ background: T.green, color: T.bg, border: "none", borderRadius: 10, padding: "10px 20px", fontFamily: body, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Done</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function HoldingSearch({ selected, setSelected, onAnalyze, isPremium, onLocked, loading, ctaLabel = "Create & analyze portfolio" }: any) {
  const [open, setOpen] = React.useState(false);
  const remove = (sym: string) => setSelected(selected.filter((s: Pick) => s.symbol !== sym));
  const openSelector = () => (isPremium ? setOpen(true) : onLocked?.());

  return (
    <div>
      {/* search trigger → opens modal selector (Pro only) */}
      <button onClick={openSelector} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, background: T.bg, border: `1px solid ${T.line2}`,
        borderRadius: 11, padding: "13px 14px", cursor: "pointer", textAlign: "left",
      }}>
        <Icon name="search" size={16} color={T.faint} />
        <span style={{ flex: 1, color: T.faint, fontFamily: body, fontSize: 14 }}>Search stocks &amp; ETFs to add — ticker or company name</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: body, fontSize: 12.5, fontWeight: 700, color: T.green }}>
          {!isPremium && <Icon name="lock" size={12} color={T.gold} />}<Icon name="plus" size={14} color={T.green} /> Add holdings
        </span>
      </button>

      {/* your portfolio */}
      <div style={{ marginTop: 14, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: selected.length ? 10 : 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>Your portfolio</span>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: selected.length >= 2 ? T.green : T.faint, background: (selected.length >= 2 ? T.green : T.faint) + "1f", borderRadius: 6, padding: "2px 7px" }}>{selected.length}</span>
          </span>
          {selected.length > 0 && <button onClick={() => setSelected([])} style={{ fontFamily: body, fontSize: 11.5, color: T.faint, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Clear all</button>}
        </div>
        {selected.length === 0
          ? <div style={{ fontSize: 12.5, color: T.faint, paddingTop: 8 }}>Empty — tap <b style={{ color: T.green }}>Add holdings</b> above to search the database and build your portfolio.</div>
          : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {selected.map((s: Pick) => {
                const c = typeColor(s.type || "stock");
                return (
                  <span key={s.symbol} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.raised, border: `1px solid ${T.line2}`, borderRadius: 8, padding: "6px 7px 6px 9px" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
                    <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: T.ink }}>{s.symbol}</span>
                    <button onClick={() => remove(s.symbol)} title={`Remove ${s.symbol}`} style={{ display: "flex", border: "none", background: "transparent", color: T.faint, cursor: "pointer", padding: 1, borderRadius: 4 }} className="hc-chip"><Icon name="x" size={13} /></button>
                  </span>
                );
              })}
            </div>
          )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={() => (loading ? null : isPremium ? onAnalyze() : onLocked?.())} disabled={selected.length < 2 || loading} className="hc-btnPrimary" style={{
          display: "inline-flex", alignItems: "center", gap: 9, background: selected.length < 2 ? T.raised : T.green, color: selected.length < 2 ? T.faint : T.bg,
          border: "none", borderRadius: 11, padding: "13px 22px", fontFamily: body, fontSize: 14.5, fontWeight: 700, cursor: selected.length < 2 || loading ? "default" : "pointer",
        }}>
          {loading ? <Icon name="loader" size={17} style={{ animation: "hc-spin 1s linear infinite" }} /> : (!isPremium && <Icon name="lock" size={15} color={selected.length < 2 ? T.faint : T.bg} />)}
          {!loading && <Icon name="activity" size={17} />} {loading ? "Analyzing…" : ctaLabel}
        </button>
        <span style={{ fontSize: 12.5, color: T.faint }}>No quantities needed — we weight equally and grade risk, correlation & concentration. <b style={{ color: T.muted }}>{isPremium ? "" : "Pro only."}</b></span>
      </div>

      <SelectorModal open={open} onClose={() => setOpen(false)} selected={selected} setSelected={setSelected} />
    </div>
  );
}

/* ============================== PORTFOLIO SWITCHER ============================== */
export function PortfolioTabs({ active, setActive, onNew, custom, isPremium }: any) {
  // Premium users see only their own portfolios (no demo samples); free/demo
  // users get the three sample books to explore.
  const base = isPremium ? [] : PORTFOLIOS;
  const list = custom ? [...base, custom] : base;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {list.map((p: any) => {
        const on = active === p.id;
        return (
          <button key={p.id} onClick={() => setActive(p.id)} className="hc-pfTab" style={{
            display: "inline-flex", alignItems: "center", gap: 9, background: on ? T.panel : "transparent",
            border: `1px solid ${on ? T.line2 : "transparent"}`, borderRadius: 11, padding: "9px 14px", cursor: "pointer", textAlign: "left",
          }}>
            <span style={{ display: "flex", width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", background: on ? T.green + "22" : T.raised, flexShrink: 0 }}>
              <Icon name={p.icon} size={15} color={on ? T.green : T.muted} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: display, fontSize: 13.5, fontWeight: 700, color: on ? T.ink : T.muted }}>
                {p.name}{p.isCustom && <span style={{ fontFamily: mono, fontSize: 8.5, color: T.green, border: `1px solid ${T.green}55`, borderRadius: 4, padding: "1px 4px" }}>YOURS</span>}
              </span>
              <span style={{ fontSize: 11, color: T.faint }}>{usd(p.value)} · Grade {gradeOf(p.overall)}</span>
            </span>
          </button>
        );
      })}
      <button onClick={onNew} className="hc-pfTab" style={{
        display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: `1px dashed ${T.line2}`,
        borderRadius: 11, padding: "9px 15px", cursor: "pointer", color: T.muted, fontFamily: body, fontSize: 13, fontWeight: 600,
      }}>
        <Icon name="plus" size={15} /> New portfolio
        {!isPremium && <Icon name="lock" size={11} color={T.faint} />}
      </button>
    </div>
  );
}

/* ============================== HERO ============================== */
export function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ background: HERO_GRAD, borderRadius: 20, padding: "32px 36px", position: "relative", overflow: "hidden", border: `1px solid ${T.indigo}55` }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 85% 0%, rgba(255,255,255,0.10), transparent 60%)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>Tools · Demo</div>
        <h1 style={{ fontFamily: display, fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.025em" }}>Portfolio Healthcheck</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,0.82)", margin: 0, maxWidth: 620 }}>
          Search and select your holdings — no quantities needed — and we'll grade the risk/return profile, how correlated they are, where you're concentrated, and exactly how to optimize.
        </p>
        {children}
      </div>
    </div>
  );
}

/* ============================== SECTION INTRO ============================== */
export function SectionIntro({ kicker, title, body: bodyText, premium }: any) {
  return (
    <div style={{ marginBottom: 18, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.green }}>{kicker}</span>
        {premium && <Pill color={T.gold}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="crown" size={10} /> PRO</span></Pill>}
      </div>
      <h2 style={{ fontFamily: display, fontSize: 25, fontWeight: 800, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{title}</h2>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: T.muted, margin: 0, maxWidth: 720 }}>{bodyText}</p>
    </div>
  );
}

/* ============================== PRICING ============================== */
export function Pricing({ onPick }: any) {
  return (
    <div id="hc-pricing">
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: T.green, marginBottom: 10 }}>Pricing</div>
        <h2 style={{ fontFamily: display, fontSize: 32, fontWeight: 800, color: T.ink, margin: "0 0 10px", letterSpacing: "-0.02em" }}>You're seeing a sample. Run it on your own portfolio.</h2>
        <p style={{ fontSize: 15, color: T.muted, margin: "0 auto", maxWidth: 560 }}>Everything above is free to explore on our sample portfolios. Connect your own holdings and unlock the full toolkit.</p>
      </div>
      <div className="hc-pricing-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${PRICING.length}, minmax(0,1fr))`, gap: 18, maxWidth: PRICING.length <= 2 ? 680 : 1000, margin: "0 auto" }}>
        {PRICING.map((t) => (
          <div key={t.id} style={{
            position: "relative", background: t.featured ? T.panel2 : T.panel, border: `1px solid ${t.featured ? T.green : T.line}`,
            borderRadius: 18, padding: 26, display: "flex", flexDirection: "column", boxShadow: t.featured ? `0 0 0 1px ${T.green}, 0 20px 50px -20px ${T.green}44` : "none",
          }}>
            {t.featured && <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: T.green, color: T.bg, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", borderRadius: 20, padding: "4px 12px" }}>MOST POPULAR</span>}
            <div style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: T.ink }}>{t.name}</div>
            <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>{t.tagline}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 18 }}>
              <span style={{ fontFamily: display, fontSize: 38, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>${t.price}</span>
              <span style={{ fontSize: 14, color: T.faint }}>{t.period}</span>
            </div>
            <button onClick={() => onPick(t)} className="hc-btnPrimary" style={{
              background: t.featured ? T.green : "transparent", color: t.featured ? T.bg : T.ink, border: `1px solid ${t.featured ? T.green : T.line2}`,
              borderRadius: 11, padding: "12px", fontFamily: body, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20,
            }}>{t.cta}</button>
            <div style={{ display: "grid", gap: 11 }}>
              {t.features.map((f: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: T.muted, lineHeight: 1.45 }}>
                  <Icon name="check" size={15} color={t.featured ? T.green : T.faint} style={{ flexShrink: 0, marginTop: 1 }} /> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.faint }}>Cancel anytime · No data is sold, ever.</div>
    </div>
  );
}

/* ============================== UPGRADE BAR ============================== */
export function UpgradeBar({ onUpgrade, onDismiss }: any) {
  return (
    <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 60, width: "min(880px, calc(100% - 32px))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: T.panel2, border: `1px solid ${T.green}55`, borderRadius: 14, padding: "13px 16px 13px 20px", boxShadow: "0 20px 50px -16px rgba(0,0,0,.7)", flexWrap: "wrap" }}>
        <span style={{ display: "flex", width: 34, height: 34, borderRadius: 9, background: T.green + "22", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="crown" size={17} color={T.green} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: display, fontSize: 14.5, fontWeight: 700, color: T.ink }}>You're on the free sample view</div>
          <div style={{ fontSize: 12.5, color: T.muted }}>Analyze your own holdings, save portfolios & unlock optimization — $100/year.</div>
        </div>
        <button onClick={onUpgrade} className="hc-btnPrimary" style={{ background: T.green, color: T.bg, border: "none", borderRadius: 10, padding: "11px 18px", fontFamily: body, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Get Pro</button>
        <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex", padding: 4 }}><Icon name="x" size={16} /></button>
      </div>
    </div>
  );
}

/* ============================== SIGNUP MODAL ============================== */
export function SignupModal({ open, reason, onClose, plan }: any) {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  if (!open) return null;
  const premium = plan && plan.id !== "free";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(3,6,12,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: 30, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: T.faint, cursor: "pointer", display: "flex" }}><Icon name="x" size={18} /></button>
        {done ? (
          <div style={{ textAlign: "center", padding: "14px 0" }}>
            <span style={{ display: "inline-flex", width: 52, height: 52, borderRadius: 14, background: T.green + "22", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={26} color={T.green} /></span>
            <h3 style={{ fontFamily: display, fontSize: 21, fontWeight: 800, color: T.ink, margin: "16px 0 8px" }}>You're in 🎉</h3>
            <p style={{ fontSize: 14, color: T.muted, margin: "0 0 20px" }}>This is a demo — in the real product you'd now be {premium ? "upgrading to Premium" : "creating your free account"} and analyzing your own holdings.</p>
            <button onClick={onClose} className="hc-btnPrimary" style={{ background: T.green, color: T.bg, border: "none", borderRadius: 10, padding: "11px 20px", fontWeight: 700, cursor: "pointer" }}>Back to the demo</button>
          </div>
        ) : (
          <>
            <span style={{ display: "inline-flex", width: 46, height: 46, borderRadius: 12, background: (premium ? T.gold : T.green) + "22", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Icon name={premium ? "crown" : "sparkles"} size={22} color={premium ? T.gold : T.green} />
            </span>
            <h3 style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {premium ? `Get ${plan.name}` : "Create your free account"}
            </h3>
            <p style={{ fontSize: 13.5, color: T.muted, margin: "0 0 20px", lineHeight: 1.5 }}>{reason || "Save your portfolios, analyze your own holdings, and unlock the full healthcheck."}</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email"
              style={{ width: "100%", background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 10, padding: "13px 14px", color: T.ink, fontFamily: body, fontSize: 14, outline: "none", marginBottom: 12 }} />
            <button onClick={() => setDone(true)} className="hc-btnPrimary" style={{ width: "100%", background: premium ? T.gold : T.green, color: T.bg, border: "none", borderRadius: 11, padding: "13px", fontFamily: body, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
              {premium ? `Get ${plan.name} — $${plan.price}${plan.period}` : "Get started free"}
            </button>
            <div style={{ fontSize: 11.5, color: T.faint, textAlign: "center", marginTop: 12 }}>{premium ? "Cancel anytime" : "No card required · upgrade whenever you like"}</div>
          </>
        )}
      </div>
    </div>
  );
}

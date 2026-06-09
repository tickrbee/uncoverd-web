/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const ACCENT = "#15b87f";
const SECTORS = ["Technology", "Healthcare", "Financial Services", "Consumer Cyclical", "Consumer Defensive", "Industrials", "Energy", "Utilities", "Real Estate", "Communication Services", "Basic Materials"];
const RISKS = [["low", "Conservative", "Lower swings, larger caps"], ["balanced", "Balanced", "A middle path"], ["high", "Aggressive", "More risk for more return"]];
const STYLES = [["income", "Income", "Higher dividend yield"], ["balanced", "Balanced", "Income + growth"], ["growth", "Growth", "Capital appreciation"]];

type Holding = { symbol: string; name: string | null; sector: string | null; grade: string | null; weight: number; dollars: number; yield: number | null };
type Result = { amount: number; holdings: Holding[]; grade: string | null; score: number | null; projected: { ret: number; vol: number; sharpe: number }; yield: number | null; picks: { symbol: string; name: string | null; type: string; sector: string | null }[] };

const gradeColor = (g: string | null) => (!g ? "var(--text-muted)" : g.startsWith("A") ? ACCENT : g.startsWith("B") ? "#e0b34e" : "#e0556b");
const fmt$ = (n: number) => "$" + n.toLocaleString("en-US");

export function PortfolioGenerator() {
  const router = useRouter();
  const [amount, setAmount] = React.useState(100000);
  const [risk, setRisk] = React.useState("balanced");
  const [style, setStyle] = React.useState("balanced");
  const [sectors, setSectors] = React.useState<string[]>([]);
  const [count, setCount] = React.useState(10);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [res, setRes] = React.useState<Result | null>(null);
  const [isPremium, setIsPremium] = React.useState(false);

  // Detect Pro so the generated holdings are revealed for paying users and
  // blurred (teased) for everyone else.
  React.useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase.from("user_profiles").select("subscription_tier").eq("id", session.user.id).maybeSingle<{ subscription_tier: string | null }>();
        if (profile && (profile.subscription_tier === "plus" || profile.subscription_tier === "gold")) setIsPremium(true);
      } catch { /* free chrome */ }
    })();
  }, []);

  const toggleSector = (s: string) => setSectors((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function generate() {
    if (busy) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/portfolio/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, risk, style, sectors, count }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not generate a portfolio."); }
      else { setRes(d); setTimeout(() => document.getElementById("gen-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }
    } catch { setErr("Something went wrong. Try again."); }
    setBusy(false);
  }

  function openInHealthcheck() {
    if (!res) return;
    try { sessionStorage.setItem("hc-seed-picks", JSON.stringify({ picks: res.picks, name: `Generated ${style} portfolio`, ts: Date.now() })); } catch { /* ignore */ }
    router.push("/tools/portfolio-healthcheck");
  }

  const Seg = ({ opts, val, set }: { opts: string[][]; val: string; set: (v: string) => void }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${opts.length}, 1fr)`, gap: 8 }}>
      {opts.map(([v, label, sub]) => {
        const on = val === v;
        return (
          <button key={v} onClick={() => set(v)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1px solid ${on ? ACCENT : "var(--border-subtle, #2a3a50)"}`, background: on ? `${ACCENT}14` : "transparent", cursor: "pointer", color: "var(--text, #e8eef6)" }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: on ? ACCENT : "var(--text)" }}>{label}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="dv-page">
      <section className="dv-section" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto", paddingTop: 12 }}>
        <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT, marginBottom: 12 }}>Tools</div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px", lineHeight: 1.12 }}>Portfolio generator</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.02rem", lineHeight: 1.6, margin: "0 auto", maxWidth: 540 }}>
          Answer a few questions and we'll build a diversified, top-rated portfolio — optimised for the best risk-adjusted return and sized to your amount.
        </p>
      </section>

      {/* Questionnaire */}
      <section className="dv-section" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ border: "1px solid var(--border-subtle, #2a3a50)", borderRadius: 16, padding: "24px 22px", display: "grid", gap: 22, background: "var(--surface, rgba(255,255,255,0.02))" }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: "0.92rem", display: "block", marginBottom: 8 }}>How much do you want to invest?</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-subtle, #2a3a50)", borderRadius: 12, padding: "0 14px", maxWidth: 260 }}>
              <span style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>$</span>
              <input type="number" min={1000} step={1000} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} style={{ border: "none", background: "transparent", color: "var(--text)", fontSize: "1.1rem", padding: "12px 0", outline: "none", width: "100%" }} />
            </div>
          </div>
          <div><label style={{ fontWeight: 700, fontSize: "0.92rem", display: "block", marginBottom: 8 }}>Risk tolerance</label><Seg opts={RISKS} val={risk} set={setRisk} /></div>
          <div><label style={{ fontWeight: 700, fontSize: "0.92rem", display: "block", marginBottom: 8 }}>What matters more?</label><Seg opts={STYLES} val={style} set={setStyle} /></div>
          <div>
            <label style={{ fontWeight: 700, fontSize: "0.92rem", display: "block", marginBottom: 8 }}>Favour any sectors? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional — leave blank for all)</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SECTORS.map((s) => {
                const on = sectors.includes(s);
                return <button key={s} onClick={() => toggleSector(s)} style={{ padding: "6px 12px", borderRadius: 18, border: `1px solid ${on ? ACCENT : "var(--border-subtle, #2a3a50)"}`, background: on ? ACCENT : "transparent", color: on ? "#04140d" : "var(--text-muted)", fontWeight: on ? 700 : 500, fontSize: "0.82rem", cursor: "pointer" }}>{s}</button>;
              })}
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: "0.92rem", display: "block", marginBottom: 8 }}>Number of holdings: <span style={{ color: ACCENT }}>{count}</span></label>
            <input type="range" min={6} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: ACCENT }} />
          </div>
          {err && <div style={{ color: "#e0556b", fontSize: "0.9rem" }}>{err}</div>}
          <button onClick={generate} disabled={busy} className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 800, fontSize: "1.02rem", padding: "14px", borderRadius: 12, cursor: busy ? "default" : "pointer" }}>
            {busy ? "Building your portfolio…" : "Generate my portfolio →"}
          </button>
        </div>
      </section>

      {/* Result */}
      {res && (
        <section className="dv-section" id="gen-result" style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ border: `1px solid ${ACCENT}44`, borderRadius: 16, padding: "22px 22px 8px", background: `linear-gradient(180deg, ${ACCENT}0e, transparent)` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT }}>Your generated portfolio</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: 4 }}>{fmt$(res.amount)} · {res.holdings.length} holdings</div>
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                <Stat label="Health grade" value={res.grade || "—"} color={gradeColor(res.grade)} />
                <Stat label="Sharpe" value={res.projected.sharpe.toFixed(2)} />
                <Stat label="Volatility" value={`${res.projected.vol.toFixed(1)}%`} />
                {res.yield != null && <Stat label="Yield" value={`${res.yield.toFixed(1)}%`} />}
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ overflowX: "auto", filter: isPremium ? "none" : "blur(7px)", pointerEvents: isPremium ? "auto" : "none", userSelect: isPremium ? "auto" : "none", transition: "filter .2s" }} aria-hidden={!isPremium}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", minWidth: 560 }}>
                <thead>
                  <tr style={{ color: "var(--text-muted)", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    <th style={{ padding: "8px 10px" }}>Ticker</th><th style={{ padding: "8px 10px" }}>Name</th><th style={{ padding: "8px 10px" }}>Sector</th>
                    <th style={{ padding: "8px 10px" }}>Rating</th><th style={{ padding: "8px 10px", textAlign: "right" }}>Weight</th><th style={{ padding: "8px 10px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {res.holdings.map((h) => (
                    <tr key={h.symbol} style={{ borderTop: "1px solid var(--border-subtle, #2a3a50)" }}>
                      <td style={{ padding: "10px", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>{h.symbol}</td>
                      <td style={{ padding: "10px", color: "var(--text-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</td>
                      <td style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.82rem" }}>{h.sector}</td>
                      <td style={{ padding: "10px", fontWeight: 700, color: gradeColor(h.grade) }}>{h.grade || "—"}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>{h.weight.toFixed(1)}%</td>
                      <td style={{ padding: "10px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: ACCENT }}>{fmt$(h.dollars)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {!isPremium && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12, padding: 20 }}>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>🔒 The {res.holdings.length} holdings are part of Pro</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: 430 }}>Your generated portfolio scores <b style={{ color: gradeColor(res.grade) }}>{res.grade || "—"}</b> — unlock to see every holding and its exact dollar sizing.</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                    <a href="/join" className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 700 }}>Get Pro to reveal →</a>
                    <a href="/signup?next=%2Ftools%2Fportfolio-generator" className="btn btn--ghost">Create free account</a>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "18px 4px 14px" }}>
              <button onClick={openInHealthcheck} className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 700, opacity: isPremium ? 1 : 0.6 }}>Open in Portfolio Healthcheck →</button>
              <button onClick={generate} className="btn btn--ghost">Regenerate</button>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 12 }}>Educational research, not investment advice. Weights come from a mean-variance optimisation on ~1 year of returns; expected returns are noisy. Do your own research before investing.</p>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: color || "var(--text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";

const ACCENT = "#15b87f";

const VALUE_PROPS: { t: string; b: string }[] = [
  { t: "A–F rating on every stock", b: "Unlimited composite ratings across Value, Growth, Profitability, Momentum & Health on 65,000+ tickers — standardised against industry peers." },
  { t: "Portfolio Healthcheck", b: "Grade your portfolio's real risk, optimise position sizing, cut drawdowns, and benchmark it against the S&P 500 — see exactly how to improve before you trade." },
  { t: "Alternatives finder", b: "Hand any stock or ETF and get better-rated swaps — find investment ideas that fit your preferences in seconds." },
  { t: "Best-of lists", b: "This month's #1 pick, best dividend stocks, best monthly payers and sector leaders — ranked by the model, refreshed continuously." },
  { t: "Model portfolios", b: "Ready-built High-Yield, Growth and Protection baskets constructed from the ratings — start from a vetted shortlist, not a blank screener." },
  { t: "Built to benchmark", b: "Compare any two stocks side by side, export any list to CSV for your own models, and browse the entire site ad-free." },
];

// Real list prices of comparable research services (annual). uncoverd is the cheap one.
const COMPETITORS: { name: string; price: string }[] = [
  { name: "Morningstar Investor", price: "$249 / yr" },
  { name: "Seeking Alpha Premium", price: "$299 / yr" },
  { name: "Zacks Premium", price: "$249 / yr" },
  { name: "MarketBeat All Access", price: "$399 / yr" },
];

export function JoinOffer() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push(`/signup?next=${encodeURIComponent("/join")}`); return; }
      const res = await fetch(`${getSupabaseUrl()}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "plus" }),
      });
      const payload = await res.json();
      if (payload?.url) { window.location.assign(payload.url); return; }
    } catch { /* fall through */ }
    setBusy(false);
  }

  const CtaButtons = () => (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      <button onClick={startCheckout} disabled={busy} className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 800, fontSize: "1.02rem", padding: "13px 26px", cursor: busy ? "default" : "pointer" }}>
        {busy ? "Redirecting…" : "Get Pro — $100 / year"}
      </button>
      <Link href="/signup?next=%2Fjoin" className="btn btn--ghost">Start with a free account</Link>
    </div>
  );

  return (
    <main className="dv-page">
      {/* Hero / offer */}
      <section className="dv-section" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto", paddingTop: 16 }}>
        <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT, marginBottom: 14 }}>
          uncoverd Pro
        </div>
        <h1 style={{ fontSize: "clamp(1.9rem, 4.5vw, 2.7rem)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 14px", lineHeight: 1.1 }}>
          Everything you need to pick better dividend stocks
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.6, margin: "0 auto 22px", maxWidth: 560 }}>
          Ratings on every stock, a portfolio tool that tells you exactly how to cut risk, an idea finder, and the monthly top picks — one flat price.
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "center", marginBottom: 8 }}>
          <span style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.03em" }}>$100</span>
          <span style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>/ year</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem", color: ACCENT, marginBottom: 22 }}>≈ $8.33 / month · cancel anytime</div>
        <CtaButtons />
      </section>

      {/* Value props */}
      <section className="dv-section" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 className="dv-section__title" style={{ textAlign: "center", marginBottom: 6 }}>What you unlock</h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: 22, fontSize: "0.95rem" }}>Increase returns and reduce risk — with the tools, not guesswork.</p>
        <div className="join-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {VALUE_PROPS.map((v, i) => (
            <div key={i} style={{ border: "1px solid var(--border-subtle, #2a3a50)", borderRadius: 14, padding: 20, background: "var(--surface, rgba(255,255,255,0.02))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>{v.t}</span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.55, margin: 0 }}>{v.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="dv-section" style={{ maxWidth: 820, margin: "0 auto" }}>
        <h2 className="dv-section__title" style={{ textAlign: "center", marginBottom: 6 }}>The most research for the least money</h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: 22, fontSize: "0.95rem" }}>Comparable investing-research services, at their annual list prices.</p>
        <div style={{ border: "1px solid var(--border-subtle, #2a3a50)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: `${ACCENT}14`, borderBottom: `1px solid ${ACCENT}44` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: ACCENT, color: "#04140d", fontWeight: 800, fontSize: "0.72rem", padding: "3px 9px", borderRadius: 20 }}>BEST VALUE</span>
              <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>uncoverd Pro</span>
            </div>
            <span style={{ fontWeight: 800, color: ACCENT, fontSize: "1.05rem" }}>$100 / yr</span>
          </div>
          {COMPETITORS.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: i < COMPETITORS.length - 1 ? "1px solid var(--border-subtle, #2a3a50)" : "none" }}>
              <span style={{ color: "var(--text-muted)" }}>{c.name}</span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>{c.price}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 14, fontSize: "0.82rem" }}>Prices are each service's standard annual list price and may vary. uncoverd Pro is a flat $100/year — no tiers or add-ons.</p>
      </section>

      {/* Credibility band (honest, no fabricated performance) */}
      <section className="dv-section" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ border: "1px solid var(--border-subtle, #2a3a50)", borderRadius: 16, padding: "26px 24px", background: "var(--surface, rgba(255,255,255,0.02))" }}>
          <div className="join-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, textAlign: "center" }}>
            <div><div style={{ fontSize: "1.6rem", fontWeight: 800, color: ACCENT }}>5</div><div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>pillars per rating — Value, Growth, Profitability, Momentum, Health</div></div>
            <div><div style={{ fontSize: "1.6rem", fontWeight: 800, color: ACCENT }}>65,000+</div><div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>stocks & ETFs rated, standardised against industry peers</div></div>
            <div><div style={{ fontSize: "1.6rem", fontWeight: 800, color: ACCENT }}>Daily</div><div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>recompute on fresh data — built on SEC filings, not opinions</div></div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="dv-section" style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div style={{ border: `1px solid ${ACCENT}44`, borderRadius: 18, padding: "32px 24px", background: `linear-gradient(135deg, ${ACCENT}14, transparent 70%)` }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 8px" }}>Start finding safer, higher-returning dividends</h2>
          <p style={{ color: "var(--text-muted)", margin: "0 auto 22px", maxWidth: 520 }}>One flat price, everything included, cancel whenever you like.</p>
          <CtaButtons />
          <div style={{ marginTop: 16 }}>
            <Link href="/best-stocks" style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>Just show me this month's ranking →</Link>
          </div>
        </div>
        <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>Educational research, not investment advice. Cancel anytime; we never sell your data.</p>
      </section>
    </main>
  );
}

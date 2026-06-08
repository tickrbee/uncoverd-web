/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";
import { T, display, body, mono, HERO_GRAD, Icon } from "@/components/healthcheck/theme";

const PLAN_FREE = {
  name: "Free", price: "$0", sub: "forever", tagline: "Browse the basics",
  points: ["Stock & ETF screener (basic filters)", "Ex-dividend calendar", "Standard dividend news feed", "Stock profiles & full dividend history"],
};
const PLAN_PRO = {
  name: "Pro", price: "$100", sub: "/ year", tagline: "Everything uncoverd, one flat price",
  points: [
    "A–F dividend rating on every stock", "All model portfolios — High-Yield, Growth & Protection",
    "Best monthly payers, sector & dividend-capture lists", "Payout estimator & compounding calculator",
    "Dividend watchlist with alerts", "Upcoming increases, cuts, initiations & specials",
    "CSV downloads for spreadsheets", "Completely ad-free browsing",
  ],
};

const UNLOCKS = [
  { icon: "bars", title: "A rating on every stock", body: "An A–F dividend score for all 65,000+ tickers — Value, Growth, Profitability, Momentum and Health, each standardised against industry peers so the grade actually means something." },
  { icon: "grid", title: "Model portfolios", body: "Ready-built High-Yield, Growth and Protection baskets, constructed from our ratings — so you start from a vetted shortlist, not a blank screener." },
  { icon: "sparkles", title: "Curated best-of lists", body: "The best monthly payers, the best in each sector, and the best dividend-capture candidates — screened and ranked, not just sorted by yield." },
  { icon: "alert", title: "Never miss a change", body: "Upcoming increases, cuts, initiations and special dividends — see who's about to raise (or slash) the payout before the market reprices it." },
  { icon: "percent", title: "Income tools", body: "A payout estimator and compounding calculator to project real income over time, plus a watchlist that alerts you on the names you follow." },
  { icon: "send", title: "Your data, exportable", body: "Download any list or screen to CSV for your own spreadsheets and models — and browse the entire site completely ad-free." },
];

const COMPARE = [
  { group: "Research & data", rows: [
    { f: "Stock & ETF screener", free: "Basic filters", prem: "Advanced filters" },
    { f: "Ex-dividend calendar", free: true, prem: true },
    { f: "Dividend news feed", free: true, prem: "In-depth + research" },
    { f: "Stock profiles & full dividend history", free: true, prem: true },
  ] },
  { group: "Pro intelligence", rows: [
    { f: "A–F dividend rating on every stock", free: false, prem: true },
    { f: "Model portfolios (HY · Growth · Protection)", free: false, prem: true },
    { f: "Curated best-of & dividend-capture lists", free: false, prem: true },
    { f: "Upcoming increases, cuts & specials", free: false, prem: true },
  ] },
  { group: "Tools & exports", rows: [
    { f: "Payout estimator & compounding calculator", free: false, prem: true },
    { f: "Watchlist with dividend alerts", free: false, prem: true },
    { f: "CSV / spreadsheet downloads", free: false, prem: true },
    { f: "Ad-free experience", free: false, prem: true },
  ] },
];

const FAQS = [
  { q: "How much is Pro?", a: "Pro is $100 per year — about $8.33 a month — billed once annually. One flat price unlocks everything: ratings, model portfolios, curated lists, income tools, alerts, CSV exports and ad-free browsing. There are no add-ons or tiers." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel in one click from your account and you'll keep Pro until the end of the period you've already paid for. No phone calls, no retention hoops." },
  { q: "What stays free?", a: "The screener with basic filters, the ex-dividend calendar, the standard news feed, and full stock profiles with dividend history all stay free, forever. Pro adds the ratings, portfolios, tools and exports on top." },
  { q: "How do payments work?", a: "Checkout is handled securely by Stripe and access is instant — you're in the moment you pay. We never see or store your card details, and we never sell your data." },
  { q: "How is this different from other dividend sites?", a: "Most sites stop at a yield number. We put a standardised A–F rating on every stock, build model portfolios from those ratings, and flag dividend changes before they're priced in — research and decisions, not just data tables." },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.pr-root *{box-sizing:border-box}
.pr-faqBtn:hover span{color:#eef2f7}
.pr-cmpRow:hover{background:rgba(20,29,43,0.5)}
.pr-link:hover{filter:brightness(1.1)}
@media (max-width:880px){ .pr-plans,.pr-unlocks{grid-template-columns:1fr !important} }
@media (max-width:680px){
  .pr-root{padding-left:0;padding-right:0}
  .pr-hero{padding:34px 22px !important}
  .pr-hero h1{font-size:34px !important;line-height:1.08 !important}
  .pr-hero p{font-size:15px !important}
}
@media (max-width:620px){ .pr-cmp-grid{grid-template-columns:1.4fr 0.8fr 0.8fr !important} .pr-cmp-grid > div{padding-left:12px !important;padding-right:8px !important} }
`;

export function PricingRedesign() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(0);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push(`/login?next=${encodeURIComponent("/pricing")}`); return; }
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

  const Cell = ({ v, prem }: any) => {
    if (v === true) return <Icon name="check" size={17} color={prem ? T.green : T.muted} />;
    if (v === false) return <span style={{ color: T.line2, fontSize: 16 }}>—</span>;
    return <span style={{ fontSize: 12.5, color: prem ? T.green : T.muted, fontWeight: prem ? 600 : 400, fontFamily: body }}>{v}</span>;
  };

  const PlanCard = ({ plan, featured }: any) => (
    <div style={{ position: "relative", background: featured ? "linear-gradient(180deg, #11202f 0%, #0d1722 100%)" : T.panel, border: `1px solid ${featured ? T.green : T.line}`, borderRadius: 20, padding: featured ? "34px 32px" : "34px 30px", display: "flex", flexDirection: "column", boxShadow: featured ? `0 0 0 1px ${T.green}, 0 30px 70px -28px ${T.green}55` : "none" }}>
      {featured && <span style={{ position: "absolute", top: -12, left: 32, background: T.green, color: T.bg, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", borderRadius: 20, padding: "5px 13px" }}>EVERYTHING INCLUDED</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
        {featured && <Icon name="crown" size={17} color={T.green} />}
        <span style={{ fontFamily: display, fontSize: 19, fontWeight: 800, color: T.ink }}>{plan.name}</span>
      </div>
      <div style={{ fontSize: 13.5, color: T.muted, marginBottom: 20 }}>{plan.tagline}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: display, fontSize: 46, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>{plan.price}</span>
        <span style={{ fontSize: 15, color: T.faint }}>{plan.sub}</span>
      </div>
      <div style={{ fontSize: 12.5, color: featured ? T.green : T.faint, marginBottom: 24, fontFamily: mono }}>{featured ? "≈ $8.33 / month · billed yearly" : "no card required"}</div>
      {featured ? (
        <button onClick={startCheckout} disabled={busy} className="pr-link" style={{ textAlign: "center", background: T.green, color: T.bg, border: `1px solid ${T.green}`, borderRadius: 12, padding: "13px", fontFamily: body, fontSize: 14.5, fontWeight: 700, marginBottom: 26, cursor: busy ? "default" : "pointer" }}>{busy ? "Redirecting…" : "Get Pro"}</button>
      ) : (
        <Link href="/screener" className="pr-link" style={{ textDecoration: "none", textAlign: "center", background: "transparent", color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 12, padding: "13px", fontFamily: body, fontSize: 14.5, fontWeight: 700, marginBottom: 26 }}>Keep browsing free</Link>
      )}
      <div style={{ display: "grid", gap: 13 }}>
        {plan.points.map((pt: string, i: number) => (
          <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 13.5, color: featured ? T.ink : T.muted, lineHeight: 1.45 }}>
            <Icon name="check" size={16} color={featured ? T.green : T.faint} style={{ flexShrink: 0, marginTop: 1 }} /> {pt}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pr-root" style={{ background: `radial-gradient(120% 70% at 50% -8%, #0e1830 0%, rgba(14,24,48,0) 50%), ${T.bg}`, color: T.ink, fontFamily: body, paddingBottom: 40 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Hero */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div className="pr-hero" style={{ position: "relative", overflow: "hidden", background: HERO_GRAD, borderRadius: 24, padding: "56px 48px 52px", border: `1px solid ${T.indigo}55`, marginTop: 26 }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 90% at 88% -10%, rgba(255,255,255,0.12), transparent 58%)" }} />
          <div style={{ position: "relative", maxWidth: 720 }}>
            <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", marginBottom: 18 }}>Pricing</div>
            <h1 style={{ fontFamily: display, fontSize: 48, lineHeight: 1.05, fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.03em" }}>Every edge in dividend investing. One flat price.</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.84)", margin: "0 0 30px", maxWidth: 600 }}>
              A rating on every stock, model portfolios, curated best-of lists, dividend-capture picks, income tools and alerts — all included, all the time.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button onClick={startCheckout} disabled={busy} className="pr-link" style={{ display: "inline-flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", background: T.green, color: T.bg, border: "none", fontFamily: body, fontSize: 15.5, fontWeight: 700, borderRadius: 12, padding: "14px 24px", cursor: busy ? "default" : "pointer" }}>
                {busy ? "Redirecting…" : "Get Pro — $100 / year"} <Icon name="arrowRight" size={17} />
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: "#fff" }}>About $8.33 / month</span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>Cancel anytime · Secure checkout via Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px 0" }}>
        <div className="pr-plans" style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 20, maxWidth: 860, margin: "0 auto" }}>
          <PlanCard plan={PLAN_FREE} featured={false} />
          <PlanCard plan={PLAN_PRO} featured />
        </div>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 12.5, color: T.faint }}>Cancel anytime · Instant access · No data is sold, ever.</div>
      </div>

      {/* Unlocks */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "84px 24px 0" }}>
        <div style={{ marginBottom: 34 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>What Pro unlocks</div>
          <h2 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.025em", maxWidth: 620 }}>Research and decisions, not just data tables.</h2>
        </div>
        <div className="pr-unlocks" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {UNLOCKS.map((u, i) => (
            <div key={i} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: 24 }}>
              <span style={{ display: "flex", width: 40, height: 40, borderRadius: 11, background: T.green + "18", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon name={u.icon} size={19} color={T.green} />
              </span>
              <div style={{ fontFamily: display, fontSize: 16.5, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{u.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: T.muted }}>{u.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compare */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "84px 24px 0" }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>Free vs Pro</div>
          <h2 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.025em" }}>Exactly what you get.</h2>
        </div>
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 18, overflow: "hidden", background: T.panel }}>
          <div className="pr-cmp-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr", background: T.panel2, borderBottom: `1px solid ${T.line2}` }}>
            <div style={{ padding: "16px 22px", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>Feature</div>
            <div style={{ padding: "16px 18px", textAlign: "center", fontFamily: display, fontSize: 14, fontWeight: 700, color: T.muted }}>Free</div>
            <div style={{ padding: "16px 18px", textAlign: "center", fontFamily: display, fontSize: 14, fontWeight: 700, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: T.green + "0e" }}>
              <Icon name="crown" size={14} color={T.green} /> Pro
            </div>
          </div>
          {COMPARE.map((grp, gi) => (
            <div key={gi}>
              <div style={{ padding: "13px 22px 11px", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.green, background: T.bg, borderBottom: `1px solid ${T.line}`, borderTop: gi ? `1px solid ${T.line}` : "none" }}>{grp.group}</div>
              {grp.rows.map((r: any, ri: number) => (
                <div key={ri} className="pr-cmpRow pr-cmp-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr", borderBottom: ri < grp.rows.length - 1 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ padding: "15px 22px", fontSize: 13.5, color: T.ink }}>{r.f}</div>
                  <div style={{ padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "center" }}><Cell v={r.free} /></div>
                  <div style={{ padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "center", background: T.green + "0a" }}><Cell v={r.prem} prem /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "84px 24px 0" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>Pricing FAQ</div>
          <h2 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.025em" }}>Questions before you upgrade.</h2>
        </div>
        <div style={{ display: "grid", gap: 11 }}>
          {FAQS.map((item, i) => {
            const on = openFaq === i;
            return (
              <div key={i} style={{ background: T.panel, border: `1px solid ${on ? T.line2 : T.line}`, borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setOpenFaq(on ? -1 : i)} className="pr-faqBtn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "transparent", border: "none", cursor: "pointer", padding: "18px 22px", textAlign: "left" }}>
                  <span style={{ fontFamily: display, fontSize: 15.5, fontWeight: 700, color: T.ink }}>{item.q}</span>
                  <Icon name="plus" size={17} color={on ? T.green : T.muted} style={{ flexShrink: 0, transform: on ? "rotate(45deg)" : "none", transition: "transform .2s" }} />
                </button>
                {on && <div style={{ padding: "0 22px 20px", fontSize: 14, lineHeight: 1.65, color: T.muted, maxWidth: 660 }}>{item.a}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "84px 24px 0" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0f1c33 0%, #0c1422 70%)", border: `1px solid ${T.green}44`, borderRadius: 22, padding: "48px 44px", textAlign: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 120% at 50% -20%, rgba(47,227,160,0.12), transparent 60%)" }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontFamily: display, fontSize: 32, fontWeight: 800, color: T.ink, margin: "0 0 12px", letterSpacing: "-0.025em" }}>Start finding safer, higher-returning dividends today.</h2>
            <p style={{ fontSize: 15.5, color: T.muted, margin: "0 auto 26px", maxWidth: 520 }}>One flat price. Everything included. Cancel whenever you like.</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={startCheckout} disabled={busy} className="pr-link" style={{ display: "inline-flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", background: T.green, color: T.bg, border: "none", fontFamily: body, fontSize: 15.5, fontWeight: 700, borderRadius: 12, padding: "14px 26px", cursor: busy ? "default" : "pointer" }}>
                {busy ? "Redirecting…" : "Get Pro — $100 / year"} <Icon name="arrowRight" size={17} />
              </button>
              <Link href="/screener" style={{ textDecoration: "none", fontSize: 14, color: T.muted, fontWeight: 600 }}>Explore the free screener →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

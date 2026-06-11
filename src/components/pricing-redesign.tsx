/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, display, body, mono, HERO_GRAD, Icon } from "@/components/healthcheck/theme";
import { PRICING_STR, type PricingStr } from "@/components/pricing-strings";
import { useLocale } from "@/lib/use-locale";

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
  const t = PRICING_STR[useLocale()];
  const [busy, setBusy] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(0);

  // Single checkout entry — /go-pro handles auth (logged-out users are sent to
  // create an account first, then returned to checkout) and redirects to Stripe.
  function startCheckout() {
    if (busy) return;
    setBusy(true);
    router.push("/go-pro");
  }

  // Plain render helpers (not components) so parent state never resets.
  const renderCell = (v: boolean | string, prem?: boolean) => {
    if (v === true) return <Icon name="check" size={17} color={prem ? T.green : T.muted} />;
    if (v === false) return <span style={{ color: T.line2, fontSize: 16 }}>—</span>;
    return <span style={{ fontSize: 12.5, color: prem ? T.green : T.muted, fontWeight: prem ? 600 : 400, fontFamily: body }}>{v}</span>;
  };

  const renderPlanCard = (plan: PricingStr["planFree"] | PricingStr["planPro"], featured: boolean) => (
    <div style={{ position: "relative", background: featured ? "linear-gradient(180deg, #11202f 0%, #0d1722 100%)" : T.panel, border: `1px solid ${featured ? T.green : T.line}`, borderRadius: 20, padding: featured ? "34px 32px" : "34px 30px", display: "flex", flexDirection: "column", boxShadow: featured ? `0 0 0 1px ${T.green}, 0 30px 70px -28px ${T.green}55` : "none" }}>
      {featured && "badge" in plan && <span style={{ position: "absolute", top: -12, left: 32, background: T.green, color: T.bg, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", borderRadius: 20, padding: "5px 13px" }}>{plan.badge}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
        {featured && <Icon name="crown" size={17} color={T.green} />}
        <span style={{ fontFamily: display, fontSize: 19, fontWeight: 800, color: T.ink }}>{plan.name}</span>
      </div>
      <div style={{ fontSize: 13.5, color: T.muted, marginBottom: 20 }}>{plan.tagline}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: display, fontSize: 46, fontWeight: 800, color: T.ink, letterSpacing: "-0.03em" }}>{featured ? "$100" : "$0"}</span>
        <span style={{ fontSize: 15, color: T.faint }}>{plan.sub}</span>
      </div>
      <div style={{ fontSize: 12.5, color: featured ? T.green : T.faint, marginBottom: 24, fontFamily: mono }}>{plan.capNote}</div>
      {featured ? (
        <button onClick={startCheckout} disabled={busy} className="pr-link" style={{ textAlign: "center", background: T.green, color: T.bg, border: `1px solid ${T.green}`, borderRadius: 12, padding: "13px", fontFamily: body, fontSize: 14.5, fontWeight: 700, marginBottom: 26, cursor: busy ? "default" : "pointer" }}>{busy ? t.redirecting : plan.cta}</button>
      ) : (
        <Link href="/screener" className="pr-link" style={{ textDecoration: "none", textAlign: "center", background: "transparent", color: T.ink, border: `1px solid ${T.line2}`, borderRadius: 12, padding: "13px", fontFamily: body, fontSize: 14.5, fontWeight: 700, marginBottom: 26 }}>{plan.cta}</Link>
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
            <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", marginBottom: 18 }}>{t.heroKicker}</div>
            <h1 style={{ fontFamily: display, fontSize: 48, lineHeight: 1.05, fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.03em" }}>{t.heroTitle}</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.84)", margin: "0 0 30px", maxWidth: 600 }}>
              {t.heroSub}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button onClick={startCheckout} disabled={busy} className="pr-link" style={{ display: "inline-flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", background: T.green, color: T.bg, border: "none", fontFamily: body, fontSize: 15.5, fontWeight: 700, borderRadius: 12, padding: "14px 24px", cursor: busy ? "default" : "pointer" }}>
                {busy ? t.redirecting : t.heroCta} <Icon name="arrowRight" size={17} />
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: "#fff" }}>{t.heroMonthly}</span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>{t.heroCancel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px 0" }}>
        <div className="pr-plans" style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 20, maxWidth: 860, margin: "0 auto" }}>
          {renderPlanCard(t.planFree, false)}
          {renderPlanCard(t.planPro, true)}
        </div>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 12.5, color: T.faint }}>{t.plansFoot}</div>
      </div>

      {/* Unlocks */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "84px 24px 0" }}>
        <div style={{ marginBottom: 34 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>{t.unlocksKicker}</div>
          <h2 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.025em", maxWidth: 620 }}>{t.unlocksTitle}</h2>
        </div>
        <div className="pr-unlocks" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {t.unlocks.map((u, i) => (
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
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>{t.cmpKicker}</div>
          <h2 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.025em" }}>{t.cmpTitle}</h2>
        </div>
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 18, overflow: "hidden", background: T.panel }}>
          <div className="pr-cmp-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr", background: T.panel2, borderBottom: `1px solid ${T.line2}` }}>
            <div style={{ padding: "16px 22px", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>{t.cmpFeature}</div>
            <div style={{ padding: "16px 18px", textAlign: "center", fontFamily: display, fontSize: 14, fontWeight: 700, color: T.muted }}>{t.cmpFree}</div>
            <div style={{ padding: "16px 18px", textAlign: "center", fontFamily: display, fontSize: 14, fontWeight: 700, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: T.green + "0e" }}>
              <Icon name="crown" size={14} color={T.green} /> {t.cmpPro}
            </div>
          </div>
          {t.compare.map((grp, gi) => (
            <div key={gi}>
              <div style={{ padding: "13px 22px 11px", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.green, background: T.bg, borderBottom: `1px solid ${T.line}`, borderTop: gi ? `1px solid ${T.line}` : "none" }}>{grp.group}</div>
              {grp.rows.map((r, ri) => (
                <div key={ri} className="pr-cmpRow pr-cmp-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr", borderBottom: ri < grp.rows.length - 1 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ padding: "15px 22px", fontSize: 13.5, color: T.ink }}>{r.f}</div>
                  <div style={{ padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>{renderCell(r.free)}</div>
                  <div style={{ padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "center", background: T.green + "0a" }}>{renderCell(r.prem, true)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "84px 24px 0" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: T.green, marginBottom: 12 }}>{t.faqKicker}</div>
          <h2 style={{ fontFamily: display, fontSize: 34, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: "-0.025em" }}>{t.faqTitle}</h2>
        </div>
        <div style={{ display: "grid", gap: 11 }}>
          {t.faqs.map((item, i) => {
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
            <h2 style={{ fontFamily: display, fontSize: 32, fontWeight: 800, color: T.ink, margin: "0 0 12px", letterSpacing: "-0.025em" }}>{t.finalTitle}</h2>
            <p style={{ fontSize: 15.5, color: T.muted, margin: "0 auto 26px", maxWidth: 520 }}>{t.finalSub}</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={startCheckout} disabled={busy} className="pr-link" style={{ display: "inline-flex", alignItems: "center", gap: 9, whiteSpace: "nowrap", background: T.green, color: T.bg, border: "none", fontFamily: body, fontSize: 15.5, fontWeight: 700, borderRadius: 12, padding: "14px 26px", cursor: busy ? "default" : "pointer" }}>
                {busy ? t.redirecting : t.finalCta} <Icon name="arrowRight" size={17} />
              </button>
              <Link href="/screener" style={{ textDecoration: "none", fontSize: 14, color: T.muted, fontWeight: 600 }}>{t.finalLink}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

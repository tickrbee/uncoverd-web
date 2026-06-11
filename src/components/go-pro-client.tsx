"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { getAppUrl } from "@/lib/env";
import { useLocale } from "@/lib/use-locale";
import { GOPRO_STR, type GoProStr } from "@/components/go-pro-strings";

/* ============================== theme (self-contained, ported from prototype) ============================== */
const T = {
  bg: "#070b13", panel: "#0f1722", panel2: "#0c1420", raised: "#18222f",
  line: "#1b2738", line2: "#2a3a50", ink: "#eef2f7", muted: "#9fb0c3", faint: "#5d6b80",
  green: "#2fe3a0", red: "#e0556b", amber: "#f0b545",
};
const body = "'Manrope', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const display = body;

const NEXT = encodeURIComponent("/go-pro");
const CHECKOUT = "/api/go-pro/checkout";

const ICONS: Record<string, string> = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  google: '<path d="M21.35 11.1H12v3.2h5.35c-.25 1.5-1.6 4.4-5.35 4.4-3.2 0-5.85-2.65-5.85-5.9s2.65-5.9 5.85-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.65 3.95 14.55 3 12 3 6.95 3 3 7 3 12s3.95 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.05-1.05-.15-1.5z"/>',
  facebook: '<path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  twitter: '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
};
function Icon({ name, size = 16, color = "currentColor", style, strokeWidth = 2, fill = "none" as const }: { name: string; size?: number; color?: string; style?: React.CSSProperties; strokeWidth?: number; fill?: string }) {
  return React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill,
    stroke: fill === "none" ? color : "none", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    style, dangerouslySetInnerHTML: { __html: ICONS[name] || "" },
  });
}

const PLAN = { price: 100, unit: "/year", monthlyEq: "$8.33/mo" };
const money = (n: number) => "$" + n.toFixed(2);
const inputStyle: React.CSSProperties = {
  width: "100%", minWidth: 0, background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 11,
  padding: "12px 14px", color: T.ink, fontFamily: body, fontSize: 14.5, outline: "none",
};

/* ---------- bits ---------- */
function Panel({ children, pad = 24, style }: { children: React.ReactNode; pad?: number; style?: React.CSSProperties }) {
  return <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, ...style, padding: pad }}>{children}</div>;
}
function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: T.faint }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}
function PwInput({ id, value, onChange, placeholder, show, onToggle, error }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; show: boolean; onToggle: () => void; error?: boolean }) {
  return (
    <div style={{ position: "relative" }}>
      <input id={id} type={show ? "text" : "password"} value={value} placeholder={placeholder} autoComplete="new-password"
        onChange={(e) => onChange(e.target.value)} className="ckInput" style={{ ...inputStyle, paddingRight: 44, borderColor: error ? T.red : T.line2 }} />
      <button type="button" onClick={onToggle} aria-label="Toggle password visibility" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", padding: 8, display: "flex" }}>
        <Icon name={show ? "eyeOff" : "eye"} size={16} color={T.faint} />
      </button>
    </div>
  );
}
function PwMeter({ pw, labels }: { pw: string; labels: GoProStr["pwMeter"] }) {
  if (!pw) return null;
  const score = Math.min(4, (pw.length >= 6 ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0));
  const cols = [T.red, T.red, T.amber, T.green, T.green];
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? cols[score] : T.raised, transition: "background .2s" }} />)}
      </div>
      <div style={{ fontSize: 11, color: cols[score], marginTop: 5 }}>{labels[score]}</div>
    </div>
  );
}
function Stepper({ step, t }: { step: number; t: GoProStr }) {
  const steps: [string, string][] = [[t.stepAccount, "1"], [t.stepPayment, "2"]];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
      {steps.map(([lbl, n], i) => {
        const idx = i + 1, done = step > idx, active = step === idx;
        return (
          <React.Fragment key={lbl}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ display: "flex", width: 26, height: 26, borderRadius: "50%", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 12, fontWeight: 700, background: done || active ? T.green : T.raised, color: done || active ? T.bg : T.faint, border: `1px solid ${done || active ? T.green : T.line2}` }}>
                {done ? <Icon name="check" size={13} color={T.bg} /> : n}
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? T.ink : done ? T.muted : T.faint }}>{lbl}</span>
            </div>
            {i < steps.length - 1 && <span style={{ flex: 1, height: 1, background: T.line2, maxWidth: 50 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
function CkNav({ t }: { t: GoProStr }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,11,19,0.86)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, padding: "0 24px", height: 56 }}>
        <a href="/pricing" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.green, boxShadow: `0 0 10px ${T.green}` }} />
          <span style={{ fontFamily: display, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>uncoverd</span>
        </a>
        <div style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 11.5, color: T.muted }}>
          <Icon name="lock" size={13} color={T.green} /> {t.secure}
        </span>
        <a href="/pricing" className="navlink" style={{ fontSize: 13, color: T.faint, textDecoration: "none", marginLeft: 10 }}>{t.back}</a>
      </div>
    </header>
  );
}

/* ---------- account step ---------- */
function AccountStep({ email, password, confirm, setEmail, setPassword, setConfirm, onSubmit, onSso, t, nextEnc = NEXT }: {
  email: string; password: string; confirm: string;
  setEmail: (v: string) => void; setPassword: (v: string) => void; setConfirm: (v: string) => void;
  onSubmit: () => void; onSso: (p: string) => void; t: GoProStr; nextEnc?: string;
}) {
  const [showPw, setShowPw] = React.useState(false);
  const [err, setErr] = React.useState<{ email?: string; password?: string; confirm?: string }>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ne: { email?: string; password?: string; confirm?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ne.email = t.emailErr;
    if (password.length < 6) ne.password = t.pwErr;
    if (confirm !== password) ne.confirm = t.pw2Err;
    setErr(ne);
    if (!Object.keys(ne).length) onSubmit();
  };
  const sso: [string, string][] = [["google", "Google"], ["facebook", "Facebook"], ["linkedin_oidc", "LinkedIn"], ["twitter", "Twitter"]];
  const ssoIcon: Record<string, string> = { google: "google", facebook: "facebook", linkedin_oidc: "linkedin", twitter: "twitter" };
  return (
    <form onSubmit={submit} noValidate>
      <h1 style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: T.ink, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{t.acctTitle}</h1>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 24px", lineHeight: 1.5 }}>{t.acctSub}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {sso.map(([prov, lbl]) => (
          <button type="button" key={prov} className="ckSso" onClick={() => onSso(prov)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, background: T.raised, border: `1px solid ${T.line2}`, borderRadius: 11, padding: "11px", cursor: "pointer", color: T.ink, fontFamily: body, fontSize: 13.5, fontWeight: 600 }}>
            <Icon name={ssoIcon[prov]} size={16} color={T.ink} fill="currentColor" /> {lbl}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 18px" }}>
        <span style={{ flex: 1, height: 1, background: T.line }} />
        <span style={{ fontFamily: mono, fontSize: 10.5, color: T.faint, letterSpacing: "0.08em" }}>{t.orEmail}</span>
        <span style={{ flex: 1, height: 1, background: T.line }} />
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        <Field label={t.emailLabel} htmlFor="ck-email">
          <input id="ck-email" type="email" value={email} placeholder={t.emailPh} autoComplete="email" autoFocus
            onChange={(e) => setEmail(e.target.value)} className="ckInput" style={{ ...inputStyle, borderColor: err.email ? T.red : T.line2 }} />
          {err.email && <div style={{ fontSize: 11.5, color: T.red, marginTop: 6 }}>{err.email}</div>}
        </Field>
        <Field label={t.pwLabel} hint={t.pwHint} htmlFor="ck-pw">
          <PwInput id="ck-pw" value={password} onChange={setPassword} placeholder={t.pwPh} show={showPw} onToggle={() => setShowPw((s) => !s)} error={!!err.password} />
          {err.password ? <div style={{ fontSize: 11.5, color: T.red, marginTop: 6 }}>{err.password}</div> : <PwMeter pw={password} labels={t.pwMeter} />}
        </Field>
        <Field label={t.pw2Label} htmlFor="ck-pw2">
          <PwInput id="ck-pw2" value={confirm} onChange={setConfirm} placeholder={t.pw2Ph} show={showPw} onToggle={() => setShowPw((s) => !s)} error={!!err.confirm} />
          {err.confirm && <div style={{ fontSize: 11.5, color: T.red, marginTop: 6 }}>{err.confirm}</div>}
        </Field>
      </div>
      <button type="submit" className="ckPrimary" style={{ width: "100%", marginTop: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, background: T.green, color: T.bg, border: "none", borderRadius: 12, padding: "15px", fontFamily: body, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        {t.acctCta} <Icon name="arrowRight" size={17} color={T.bg} />
      </button>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: T.faint }}>
        {t.haveAccount} <a href={`/login?next=${nextEnc}`} style={{ color: T.green, fontWeight: 700, textDecoration: "none" }}>{t.signIn}</a>
      </div>
    </form>
  );
}

/* ---------- order summary ---------- */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 13, color: muted ? T.faint : T.muted }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 13, color: muted ? T.faint : T.ink, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
function OrderSummary({ promo, t }: { promo?: string; t: GoProStr }) {
  return (
    <div style={{ position: "sticky", top: 76 }}>
      <Panel pad={0} style={{ overflow: "hidden" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #11202f, #0d1722)", padding: "22px 24px 20px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 130% at 100% -10%, rgba(47,227,160,0.10), transparent 55%)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ display: "flex", width: 38, height: 38, borderRadius: 11, background: T.green + "1c", border: `1px solid ${T.green}44`, alignItems: "center", justifyContent: "center" }}>
              <Icon name="crown" size={19} color={T.green} />
            </span>
            <div>
              <div style={{ fontFamily: display, fontSize: 17, fontWeight: 800, color: T.ink }}>uncoverd Premium</div>
              <div style={{ fontSize: 12.5, color: T.muted }}>{t.productTagline}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px 22px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 13, background: T.green + "12", border: `1.5px solid ${T.green}`, borderRadius: 12, padding: "14px 15px", marginBottom: 20 }}>
            <span style={{ position: "absolute", top: -8, right: 12, background: T.green, color: T.bg, fontFamily: mono, fontSize: 8, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>{t.badge}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.green, marginBottom: 4 }}>{t.planLabel}</div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: T.faint }}>{t.planNote} · ≈ {PLAN.monthlyEq}</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontFamily: display, fontSize: 24, fontWeight: 800, color: T.ink }}>${PLAN.price}</span>
              <span style={{ fontSize: 12, color: T.faint }}>{PLAN.unit}</span>
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, marginBottom: 12 }}>{t.includedHead}</div>
          <div style={{ display: "grid", gap: 9, marginBottom: 20 }}>
            {t.included.map((f) => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: T.muted, lineHeight: 1.4 }}>
                <Icon name="check" size={15} color={T.green} style={{ flexShrink: 0, marginTop: 1 }} /> {f}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 16, display: "grid", gap: 9 }}>
            <Row label={t.rowAnnual} value={money(PLAN.price)} />
            <Row label={t.rowVat} value={t.rowVatVal} muted />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${T.line}`, paddingTop: 13, marginTop: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{t.total}</span>
              <span style={{ fontFamily: display, fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>{money(PLAN.price)}</span>
            </div>
            {promo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.green + "12", border: `1px dashed ${T.green}66`, borderRadius: 9, padding: "8px 11px", fontSize: 12, color: T.green, fontWeight: 600 }}>
                <Icon name="check" size={13} color={T.green} /> {t.promoApplied(promo.toUpperCase())}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.5 }}>{t.renews}</div>
            )}
          </div>
        </div>
      </Panel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        {([["lock", t.trust[0]], ["shield", t.trust[1]], ["repeat", t.trust[2]], ["zap", t.trust[3]]] as [string, string][]).map(([ic, lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 11, padding: "11px 12px" }}>
            <Icon name={ic} size={15} color={T.green} />
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CenterStatus({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: 460, textAlign: "center" }}>{children}</div>
    </div>
  );
}

/* ============================== app ============================== */
export function GoProClient({ signedInEmail }: { signedInEmail: string | null }) {
  const t = GOPRO_STR[useLocale()];
  const [phase, setPhase] = React.useState<"account" | "review" | "redirecting" | "error">(signedInEmail ? "review" : "account");
  const [msg, setMsg] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [formErr, setFormErr] = React.useState("");
  // Promo code from a shared link (/go-pro?promo=WARREN15) — pre-applied at
  // Stripe checkout and carried through the SSO/login round-trips.
  const [promo, setPromo] = React.useState("");

  // URL params are read in an effect (not a state initializer) so the SSR'd
  // HTML and first client render match — the setState here is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setFormErr(t.errCheckout);
    }
    const p = (params.get("promo") ?? "").trim();
    if (/^[A-Za-z0-9_-]{3,40}$/.test(p)) setPromo(p);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const nextPath = "/go-pro" + (promo ? `?promo=${encodeURIComponent(promo)}` : "");

  // Logged in → server reads the cookie session and starts checkout.
  async function continuePay() {
    setFormErr("");
    setPhase("redirecting"); setMsg(t.msgRedirect);
    try {
      const res = await fetch(CHECKOUT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(promo ? { promo } : {}) });
      const out = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (out.url) { window.location.href = out.url; return; }
      setFormErr(out.error === "not_authenticated" ? t.errSession : (out.error || t.errGeneric)); setPhase("review");
    } catch {
      setFormErr(t.errGeneric); setPhase("review");
    }
  }

  async function useAnotherAccount() {
    try {
      await Promise.race([
        fetch("/api/auth/signout", { method: "POST", cache: "no-store" }),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch { /* best-effort */ }
    window.location.href = nextPath;
  }

  // Social login. OAuth inherently signs the user in, then returns to /go-pro
  // (server detects them → Review & pay). Now that header/sign-out are
  // consistent, being logged in here is fine.
  async function sso(provider: string) {
    try {
      const supabase = createClient();
      const options: { redirectTo: string; queryParams?: Record<string, string> } = { redirectTo: getAppUrl() + "/auth/callback?next=" + encodeURIComponent(nextPath) };
      if (provider === "google") options.queryParams = { prompt: "select_account" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.auth.signInWithOAuth({ provider: provider as any, options });
    } catch {
      setFormErr(t.errSso);
    }
  }

  // Logged out → create an ALREADY-CONFIRMED account and start checkout WITHOUT
  // logging the buyer in (no cookie). They sign in themselves after paying.
  async function createAndPay() {
    setFormErr("");
    setPhase("redirecting"); setMsg(t.msgCreating);
    try {
      const res = await fetch(CHECKOUT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, ...(promo ? { promo } : {}) }),
      });
      const out = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (out.error === "account_exists") { setFormErr(t.errExists); setPhase("account"); return; }
      if (out.url) { setMsg(t.msgRedirect); window.location.href = out.url; return; }
      setFormErr(out.error || t.errGeneric); setPhase("account");
    } catch {
      setFormErr(t.errStart); setPhase("account");
    }
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.ink, fontFamily: body }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes ckSpin{to{transform:rotate(360deg)}}
        .ckInput::placeholder{color:${T.faint}}
        .ckInput:focus{border-color:${T.green} !important;box-shadow:0 0 0 3px rgba(47,227,160,.13)}
        .ckSso:hover{border-color:${T.line2};background:#1f2a3a}
        .ckPrimary{box-shadow:0 12px 30px -12px rgba(47,227,160,.55);transition:filter .15s}
        .ckPrimary:hover{filter:brightness(1.05)}
        .navlink:hover{color:${T.ink} !important}
        @media (max-width:880px){.ckGrid{grid-template-columns:1fr !important}.ckGrid>div:last-child>div{position:static !important}}
      ` }} />
      <CkNav t={t} />

      {phase === "account" || phase === "review" ? (
        <div className="ckGrid" style={{ maxWidth: 1080, margin: "0 auto", padding: "44px 24px 70px", display: "grid", gridTemplateColumns: "1fr 400px", gap: 30, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <Stepper step={phase === "review" ? 2 : 1} t={t} />
            <Panel pad={30}>
              {formErr && <div style={{ background: T.red + "14", border: `1px solid ${T.red}55`, color: T.red, borderRadius: 11, padding: "10px 13px", fontSize: 13, marginBottom: 18 }}>{formErr}</div>}
              {phase === "review" ? (
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.green + "14", border: `1px solid ${T.green}44`, borderRadius: 999, padding: "5px 12px", fontSize: 12, color: T.green, fontWeight: 700, marginBottom: 16 }}>
                    <Icon name="check" size={13} color={T.green} /> {t.signedIn}
                  </div>
                  <h1 style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: T.ink, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{t.reviewTitle}</h1>
                  <p style={{ fontSize: 14, color: T.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
                    {t.reviewPre}<b style={{ color: T.ink }}>{signedInEmail || "—"}</b>{t.reviewPost}
                  </p>
                  <button onClick={continuePay} className="ckPrimary" style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, background: T.green, color: T.bg, border: "none", borderRadius: 12, padding: "15px", fontFamily: body, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    <Icon name="lock" size={16} color={T.bg} /> {t.payCta}
                  </button>
                  <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: T.faint }}>
                    {t.notYou} <button onClick={useAnotherAccount} style={{ background: "transparent", border: "none", color: T.green, fontWeight: 700, cursor: "pointer", fontFamily: body, fontSize: 13, padding: 0 }}>{t.otherAccount}</button>
                  </div>
                </div>
              ) : (
                <AccountStep email={email} password={password} confirm={confirm} setEmail={setEmail} setPassword={setPassword} setConfirm={setConfirm} onSubmit={createAndPay} onSso={sso} t={t} nextEnc={encodeURIComponent(nextPath)} />
              )}
            </Panel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, fontSize: 11.5, color: T.faint }}>
              <Icon name="lock" size={13} color={T.faint} /> {t.stripeFoot}
            </div>
          </div>
          <OrderSummary promo={promo} t={t} />
        </div>
      ) : phase === "error" ? (
        <CenterStatus>
          <h1 style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: T.ink, margin: "0 0 10px" }}>{t.errTitle}</h1>
          <p style={{ color: T.muted, marginBottom: 22, fontSize: 14.5 }}>{msg}</p>
          <a href="/go-pro" className="ckPrimary" style={{ textDecoration: "none", background: T.green, color: T.bg, borderRadius: 12, padding: "12px 22px", fontWeight: 700 }}>{t.tryAgain}</a>
        </CenterStatus>
      ) : (
        <CenterStatus>
          <div style={{ width: 38, height: 38, border: `3px solid ${T.line2}`, borderTopColor: T.green, borderRadius: "50%", margin: "0 auto 18px", animation: "ckSpin 0.8s linear infinite" }} />
          <h1 style={{ fontFamily: display, fontSize: 20, fontWeight: 800, color: T.ink, margin: "0 0 8px" }}>{msg || t.msgRedirect}</h1>
          <p style={{ color: T.muted, fontSize: 14 }}>{t.redirectSub}</p>
        </CenterStatus>
      )}
    </div>
  );
}

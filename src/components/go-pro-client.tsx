"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl, getAppUrl } from "@/lib/env";

const ACCENT = "#15b87f";
const RED = "#e0556b";
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid var(--border-subtle, #2a3a50)",
  background: "var(--surface, rgba(255,255,255,0.03))", color: "var(--text, #e8eef6)", fontSize: "1rem", outline: "none",
};

// Single checkout entry. Logged-in → straight to Stripe. Logged-out → a clean,
// centered checkout-signup (email + password). On submit we create the account
// and, if the session is returned (email confirmation off), go straight to
// Stripe; otherwise we ask them to confirm their email (the link returns them
// here to continue). getSession() is timeout-guarded so the page never hangs.
export function GoProClient() {
  const [phase, setPhase] = React.useState<"checking" | "auth" | "working" | "confirm" | "error">("checking");
  const [msg, setMsg] = React.useState("Setting up your secure checkout…");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");

  const checkout = React.useCallback(async (token: string) => {
    setPhase("working"); setMsg("Redirecting to secure checkout…");
    try {
      const res = await fetch(getSupabaseUrl() + "/functions/v1/create-checkout-session", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "plus" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (payload?.url) { window.location.href = payload.url; return; }
      setPhase("error"); setMsg(payload?.error || "We couldn't start checkout. Please try again.");
    } catch {
      setPhase("error"); setMsg("We couldn't start checkout. Please try again.");
    }
  }, []);

  React.useEffect(() => {
    let done = false;
    (async () => {
      let token: string | null = null;
      try {
        const supabase = createClient();
        token = await Promise.race<string | null>([
          supabase.auth.getSession().then((r) => r?.data?.session?.access_token ?? null),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
      } catch { token = null; }
      if (done) return;
      if (token) checkout(token);
      else setPhase("auth");
    })();
    return () => { done = true; };
  }, [checkout]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr("Please enter a valid email."); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setPhase("working"); setMsg("Creating your account…");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: getAppUrl() + "/auth/callback?next=" + encodeURIComponent("/go-pro") },
      });
      if (error) {
        setPhase("auth");
        setErr(/already|registered|exists/i.test(error.message)
          ? "That email already has an account — sign in instead."
          : error.message);
        return;
      }
      const token = data.session?.access_token ?? null;
      if (token) { checkout(token); return; }   // confirmation off → straight to Stripe
      setPhase("confirm");                        // confirmation on → must verify email first
    } catch {
      setPhase("auth"); setErr("Something went wrong. Please try again.");
    }
  }

  const Spinner = () => (
    <>
      <div style={{ width: 38, height: 38, border: "3px solid var(--border-subtle, #2a3a50)", borderTopColor: ACCENT, borderRadius: "50%", margin: "0 auto 18px", animation: "goProSpin 0.8s linear infinite" }} />
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 8px" }}>{msg}</h1>
      <p style={{ color: "var(--text-muted)" }}>One moment — taking you to Stripe&apos;s secure checkout.</p>
      <style dangerouslySetInnerHTML={{ __html: "@keyframes goProSpin{to{transform:rotate(360deg)}}" }} />
    </>
  );

  return (
    <main className="dv-page">
      <div style={{ minHeight: "76vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 16px" }}>
        <div style={{ width: "min(430px, 100%)", textAlign: "center" }}>
          {(phase === "checking" || phase === "working") && <Spinner />}

          {phase === "auth" && (
            <div style={{ border: "1px solid var(--border-subtle, #2a3a50)", borderRadius: 18, padding: "30px 26px", background: "var(--surface, rgba(255,255,255,0.02))", textAlign: "left" }}>
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: ACCENT, marginBottom: 10, textAlign: "center" }}>Almost there</div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>Create your account</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", margin: "0 0 22px", textAlign: "center" }}>One step, then straight to secure checkout for <b style={{ color: "var(--text)" }}>uncoverd Pro — $100/yr</b>.</p>
              <form onSubmit={submit} style={{ display: "grid", gap: 13 }}>
                <div>
                  <label htmlFor="gp-email" style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>Email</label>
                  <input id="gp-email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="gp-pw" style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>Password</label>
                  <input id="gp-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (min. 6 characters)" minLength={6} style={inputStyle} />
                </div>
                {err && <div style={{ color: RED, fontSize: "0.85rem" }}>{err} {/already has an account/i.test(err) && <a href="/login?next=%2Fgo-pro" style={{ color: ACCENT, fontWeight: 700 }}>Sign in →</a>}</div>}
                <button type="submit" className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 800, fontSize: "1.02rem", padding: "13px", borderRadius: 12, cursor: "pointer", marginTop: 4 }}>
                  Continue to checkout →
                </button>
              </form>
              <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 14 }}>
                Already have an account? <a href="/login?next=%2Fgo-pro" style={{ color: ACCENT, fontWeight: 700 }}>Sign in</a>
              </p>
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 6 }}>Secure checkout via Stripe · cancel anytime · we never store your card.</p>
            </div>
          )}

          {phase === "confirm" && (
            <div style={{ border: `1px solid ${ACCENT}44`, borderRadius: 18, padding: "32px 26px", background: `${ACCENT}0e` }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>✉️</div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 8px" }}>Confirm your email</h1>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>We sent a confirmation link to <b style={{ color: "var(--text)" }}>{email}</b>. Click it and you&apos;ll land right back here to finish checkout.</p>
            </div>
          )}

          {phase === "error" && (
            <>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 10px" }}>Couldn&apos;t start checkout</h1>
              <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>{msg}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/go-pro" className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 700 }}>Try again</a>
                <a href="/pricing" className="btn btn--ghost">Back to pricing</a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

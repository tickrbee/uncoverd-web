"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";

const ACCENT = "#15b87f";

// Single checkout entry point. Logged-in → straight to Stripe. Logged-out →
// sent to create an account (with next=/go-pro), so after they sign up / sign in
// they land back here and continue to checkout automatically.
export function GoProClient() {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "error">("loading");
  const [msg, setMsg] = React.useState("Setting up your secure checkout…");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;
        if (!session) {
          router.replace("/signup?next=" + encodeURIComponent("/go-pro"));
          return;
        }
        setMsg("Redirecting to secure checkout…");
        const res = await fetch(getSupabaseUrl() + "/functions/v1/create-checkout-session", {
          method: "POST",
          headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ tier: "plus" }),
        });
        const payload = await res.json().catch(() => ({}));
        if (payload?.url) { window.location.href = payload.url; return; }
        if (alive) { setStatus("error"); setMsg(payload?.error || "We couldn't start checkout. Please try again."); }
      } catch {
        if (alive) { setStatus("error"); setMsg("We couldn't start checkout. Please try again."); }
      }
    })();
    return () => { alive = false; };
  }, [router]);

  return (
    <main className="dv-page">
      <section className="dv-section" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", paddingTop: 48, minHeight: "40vh" }}>
        {status === "loading" ? (
          <>
            <div style={{ width: 38, height: 38, border: "3px solid var(--border-subtle, #2a3a50)", borderTopColor: ACCENT, borderRadius: "50%", margin: "0 auto 18px", animation: "goProSpin 0.8s linear infinite" }} />
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 8px" }}>{msg}</h1>
            <p style={{ color: "var(--text-muted)" }}>One moment — taking you to Stripe's secure checkout.</p>
            <style dangerouslySetInnerHTML={{ __html: "@keyframes goProSpin{to{transform:rotate(360deg)}}" }} />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 10px" }}>Couldn't start checkout</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>{msg}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/go-pro" className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 700 }}>Try again</Link>
              <Link href="/pricing" className="btn btn--ghost">Back to pricing</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

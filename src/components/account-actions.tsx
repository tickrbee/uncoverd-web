"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";

export function AccountActions() {
  const [busy, setBusy] = useState<"idle" | "portal" | "logout">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function openPortal() {
    setBusy("portal");
    setError(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login?next=/account");
      setBusy("idle");
      return;
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/create-customer-portal-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ returnPath: "/account" }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.url) {
      setError(payload?.error ?? "Unable to open billing portal.");
      setBusy("idle");
      return;
    }

    window.location.assign(payload.url);
  }

  async function logout() {
    setBusy("logout");
    setError(null);

    const supabase = createClient();
    // Race signOut against a timeout so we never get stuck on "Signing out…"
    // when the server call hangs. After 3s we fall back to a local-only
    // signOut (scope: "local") that just clears the cookies/localStorage and
    // ships the user to /login.
    const signOutPromise = supabase.auth.signOut().catch((e) => ({ error: e as Error }));
    const timeout = new Promise<{ timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 3000),
    );
    const result = await Promise.race([signOutPromise, timeout]);

    if ("timedOut" in result) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    } else if ("error" in result && result.error) {
      // Network-level error — still try local scope, then redirect.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }

    // Hard navigation so the server component re-reads cookies and the header
    // picks up the cleared session.
    window.location.assign("/login");
  }

  return (
    <div className="account-actions">
      <button type="button" className="btn" onClick={openPortal} disabled={busy !== "idle"}>
        {busy === "portal" ? "Opening portal..." : "Manage billing"}
      </button>
      <button type="button" className="btn btn--ghost" onClick={logout} disabled={busy !== "idle"}>
        {busy === "logout" ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="notice notice--error">{error}</p> : null}
    </div>
  );
}

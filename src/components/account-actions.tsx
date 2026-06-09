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

    // Server-side sign-out reliably clears the session cookies — the browser
    // supabase client can't always read/write them, so a client-only signOut
    // could leave the user still logged in server-side. Then also clear any
    // local client state, and hard-navigate so the header re-reads via the
    // server (/api/auth/state).
    try { await fetch("/api/auth/signout", { method: "POST" }); } catch { /* best-effort */ }
    try { await createClient().auth.signOut({ scope: "local" }); } catch { /* best-effort */ }

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

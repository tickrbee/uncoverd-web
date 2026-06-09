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

    // Server-side sign-out clears the session cookies reliably. We deliberately
    // do NOT await the browser client's signOut() here — in production it can
    // hang on the auth lock, which BLOCKED the redirect below, so the session
    // only appeared cleared after the user manually navigated. The server route
    // + hard navigation are enough; the header re-reads auth from the server.
    // Cap the wait so a slow response can never leave the button stuck — the
    // server clears the cookies first, so it returns fast; this is just safety.
    try {
      await Promise.race([
        fetch("/api/auth/signout", { method: "POST", cache: "no-store" }),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch { /* best-effort */ }

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

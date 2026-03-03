"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getAppUrl } from "@/lib/env";

function sanitizeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/")) {
    return "/account";
  }

  return candidate;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    setNotice("Check your inbox for a secure login link.");
    setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
  }

  return (
    <section className="panel login-panel">
      <h1>Access your subscription account</h1>
      <p>Sign in with email or Google to manage your uncoverd mobile app subscription.</p>

      <button type="button" className="btn btn--ghost" onClick={signInWithGoogle} disabled={busy}>
        Continue with Google
      </button>

      <div className="divider" role="presentation">
        <span />
        <strong>or</strong>
        <span />
      </div>

      <form onSubmit={signInWithEmail} className="login-form">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />

        <button type="submit" className="btn" disabled={busy}>
          Send secure login link
        </button>
      </form>

      {notice ? <p className="notice notice--ok">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}
    </section>
  );
}

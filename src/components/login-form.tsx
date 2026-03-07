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

  async function requestPasswordReset(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/auth/password-reset`,
    });

    if (resetError) {
      setError(resetError.message);
      setBusy(false);
      return;
    }

    setNotice("Password reset email sent! Check your inbox for instructions.");
    setBusy(false);
  }

  async function signInWithOAuth(provider: "google" | "twitter" | "facebook" | "linkedin") {
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        ...(provider === "google" && {
          queryParams: {
            hd: "uncoverd.org",
            prompt: "select_account",
          },
        }),
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
      <p>
        Sign in with email or a social account to manage your uncoverd plan. uncoverd helps you evaluate opportunities
        with clearer risk context inside the mobile app.
      </p>

      <div className="oauth-buttons">
        <button
          type="button"
          className="btn btn--oauth btn--google"
          onClick={() => signInWithOAuth("google")}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          className="btn btn--oauth btn--x"
          onClick={() => signInWithOAuth("twitter")}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Continue with X
        </button>

        <button
          type="button"
          className="btn btn--oauth btn--facebook"
          onClick={() => signInWithOAuth("facebook")}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
        </button>

        <button
          type="button"
          className="btn btn--oauth btn--linkedin"
          onClick={() => signInWithOAuth("linkedin")}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="2"/>
            <path d="M8 9v8M8 7v.01M16 9v6a2 2 0 01-2 2h-2M12 9v8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          Continue with LinkedIn
        </button>
      </div>

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

      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.9rem" }}>
        <a
          href="#"
          onClick={requestPasswordReset}
          style={{ color: "var(--text-secondary)", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}}
        >
          Forgot your password?
        </a>
      </p>

      {notice ? <p className="notice notice--ok">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}
    </section>
  );
}

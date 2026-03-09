"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getAppUrl } from "@/lib/env";

function sanitizeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/")) {
    return "/account";
  }

  return candidate;
}

// Google icon component
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    // Success - redirect to next path or account
    router.push(nextPath);
    router.refresh();
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
      redirectTo: `${getAppUrl()}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setBusy(false);
      return;
    }

    setResetEmailSent(true);
    setNotice("Password reset email sent! Check your inbox for instructions.");
    setBusy(false);
  }

  async function signInWithOAuth(provider: "google" | "x" | "facebook" | "linkedin_oidc") {
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    const options: any = {
      redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    };

    if (provider === "google") {
      options.queryParams = {
        hd: "uncoverd.org",
        prompt: "select_account",
      };
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-bg-blur login-bg-blur--1"></div>
        <div className="login-bg-blur login-bg-blur--2"></div>
      </div>

      <div className="login-content">
        <div className="login-logo-section">
          <div className="login-logo-wrapper">
            <img 
              src="https://llbatqfycdppdcqrocqx.supabase.co/storage/v1/object/sign/logo/logo%20uncoverd.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MGMxMWYwNS1iODNlLTQzYjYtODczYi03MDU4ZmM2NmI1NDQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvL2xvZ28gdW5jb3ZlcmQucG5nIiwiaWF0IjoxNzcyNzIyMDA5LCJleHAiOjE4MzU3OTQwMDl9.x370GRxceBTNXku6gimQrd-sBC9W4N1zIOw6Fl3B4Ik"
              alt="uncoverd logo"
              className="login-logo"
            />
          </div>
          <div className="login-title-section">
            <h1 className="login-title">
              <span className="login-title-dot"></span>
              uncoverd
            </h1>
            <p className="login-subtitle">Discover hidden gems, one swipe at a time.</p>
          </div>
        </div>

        <div className="login-card">
          <h2 className="login-card-title">Sign In</h2>

          <form onSubmit={signInWithPassword} className="login-form">
            <div className="login-input-group">
              <label htmlFor="email" className="login-label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="login-input"
                required
              />
            </div>

            <div className="login-input-group">
              <label htmlFor="password" className="login-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="login-input"
                required
                minLength={6}
              />
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!busy) requestPasswordReset(e);
                }}
                className="login-forgot-link"
                style={{ opacity: busy ? 0.5 : 1, pointerEvents: busy ? "none" : "auto" }}
              >
                {resetEmailSent ? "Check your inbox!" : "Forgot password?"}
              </a>
            </div>

            <button type="submit" className="btn btn--primary login-submit" disabled={busy}>
              {busy ? "Signing in..." : "Enter uncoverd"}
            </button>
          </form>

          <div className="login-divider">
            <span></span>
            <strong>OR CONTINUE WITH</strong>
            <span></span>
          </div>

          <div className="login-oauth-grid">
            <button
              type="button"
              className="btn btn--oauth"
              onClick={() => signInWithOAuth("google")}
              disabled={busy}
              aria-label="Sign in with Google"
            >
              <GoogleIcon className="login-oauth-icon" />
            </button>
            <button
              type="button"
              className="btn btn--oauth"
              onClick={() => signInWithOAuth("facebook")}
              disabled={busy}
              aria-label="Sign in with Facebook"
            >
              <svg className="login-oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
              </svg>
            </button>
            <button
              type="button"
              className="btn btn--oauth"
              onClick={() => signInWithOAuth("linkedin_oidc")}
              disabled={busy}
              aria-label="Sign in with LinkedIn"
            >
              <svg className="login-oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
              </svg>
            </button>
            <button
              type="button"
              className="btn btn--oauth"
              onClick={() => signInWithOAuth("x")}
              disabled={busy}
              aria-label="Sign in with X"
            >
              <svg className="login-oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000000"/>
              </svg>
            </button>
          </div>

          <p className="login-signup-link">
            Don't have an account?{" "}
            <a href="/signup" className="login-signup-link-a">
              Sign up
            </a>
          </p>
        </div>

        {notice ? <p className="notice notice--ok">{notice}</p> : null}
        {error ? <p className="notice notice--error">{error}</p> : null}
      </div>
    </div>
  );
}

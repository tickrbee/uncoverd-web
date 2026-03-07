"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check if we have an access_token in the hash
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && type === "recovery") {
      setHasToken(true);
      // Exchange the token for a session
      const supabase = createClient();
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError("Invalid or expired password reset token. Please request a new password reset link.");
            setHasToken(false);
          }
        });
    } else {
      setError("Invalid or missing password reset token. Please request a new password reset link.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setBusy(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setBusy(false);
      return;
    }

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    setSuccess(true);
    setBusy(false);

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  if (!hasToken && !error) {
    return (
      <section className="panel login-panel">
        <div className="spinner" style={{ margin: "2rem auto" }}></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading...</p>
      </section>
    );
  }

  if (success) {
    return (
      <section className="panel login-panel">
        <h1>Password Reset Successful!</h1>
        <p className="notice notice--ok">Your password has been updated successfully. Redirecting to login...</p>
      </section>
    );
  }

  return (
    <section className="panel login-panel">
      <h1>Reset Your Password</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Enter your new password below. Make sure it's at least 6 characters long.
      </p>

      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="password">New Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter new password"
          required
          minLength={6}
        />

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          required
          minLength={6}
        />

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Updating..." : "Update Password"}
        </button>
      </form>

      {error ? <p className="notice notice--error">{error}</p> : null}
    </section>
  );
}


"use client";

import React from "react";
import { useRouter } from "next/navigation";

const ACCENT = "#15b87f";

// Low-friction email gate (Motley-Fool style). Captures the lead, then sends
// the visitor to the sales page (/join). Email is optional to the user's eye but
// it's the conversion hook; we never block them from continuing.
export function UnlockForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setErr("Please enter a valid email."); return; }
    setBusy(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: "unlock" }),
      });
    } catch { /* don't block the funnel on a capture error */ }
    router.push("/join");
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 440, margin: "0 auto", width: "100%" }}>
      <label htmlFor="lead-email" style={{ fontWeight: 700, textAlign: "left", fontSize: "0.92rem" }}>Enter your email address</label>
      <input
        id="lead-email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${err ? "#e0556b" : "var(--border-subtle, #2a3a50)"}`, background: "var(--surface, rgba(255,255,255,0.03))", color: "var(--text, #e8eef6)", fontSize: "1rem", outline: "none" }}
      />
      {err && <span style={{ color: "#e0556b", fontSize: "0.85rem", textAlign: "left" }}>{err}</span>}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "left" }}>
        <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
        Also send me the free weekly dividend digest — new ratings, ex-dates and ideas.
      </label>
      <button type="submit" disabled={busy} className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 800, fontSize: "1.02rem", padding: "14px", borderRadius: 12, cursor: busy ? "default" : "pointer", marginTop: 4 }}>
        {busy ? "One sec…" : "Continue →"}
      </button>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>No card required · Unsubscribe anytime · We never sell your data.</span>
    </form>
  );
}

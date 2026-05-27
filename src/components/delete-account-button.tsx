"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CONFIRM_PHRASE = "delete my account";

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performDelete() {
    if (phrase.trim().toLowerCase() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" to confirm.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data?.detail || data?.error || "Delete failed. Please try again.");
        setBusy(false);
        return;
      }
      // Hard refresh so all server components re-evaluate auth state.
      window.location.assign("/?account=deleted");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
    // Refresh below catches edge cases where the API succeeded but the JSON
    // parse failed for some reason.
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn"
        style={{
          background: "transparent",
          border: "1px solid var(--negative)",
          color: "var(--negative)",
        }}
        onClick={() => setOpen(true)}
      >
        Delete my account
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem", maxWidth: 480 }}>
      <p style={{ margin: 0, color: "var(--text-secondary)" }}>
        Type <strong style={{ color: "var(--negative)" }}>{CONFIRM_PHRASE}</strong> below to
        confirm.
      </p>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        className="login-input"
        autoComplete="off"
        disabled={busy}
      />
      {error && (
        <p style={{ color: "var(--negative)", margin: 0, fontSize: "0.85rem" }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setOpen(false);
            setPhrase("");
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: "var(--negative)", color: "white", borderColor: "var(--negative)" }}
          onClick={performDelete}
          disabled={busy}
        >
          {busy ? "Deleting…" : "Permanently delete"}
        </button>
      </div>
    </div>
  );
}

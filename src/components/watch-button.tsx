"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

let cachedSet: Set<string> | null = null;
let cachedLoggedIn: boolean | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function ensureLoaded(): Promise<void> {
  if (cachedSet !== null) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      if (!res.ok) {
        cachedSet = new Set();
        cachedLoggedIn = false;
        return;
      }
      const json = await res.json();
      cachedSet = new Set((json.symbols as string[]) ?? []);
      cachedLoggedIn = !!json.loggedIn;
    } catch {
      cachedSet = new Set();
      cachedLoggedIn = false;
    } finally {
      inflight = null;
      subscribers.forEach((fn) => fn());
    }
  })();
  return inflight;
}

function notifyAll() {
  subscribers.forEach((fn) => fn());
}

export function WatchButton({ symbol }: { symbol: string }) {
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const sym = symbol.toUpperCase();

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    subscribers.add(rerender);
    ensureLoaded().then(() => setTick((n) => n + 1));
    return () => {
      subscribers.delete(rerender);
    };
  }, []);

  const inList = cachedSet?.has(sym) ?? false;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (cachedLoggedIn === false) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    setBusy(true);
    try {
      const action = inList ? "remove" : "add";
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, action }),
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (res.status === 401 || json?.reason === "not-logged-in") {
        router.push("/login?next=" + encodeURIComponent(window.location.pathname));
        return;
      }
      if (json?.ok) {
        if (cachedSet) {
          if (action === "add") cachedSet.add(sym);
          else cachedSet.delete(sym);
        }
        notifyAll();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`dv-watch-btn ${inList ? "dv-watch-btn--on" : ""}`}
      aria-label={inList ? `Remove ${sym} from watchlist` : `Add ${sym} to watchlist`}
      title={inList ? "Remove from watchlist" : "Add to watchlist"}
      disabled={busy}
    >
      {inList ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

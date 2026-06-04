"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// Run the seed before paint on the client; fall back to useEffect during SSR so
// React doesn't warn about useLayoutEffect on the server.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const CACHE_KEY = "uncoverd:premium";

// Client hook for the per-user premium flag. Used by client components on
// statically cached pages that need to vary behaviour for paying users without
// the server reading the auth cookie (which would block CDN caching).
export function usePremiumStatus(): { isPremium: boolean; loading: boolean } {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  // Seed from a localStorage hint BEFORE the browser paints, so a returning
  // paying user doesn't get the "locked → unlocked" blur flash. First render is
  // `false` (matches the SSR HTML → no hydration mismatch); this layout effect
  // corrects it pre-paint. The flag is a UI hint only — the real premium data
  // still comes from server-gated APIs, so a forged value reveals nothing.
  useIsomorphicLayoutEffect(() => {
    try {
      if (window.localStorage.getItem(CACHE_KEY) === "1") setIsPremium(true);
    } catch {
      /* localStorage unavailable (private mode etc.) — fall back to the fetch */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/account/premium-status")
      .then((r) => r.json())
      .then((d: { isPremium?: boolean }) => {
        if (!alive) return;
        const v = !!d.isPremium;
        setIsPremium(v);
        try {
          window.localStorage.setItem(CACHE_KEY, v ? "1" : "0");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { isPremium, loading };
}

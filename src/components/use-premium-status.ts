"use client";

import { useEffect, useState } from "react";

// Client hook for the per-user premium flag. Used by client components on
// statically cached pages that need to vary behaviour for paying users without
// the server reading the auth cookie (which would block CDN caching).
export function usePremiumStatus(): { isPremium: boolean; loading: boolean } {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/account/premium-status")
      .then((r) => r.json())
      .then((d: { isPremium?: boolean }) => {
        if (alive) setIsPremium(!!d.isPremium);
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "uncoverd-cookie-ack-v1";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  // Read on mount so SSR doesn't flash the banner for users who already acked.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const acked = window.localStorage.getItem(STORAGE_KEY);
      if (!acked) setVisible(true);
    } catch {
      // Storage blocked — show the banner anyway so we comply with EU rules.
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore storage errors */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice">
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          We use only strictly-necessary cookies (sign-in session + your currency preference). No
          ads, no tracking pixels.{" "}
          <Link href="/legal/privacy" className="cookie-banner__link">
            Privacy Policy
          </Link>
          .
        </p>
        <button type="button" className="cookie-banner__btn" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { localeFromPath } from "@/lib/page-equivalents";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

// Client-side language preference. Read CLIENT-SIDE only (document.cookie) so we
// never opt header-bearing pages into dynamic server rendering — bots & the SSR
// pass see English (the canonical, cacheable HTML); real users get their chosen
// language applied on hydration. A URL locale prefix (/fr/…) always wins over
// the cookie so the SEO landing pages stay deterministic.
const COOKIE = "uncoverd_locale";
const EVENT = "uncoverd:localechange";

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)uncoverd_locale=([^;]+)/);
  const v = m?.[1];
  return v && isLocale(v) ? v : null;
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  // 1 year, site-wide, lax so normal navigations carry it.
  document.cookie = `${COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: locale }));
}

/**
 * Resolved UI locale: the URL prefix locale if present, otherwise the cookie
 * preference. Updates live when the cookie changes (same-page switch) without a
 * full reload. SSR/first paint returns the path locale (cookie unknown yet).
 */
export function useLocale(): Locale {
  const pathname = usePathname() || "/";
  const pathLocale = localeFromPath(pathname);
  const [locale, setLocale] = useState<Locale>(pathLocale);

  useEffect(() => {
    if (pathLocale !== DEFAULT_LOCALE) {
      setLocale(pathLocale);
      // Persist so moving from a /fr/ landing page to an app page (no prefix)
      // keeps the chosen language.
      if (readLocaleCookie() !== pathLocale) writeLocaleCookie(pathLocale);
      return;
    }
    setLocale(readLocaleCookie() ?? DEFAULT_LOCALE);
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Locale>).detail;
      setLocale(next ?? readLocaleCookie() ?? DEFAULT_LOCALE);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [pathLocale]);

  return locale;
}

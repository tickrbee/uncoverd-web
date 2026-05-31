// Internationalisation config for the localized content hubs.
//
// Strategy: English stays at the site root (uncoverd.org/...). Localized
// *content* (blog + language landing pages) lives under /fr, /de, /it, /es.
// We do NOT translate the 65k ticker pages or the app UI — the foreign
// keyword research is almost entirely content/calendar/list intent, so
// localized content + hreflang is what actually ranks in those markets.

export const DEFAULT_LOCALE = "en" as const;

// Content locales we publish localized pages for (English is the root default).
export const CONTENT_LOCALES = ["fr", "de", "it", "es"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

// Everything we might render content in (root English + the four above).
export const ALL_LOCALES = [DEFAULT_LOCALE, ...CONTENT_LOCALES] as const;
export type Locale = (typeof ALL_LOCALES)[number];

export function isContentLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

export function isLocale(value: string): value is Locale {
  return (ALL_LOCALES as readonly string[]).includes(value);
}

// `lang`/`hreflang` attribute values (BCP-47). Region-qualified where it helps
// SEO target the right market.
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  es: "Español",
};

// og:locale values.
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  es: "es_ES",
};

/** URL prefix for a locale: "" for English (root), "/fr" etc. otherwise. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/** Absolute URL for a path within a locale. `path` should start with "/". */
export function localizedUrl(locale: Locale, path: string): string {
  const SITE_URL = "https://uncoverd.org";
  const clean = path === "/" ? "" : path;
  return `${SITE_URL}${localePrefix(locale)}${clean}`;
}

/**
 * Build the `alternates.languages` map for Next metadata from a set of
 * locale→path entries, plus an x-default pointing at the English version.
 * Pass only the locales that actually have a translation.
 */
export function hreflangAlternates(
  entries: Partial<Record<Locale, string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [loc, path] of Object.entries(entries) as [Locale, string][]) {
    out[HTML_LANG[loc]] = localizedUrl(loc, path);
  }
  // x-default → English when present, else the first available.
  const fallback = entries.en ?? Object.values(entries)[0];
  if (fallback) {
    const fallbackLocale = (entries.en ? "en" : (Object.keys(entries)[0] as Locale));
    out["x-default"] = localizedUrl(fallbackLocale, fallback);
  }
  return out;
}

/**
 * Reciprocal hreflang for the homepage / per-language landing hubs. The English
 * root and each /<locale> hub are language variants of the same "home" concept,
 * so they cross-link. Apply to the EN homepage AND every locale hub.
 */
export function homeHreflang(): Record<string, string> {
  return hreflangAlternates({ en: "/", fr: "/", de: "/", it: "/", es: "/" });
}

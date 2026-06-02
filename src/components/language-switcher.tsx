"use client";

import { usePathname, useRouter } from "next/navigation";
import { localizedTwin } from "@/lib/page-equivalents";
import { useLocale, writeLocaleCookie } from "@/lib/use-locale";
import type { Locale } from "@/lib/i18n";

// Language switcher. Remembers the choice in a cookie so the whole UI follows
// your language on every page. If the current page has a localized twin (a
// /fr/… SEO page), navigate there; otherwise stay put — the cookie + live event
// re-render the chrome in the chosen language without leaving the page.
const LANGS: { code: string; label: string; locale: Locale; hrefLang?: string }[] = [
  { code: "EN", label: "English", locale: "en" },
  { code: "FR", label: "Français", locale: "fr", hrefLang: "fr-FR" },
  { code: "DE", label: "Deutsch", locale: "de", hrefLang: "de-DE" },
  { code: "IT", label: "Italiano", locale: "it", hrefLang: "it-IT" },
  { code: "ES", label: "Español", locale: "es", hrefLang: "es-ES" },
];

export function LanguageSwitcher() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const active = useLocale().toUpperCase();

  function choose(locale: Locale) {
    writeLocaleCookie(locale);
    const twin = localizedTwin(pathname, locale);
    if (twin && twin !== pathname) router.push(twin);
    // No twin → stay; writeLocaleCookie already fired the live re-render event.
    // Close the <details> menu.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const details = document.querySelector(".dv-lang[open]");
    if (details) details.removeAttribute("open");
  }

  return (
    <details className="dv-lang">
      <summary className="dv-lang__summary" aria-label="Change language">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
        <span className="dv-lang__current">{active}</span>
        <svg className="dv-lang__chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </summary>
      <ul className="dv-lang__menu">
        {LANGS.map((l) => (
          <li key={l.code}>
            <button type="button" className="dv-lang__btn" lang={l.locale} onClick={() => choose(l.locale)}>
              <span className="dv-lang__code">{l.code}</span> {l.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

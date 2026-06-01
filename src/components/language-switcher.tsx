"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizedHref } from "@/lib/page-equivalents";
import type { Locale } from "@/lib/i18n";

// Language switcher for the header. Translates the CURRENT page to its
// localized equivalent where one exists (e.g. /calendar/ex-dividend →
// /de/dividendenkalender); otherwise links to that language's hub.
const LANGS: { code: string; label: string; locale: Locale; hrefLang?: string }[] = [
  { code: "EN", label: "English", locale: "en" },
  { code: "FR", label: "Français", locale: "fr", hrefLang: "fr-FR" },
  { code: "DE", label: "Deutsch", locale: "de", hrefLang: "de-DE" },
  { code: "IT", label: "Italiano", locale: "it", hrefLang: "it-IT" },
  { code: "ES", label: "Español", locale: "es", hrefLang: "es-ES" },
];

// Which language is the current page in (for the button label)?
function currentCode(pathname: string): string {
  const seg = pathname.split("/")[1];
  if (seg === "fr") return "FR";
  if (seg === "de") return "DE";
  if (seg === "it") return "IT";
  if (seg === "es") return "ES";
  return "EN";
}

export function LanguageSwitcher() {
  const pathname = usePathname() || "/";
  const active = currentCode(pathname);

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
            <Link href={localizedHref(pathname, l.locale)} hrefLang={l.hrefLang}>
              <span className="dv-lang__code">{l.code}</span> {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

import Link from "next/link";

// Language switcher for the header. Links to each localized landing hub
// (English = root). Uses a native <details> so it needs no client state.
const LANGS: { code: string; label: string; href: string; hrefLang?: string }[] = [
  { code: "EN", label: "English", href: "/" },
  { code: "FR", label: "Français", href: "/fr", hrefLang: "fr-FR" },
  { code: "DE", label: "Deutsch", href: "/de", hrefLang: "de-DE" },
  { code: "IT", label: "Italiano", href: "/it", hrefLang: "it-IT" },
  { code: "ES", label: "Español", href: "/es", hrefLang: "es-ES" },
];

export function LanguageSwitcher() {
  return (
    <details className="dv-lang">
      <summary className="dv-lang__summary" aria-label="Change language">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
        <span className="dv-lang__current">EN</span>
        <svg className="dv-lang__chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </summary>
      <ul className="dv-lang__menu">
        {LANGS.map((l) => (
          <li key={l.code}>
            <Link href={l.href} hrefLang={l.hrefLang}>
              <span className="dv-lang__code">{l.code}</span> {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

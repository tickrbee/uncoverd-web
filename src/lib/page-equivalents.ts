import { DEFAULT_LOCALE, localePrefix, type Locale } from "@/lib/i18n";
import { sectorEquivalent } from "@/lib/i18n-taxonomy";

// Cross-language equivalents for the pages that have localized versions, so the
// language switcher can translate the CURRENT page instead of always dumping
// the user on the language hub. Each group maps locale → path. Pages not listed
// here (e.g. /stocks/[ticker], /sectors/...) have no localized twin, so the
// switcher falls back to that language's hub.
const GROUPS: Partial<Record<Locale, string>>[] = [
  { en: "/", fr: "/fr", de: "/de", it: "/it", es: "/es" },
  {
    en: "/calendar/ex-dividend",
    fr: "/fr/calendrier-dividendes",
    de: "/de/dividendenkalender",
    it: "/it/calendario-dividendi",
    es: "/es/proximos-dividendos",
  },
  {
    en: "/picks/best-dividend-stocks",
    fr: "/fr/meilleures-actions-dividende",
    de: "/de/beste-dividenden-aktien",
    it: "/it/migliori-azioni-dividendi",
    es: "/es/mejores-acciones-dividendos",
  },
  {
    en: "/monthly",
    fr: "/fr/actions-dividende-mensuel",
    de: "/de/monatliche-dividenden-aktien",
    it: "/it/azioni-dividendo-mensile",
    es: "/es/acciones-dividendo-mensual",
  },
  {
    en: "/high-yield",
    fr: "/fr/actions-haut-rendement",
    de: "/de/aktien-hohe-dividende",
    it: "/it/azioni-alto-rendimento",
    es: "/es/acciones-alta-rentabilidad",
  },
  { en: "/blog", fr: "/fr/blog", de: "/de/blog", it: "/it/blog", es: "/es/blog" },
  {
    en: "/blog/what-is-an-ex-dividend-date",
    fr: "/fr/blog/date-ex-dividende",
    de: "/de/blog/was-ist-der-ex-dividenden-tag",
    it: "/it/blog/cos-e-la-data-di-stacco-del-dividendo",
    es: "/es/blog/que-es-la-fecha-ex-dividendo",
  },
  {
    en: "/blog/best-monthly-dividend-stocks",
    fr: "/fr/blog/meilleures-actions-dividende-mensuel",
    de: "/de/blog/aktien-mit-monatlicher-dividende",
    it: "/it/blog/migliori-azioni-dividendo-mensile",
    es: "/es/blog/mejores-acciones-dividendo-mensual",
  },
];

/**
 * Given the current pathname, return the URL for the same page in `target`
 * locale. If the page has a localized equivalent, use it; otherwise fall back
 * to the target locale's hub (or site root for English).
 */
export function localizedHref(pathname: string, target: Locale): string {
  const clean = pathname.replace(/\/+$/, "") || "/";
  // Table-driven categories (sectors today; growers/industries next) first.
  const sector = sectorEquivalent(clean, target);
  if (sector) return sector;
  for (const group of GROUPS) {
    const match = Object.values(group).includes(clean);
    if (match && group[target]) return group[target] as string;
  }
  return target === DEFAULT_LOCALE ? "/" : localePrefix(target);
}

/** The active locale implied by a pathname's first segment. */
export function localeFromPath(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  return seg === "fr" || seg === "de" || seg === "it" || seg === "es" ? seg : DEFAULT_LOCALE;
}

/**
 * Locale-aware href for NAVIGATION: given an English target href and the
 * current locale, return the localized equivalent if one exists, otherwise the
 * original English href unchanged (so links to not-yet-localized pages still
 * work instead of dumping the user on the hub). Query strings are left as-is.
 */
export function localeNavHref(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/")) return href;
  const [path] = href.split("?");
  const clean = path.replace(/\/+$/, "") || "/";
  const sector = sectorEquivalent(clean, locale);
  if (sector) return sector;
  for (const group of GROUPS) {
    if (Object.values(group).includes(clean) && group[locale]) return group[locale] as string;
  }
  return href; // not localized yet → keep English target
}

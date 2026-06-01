import { ALL_LOCALES, HTML_LANG, type ContentLocale, type Locale } from "@/lib/i18n";

// Central, table-driven localized taxonomy for the nav landing pages. One entry
// per concept holds the DB value, a localized label and a localized URL slug
// per locale. Routes, the language switcher and hreflang all read from here, so
// translating a category is a data change — not new page code. Client-safe
// (pure data, no server-only imports).

export type TaxoEntry = {
  key: string; // canonical English slug / id
  db: string; // value passed to listStocks (sector / industry name)
  label: Record<Locale, string>;
  slug: Record<Locale, string>; // slug.en === key
};

// Localized path segment for each category, per locale (en = English route).
export const SECTOR_PATH: Record<Locale, string> = {
  en: "sectors",
  fr: "secteurs",
  de: "sektoren",
  it: "settori",
  es: "sectores",
};

export const SECTORS: TaxoEntry[] = [
  e("financials", "Financial Services", { en: "Financials", fr: "Finance", de: "Finanzwesen", it: "Finanza", es: "Finanzas" }, { fr: "finance", de: "finanzwesen", it: "finanza", es: "finanzas" }),
  e("real-estate", "Real Estate", { en: "Real Estate", fr: "Immobilier", de: "Immobilien", it: "Immobiliare", es: "Inmobiliario" }, { fr: "immobilier", de: "immobilien", it: "immobiliare", es: "inmobiliario" }),
  e("communications", "Communication Services", { en: "Communications", fr: "Communications", de: "Kommunikation", it: "Comunicazioni", es: "Comunicaciones" }, { fr: "communications", de: "kommunikation", it: "comunicazioni", es: "comunicaciones" }),
  e("consumer-discretionary", "Consumer Cyclical", { en: "Consumer Discretionary", fr: "Consommation discrétionnaire", de: "Zyklische Konsumgüter", it: "Beni di consumo ciclici", es: "Consumo discrecional" }, { fr: "consommation-discretionnaire", de: "zyklische-konsumgueter", it: "beni-consumo-ciclici", es: "consumo-discrecional" }),
  e("consumer-staples", "Consumer Defensive", { en: "Consumer Staples", fr: "Consommation de base", de: "Basiskonsumgüter", it: "Beni di prima necessità", es: "Consumo básico" }, { fr: "consommation-de-base", de: "basiskonsumgueter", it: "beni-prima-necessita", es: "consumo-basico" }),
  e("energy", "Energy", { en: "Energy", fr: "Énergie", de: "Energie", it: "Energia", es: "Energía" }, { fr: "energie", de: "energie", it: "energia", es: "energia" }),
  e("health-care", "Healthcare", { en: "Health Care", fr: "Santé", de: "Gesundheit", it: "Sanità", es: "Salud" }, { fr: "sante", de: "gesundheit", it: "sanita", es: "salud" }),
  e("industrials", "Industrials", { en: "Industrials", fr: "Industrie", de: "Industrie", it: "Industria", es: "Industria" }, { fr: "industrie", de: "industrie", it: "industria", es: "industria" }),
  e("technology", "Technology", { en: "Technology", fr: "Technologie", de: "Technologie", it: "Tecnologia", es: "Tecnología" }, { fr: "technologie", de: "technologie", it: "tecnologia", es: "tecnologia" }),
  e("materials", "Basic Materials", { en: "Materials", fr: "Matériaux de base", de: "Grundstoffe", it: "Materiali di base", es: "Materiales básicos" }, { fr: "materiaux-de-base", de: "grundstoffe", it: "materiali-di-base", es: "materiales-basicos" }),
  e("utilities", "Utilities", { en: "Utilities", fr: "Services aux collectivités", de: "Versorger", it: "Servizi di pubblica utilità", es: "Servicios públicos" }, { fr: "services-aux-collectivites", de: "versorger", it: "servizi-pubblica-utilita", es: "servicios-publicos" }),
];

function e(
  key: string,
  db: string,
  label: Record<Locale, string>,
  locSlug: Partial<Record<Locale, string>>,
): TaxoEntry {
  return { key, db, label, slug: { en: key, ...locSlug } as Record<Locale, string> };
}

/** Build the URL for a sector concept in a given locale. */
export function sectorUrl(locale: Locale, entry: TaxoEntry): string {
  return `${locale === "en" ? "" : `/${locale}`}/${SECTOR_PATH[locale]}/${entry.slug[locale]}`;
}

/** Look up a sector entry by its localized slug. */
export function sectorBySlug(locale: Locale, slug: string): TaxoEntry | undefined {
  return SECTORS.find((s) => s.slug[locale] === slug);
}

/** All localized slugs for a locale (for generateStaticParams). */
export function sectorSlugs(locale: Locale): { slug: string }[] {
  return SECTORS.map((s) => ({ slug: s.slug[locale] }));
}

/** hreflang alternates (absolute URLs) for a sector across all locales. */
export function sectorHreflang(entry: TaxoEntry): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of ALL_LOCALES) out[HTML_LANG[loc]] = absSectorUrl(loc, entry);
  out["x-default"] = absSectorUrl("en", entry);
  return out;
}

function absSectorUrl(locale: Locale, entry: TaxoEntry): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return `https://uncoverd.org${prefix}/${SECTOR_PATH[locale]}/${entry.slug[locale]}`;
}

/**
 * If `pathname` is a sector page (English or localized), return the concept +
 * the URL for it in the target locale. Used by the language switcher.
 */
export function sectorEquivalent(pathname: string, target: Locale): string | null {
  const clean = pathname.replace(/\/+$/, "");
  for (const loc of ALL_LOCALES) {
    const prefix = loc === "en" ? "" : `/${loc}`;
    const base = `${prefix}/${SECTOR_PATH[loc]}/`;
    if (clean.startsWith(base)) {
      const slug = clean.slice(base.length);
      const entry = SECTORS.find((s) => s.slug[loc] === slug);
      if (entry) return sectorUrl(target, entry);
    }
  }
  return null;
}

/** Localized ListStrings for a sector page (templated from the label). */
export function sectorStrings(locale: ContentLocale, label: string) {
  const t = {
    fr: {
      h1: `Meilleures actions à dividende — ${label}`,
      intro: [
        `Les actions du secteur ${label.toLowerCase()} qui versent un dividende, classées par rendement. Le rendement seul ne suffit pas : vérifiez que le dividende est couvert par les bénéfices.`,
        `Tableau mis à jour à partir des données de marché. Cliquez sur une action pour voir son historique de dividendes et sa note.`,
      ],
      sectionTitle: `Actions à dividende — ${label}`,
      th: { symbol: "Action", name: "Société", sector: "Secteur", yield: "Rendement", price: "Cours" },
      empty: "Aucune action à afficher pour le moment.",
      cta: [
        { label: "Calendrier des dividendes", href: "/fr/calendrier-dividendes" },
        { label: "Screener de dividendes", href: "/screener" },
        { label: "Toutes les actions A–Z", href: "/stocks" },
      ],
      faqs: [
        { q: `Quelles sont les meilleures actions à dividende du secteur ${label.toLowerCase()} ?`, a: `Le tableau classe les sociétés du secteur ${label.toLowerCase()} par rendement. Privilégiez celles dont le dividende est bien couvert par les bénéfices.` },
        { q: "Un rendement élevé est-il toujours une bonne chose ?", a: "Non. Un rendement très élevé signale souvent un risque de baisse du dividende. Regardez le ratio de distribution et la régularité des versements." },
      ],
    },
    de: {
      h1: `Beste Dividenden-Aktien — ${label}`,
      intro: [
        `Aktien aus dem Sektor ${label}, die eine Dividende zahlen, sortiert nach Rendite. Eine hohe Rendite allein genügt nicht — prüfen Sie, ob die Dividende durch die Gewinne gedeckt ist.`,
        `Tabelle aus Marktdaten aktualisiert. Klicken Sie auf eine Aktie für Dividendenhistorie und Bewertung.`,
      ],
      sectionTitle: `Dividenden-Aktien — ${label}`,
      th: { symbol: "Aktie", name: "Unternehmen", sector: "Sektor", yield: "Rendite", price: "Kurs" },
      empty: "Derzeit keine Aktien verfügbar.",
      cta: [
        { label: "Dividendenkalender", href: "/de/dividendenkalender" },
        { label: "Dividenden-Screener", href: "/screener" },
        { label: "Alle Aktien A–Z", href: "/stocks" },
      ],
      faqs: [
        { q: `Welche sind die besten Dividenden-Aktien im Sektor ${label}?`, a: `Die Tabelle sortiert die Unternehmen des Sektors ${label} nach Rendite. Bevorzugen Sie Aktien mit gut gedeckter Dividende.` },
        { q: "Ist eine hohe Dividendenrendite immer gut?", a: "Nein. Eine sehr hohe Rendite deutet oft auf ein Risiko einer Dividendenkürzung hin. Achten Sie auf Ausschüttungsquote und Beständigkeit." },
      ],
    },
    it: {
      h1: `Migliori azioni con dividendo — ${label}`,
      intro: [
        `Le azioni del settore ${label.toLowerCase()} che pagano un dividendo, ordinate per rendimento. Il rendimento da solo non basta: verifica che il dividendo sia coperto dagli utili.`,
        `Tabella aggiornata con i dati di mercato. Clicca su un titolo per vedere lo storico dei dividendi e la valutazione.`,
      ],
      sectionTitle: `Azioni con dividendo — ${label}`,
      th: { symbol: "Titolo", name: "Società", sector: "Settore", yield: "Rendimento", price: "Prezzo" },
      empty: "Nessun titolo da mostrare al momento.",
      cta: [
        { label: "Calendario dividendi", href: "/it/calendario-dividendi" },
        { label: "Screener dividendi", href: "/screener" },
        { label: "Tutte le azioni A–Z", href: "/stocks" },
      ],
      faqs: [
        { q: `Quali sono le migliori azioni con dividendo del settore ${label.toLowerCase()}?`, a: `La tabella ordina le società del settore ${label.toLowerCase()} per rendimento. Privilegia quelle con un dividendo ben coperto.` },
        { q: "Un rendimento elevato è sempre positivo?", a: "No. Un rendimento molto alto segnala spesso il rischio di un taglio del dividendo. Controlla il payout e la regolarità dei pagamenti." },
      ],
    },
    es: {
      h1: `Mejores acciones por dividendo — ${label}`,
      intro: [
        `Las acciones del sector ${label.toLowerCase()} que pagan dividendo, ordenadas por rentabilidad. La rentabilidad por sí sola no basta: comprueba que el dividendo esté cubierto por los beneficios.`,
        `Tabla actualizada con datos de mercado. Haz clic en una acción para ver su historial de dividendos y su valoración.`,
      ],
      sectionTitle: `Acciones por dividendo — ${label}`,
      th: { symbol: "Acción", name: "Empresa", sector: "Sector", yield: "Rentabilidad", price: "Precio" },
      empty: "No hay acciones para mostrar por el momento.",
      cta: [
        { label: "Próximos dividendos", href: "/es/proximos-dividendos" },
        { label: "Screener de dividendos", href: "/screener" },
        { label: "Todas las acciones A–Z", href: "/stocks" },
      ],
      faqs: [
        { q: `¿Cuáles son las mejores acciones por dividendo del sector ${label.toLowerCase()}?`, a: `La tabla ordena las empresas del sector ${label.toLowerCase()} por rentabilidad. Prioriza las que tienen un dividendo bien cubierto.` },
        { q: "¿Una rentabilidad alta es siempre buena?", a: "No. Una rentabilidad muy alta suele indicar riesgo de recorte del dividendo. Fíjate en el pay-out y en la regularidad de los pagos." },
      ],
    },
  };
  return t[locale];
}

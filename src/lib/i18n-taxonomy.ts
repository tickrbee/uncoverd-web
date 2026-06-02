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

// ============================================================
// Generic, category-agnostic helpers. A "category" is a localized path segment
// (SECTOR_PATH / GROWER_PATH / INDUSTRY_PATH) + its list of TaxoEntry. Every
// nav landing family (sectors, growers, industries, …) reuses these, so adding
// a family is a data change: define PATH + entries, register in CATEGORIES.
// ============================================================
type LocalePath = Record<Locale, string>;

/** Build the relative URL for a concept in a given locale. */
export function categoryUrl(path: LocalePath, locale: Locale, entry: TaxoEntry): string {
  return `${locale === "en" ? "" : `/${locale}`}/${path[locale]}/${entry.slug[locale]}`;
}

function absCategoryUrl(path: LocalePath, locale: Locale, entry: TaxoEntry): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return `https://uncoverd.org${prefix}/${path[locale]}/${entry.slug[locale]}`;
}

/** Look up an entry by its localized slug within a category. */
export function categoryBySlug(
  entries: TaxoEntry[],
  locale: Locale,
  slug: string,
): TaxoEntry | undefined {
  return entries.find((s) => s.slug[locale] === slug);
}

/** All localized slugs for a locale (for generateStaticParams). */
export function categorySlugs(entries: TaxoEntry[], locale: Locale): { slug: string }[] {
  return entries.map((s) => ({ slug: s.slug[locale] }));
}

/** hreflang alternates (absolute URLs) for a concept across all locales. */
export function categoryHreflang(path: LocalePath, entry: TaxoEntry): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of ALL_LOCALES) out[HTML_LANG[loc]] = absCategoryUrl(path, loc, entry);
  out["x-default"] = absCategoryUrl(path, "en", entry);
  return out;
}

/**
 * If `pathname` is a page in this category (English or localized), return the
 * URL for the same concept in the target locale; otherwise null.
 */
export function categoryEquivalent(
  path: LocalePath,
  entries: TaxoEntry[],
  pathname: string,
  target: Locale,
): string | null {
  const clean = pathname.replace(/\/+$/, "");
  for (const loc of ALL_LOCALES) {
    const prefix = loc === "en" ? "" : `/${loc}`;
    const base = `${prefix}/${path[loc]}/`;
    if (clean.startsWith(base)) {
      const slug = clean.slice(base.length);
      const entry = entries.find((s) => s.slug[loc] === slug);
      if (entry) return categoryUrl(path, target, entry);
    }
  }
  return null;
}

// --- Sector wrappers (kept for existing imports) -----------------------------
export const sectorUrl = (locale: Locale, entry: TaxoEntry) => categoryUrl(SECTOR_PATH, locale, entry);
export const sectorBySlug = (locale: Locale, slug: string) => categoryBySlug(SECTORS, locale, slug);
export const sectorSlugs = (locale: Locale) => categorySlugs(SECTORS, locale);
export const sectorHreflang = (entry: TaxoEntry) => categoryHreflang(SECTOR_PATH, entry);
export const sectorEquivalent = (pathname: string, target: Locale) =>
  categoryEquivalent(SECTOR_PATH, SECTORS, pathname, target);

/**
 * Cross-language equivalent across EVERY registered taxonomy category (sectors,
 * growers, industries, …). The language switcher / nav rewriter calls this one
 * function instead of knowing about each family.
 */
export function taxonomyEquivalent(pathname: string, target: Locale): string | null {
  for (const cat of CATEGORIES) {
    const r = categoryEquivalent(cat.path, cat.entries, pathname, target);
    if (r) return r;
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

// ============================================================
// Dividend Growers (aristocrats / kings / champions / …). The English route is
// /growers/[slug]; data comes from listGrowersWithStocks(key), not a screener
// query, so the localized routes pass pre-fetched rows. `db` holds the English
// GrowerSlug used to fetch the list.
// ============================================================
export const GROWER_PATH: Record<Locale, string> = {
  en: "growers",
  fr: "croissance-dividende",
  de: "dividendenwachstum",
  it: "crescita-dividendi",
  es: "crecimiento-dividendos",
};

export const GROWERS: TaxoEntry[] = [
  e("aristocrats", "aristocrats",
    { en: "Dividend Aristocrats", fr: "Aristocrates du dividende", de: "Dividenden-Aristokraten", it: "Aristocratici del dividendo", es: "Aristócratas del dividendo" },
    { fr: "aristocrates-dividende", de: "dividenden-aristokraten", it: "aristocratici-dividendo", es: "aristocratas-dividendo" }),
  e("kings", "kings",
    { en: "Dividend Kings", fr: "Rois du dividende", de: "Dividenden-Könige", it: "Re del dividendo", es: "Reyes del dividendo" },
    { fr: "rois-dividende", de: "dividenden-koenige", it: "re-dividendo", es: "reyes-dividendo" }),
  e("champions", "champions",
    { en: "Dividend Champions", fr: "Champions du dividende", de: "Dividenden-Champions", it: "Campioni del dividendo", es: "Campeones del dividendo" },
    { fr: "champions-dividende", de: "dividenden-champions", it: "campioni-dividendo", es: "campeones-dividendo" }),
  e("contenders", "contenders",
    { en: "Dividend Contenders", fr: "Prétendants au dividende", de: "Dividenden-Anwärter", it: "Contendenti del dividendo", es: "Aspirantes al dividendo" },
    { fr: "pretendants-dividende", de: "dividenden-anwaerter", it: "contendenti-dividendo", es: "aspirantes-dividendo" }),
  e("challengers", "challengers",
    { en: "Dividend Challengers", fr: "Challengers du dividende", de: "Dividenden-Herausforderer", it: "Sfidanti del dividendo", es: "Retadores del dividendo" },
    { fr: "challengers-dividende", de: "dividenden-herausforderer", it: "sfidanti-dividendo", es: "retadores-dividendo" }),
  e("achievers", "achievers",
    { en: "Dividend Achievers", fr: "Achievers du dividende", de: "Dividenden-Achiever", it: "Achiever del dividendo", es: "Achievers del dividendo" },
    { fr: "achievers-dividende", de: "dividenden-achiever", it: "achiever-dividendo", es: "achievers-dividendo" }),
];

// Consecutive-years phrase per grower key (localized inline below).
export const GROWER_YEARS: Record<string, string> = {
  aristocrats: "25+", kings: "50+", champions: "25+",
  contenders: "10–24", challengers: "5–9", achievers: "10+",
};

export const growerUrl = (locale: Locale, entry: TaxoEntry) => categoryUrl(GROWER_PATH, locale, entry);
export const growerBySlug = (locale: Locale, slug: string) => categoryBySlug(GROWERS, locale, slug);
export const growerSlugs = (locale: Locale) => categorySlugs(GROWERS, locale);
export const growerHreflang = (entry: TaxoEntry) => categoryHreflang(GROWER_PATH, entry);

/** Localized ListStrings for a grower page (templated from the label + years). */
export function growerStrings(locale: ContentLocale, key: string, label: string) {
  const y = GROWER_YEARS[key] ?? "25+";
  const t = {
    fr: {
      h1: label,
      intro: [
        `${label} : des sociétés qui ont augmenté leur dividende pendant ${y} années consécutives. Cette régularité est un signe de solidité financière et de discipline dans la rémunération des actionnaires.`,
        `Liste classée par rendement. Vérifiez toujours que le dividende reste couvert par les bénéfices avant d'investir.`,
      ],
      sectionTitle: `${label} — liste complète`,
      th: { symbol: "Action", name: "Société", sector: "Secteur", yield: "Rendement", price: "Cours" },
      empty: "La liste est en cours de constitution. Revenez bientôt.",
      cta: [
        { label: "Calendrier des dividendes", href: "/fr/calendrier-dividendes" },
        { label: "Actions à fort dividende", href: "/fr/actions-haut-rendement" },
        { label: "Meilleures actions à dividende", href: "/fr/meilleures-actions-dividende" },
      ],
      faqs: [
        { q: `Qu'est-ce que les ${label} ?`, a: `Ce sont des sociétés qui ont augmenté leur dividende pendant ${y} années consécutives — un gage de constance et de santé financière.` },
        { q: "Faut-il acheter une action uniquement parce qu'elle augmente son dividende ?", a: "Non. La régularité est un bon signe, mais regardez aussi la valorisation, le ratio de distribution et les perspectives de l'entreprise." },
      ],
    },
    de: {
      h1: label,
      intro: [
        `${label}: Unternehmen, die ihre Dividende ${y} Jahre in Folge erhöht haben. Diese Beständigkeit ist ein Zeichen für finanzielle Stärke und Disziplin gegenüber den Aktionären.`,
        `Liste nach Rendite sortiert. Prüfen Sie immer, ob die Dividende weiterhin durch die Gewinne gedeckt ist, bevor Sie investieren.`,
      ],
      sectionTitle: `${label} — vollständige Liste`,
      th: { symbol: "Aktie", name: "Unternehmen", sector: "Sektor", yield: "Rendite", price: "Kurs" },
      empty: "Die Liste wird gerade zusammengestellt. Schauen Sie bald wieder vorbei.",
      cta: [
        { label: "Dividendenkalender", href: "/de/dividendenkalender" },
        { label: "Aktien mit hoher Dividende", href: "/de/aktien-hohe-dividende" },
        { label: "Beste Dividenden-Aktien", href: "/de/beste-dividenden-aktien" },
      ],
      faqs: [
        { q: `Was sind die ${label}?`, a: `Das sind Unternehmen, die ihre Dividende ${y} Jahre in Folge erhöht haben — ein Beleg für Beständigkeit und finanzielle Gesundheit.` },
        { q: "Sollte man eine Aktie nur kaufen, weil sie ihre Dividende erhöht?", a: "Nein. Beständigkeit ist ein gutes Zeichen, aber achten Sie auch auf Bewertung, Ausschüttungsquote und Geschäftsaussichten." },
      ],
    },
    it: {
      h1: label,
      intro: [
        `${label}: società che hanno aumentato il dividendo per ${y} anni consecutivi. Questa regolarità è un segno di solidità finanziaria e di disciplina verso gli azionisti.`,
        `Elenco ordinato per rendimento. Verifica sempre che il dividendo resti coperto dagli utili prima di investire.`,
      ],
      sectionTitle: `${label} — elenco completo`,
      th: { symbol: "Titolo", name: "Società", sector: "Settore", yield: "Rendimento", price: "Prezzo" },
      empty: "L'elenco è in fase di compilazione. Torna presto.",
      cta: [
        { label: "Calendario dividendi", href: "/it/calendario-dividendi" },
        { label: "Azioni ad alto rendimento", href: "/it/azioni-alto-rendimento" },
        { label: "Migliori azioni da dividendo", href: "/it/migliori-azioni-dividendi" },
      ],
      faqs: [
        { q: `Che cosa sono i ${label}?`, a: `Sono società che hanno aumentato il dividendo per ${y} anni consecutivi — una prova di costanza e salute finanziaria.` },
        { q: "Conviene comprare un titolo solo perché aumenta il dividendo?", a: "No. La regolarità è un buon segnale, ma valuta anche prezzo, payout ratio e prospettive dell'azienda." },
      ],
    },
    es: {
      h1: label,
      intro: [
        `${label}: empresas que han aumentado su dividendo durante ${y} años consecutivos. Esta regularidad es señal de solidez financiera y de disciplina con los accionistas.`,
        `Lista ordenada por rentabilidad. Comprueba siempre que el dividendo siga cubierto por los beneficios antes de invertir.`,
      ],
      sectionTitle: `${label} — lista completa`,
      th: { symbol: "Acción", name: "Empresa", sector: "Sector", yield: "Rentabilidad", price: "Precio" },
      empty: "La lista se está elaborando. Vuelve pronto.",
      cta: [
        { label: "Próximos dividendos", href: "/es/proximos-dividendos" },
        { label: "Acciones de alta rentabilidad", href: "/es/acciones-alta-rentabilidad" },
        { label: "Mejores acciones por dividendo", href: "/es/mejores-acciones-dividendos" },
      ],
      faqs: [
        { q: `¿Qué son los ${label}?`, a: `Son empresas que han aumentado su dividendo durante ${y} años consecutivos — una prueba de constancia y salud financiera.` },
        { q: "¿Conviene comprar una acción solo porque sube su dividendo?", a: "No. La regularidad es buena señal, pero fíjate también en la valoración, el pay-out y las perspectivas del negocio." },
      ],
    },
  };
  return t[locale];
}

// ============================================================
// Industries (REITs, MLPs, semiconductors, …). The English route is
// /industries/[slug]; `db` holds the English key, which the localized routes
// use to look up INDUSTRY_SLUG_MAP for the screener query (industryPattern /
// sector). Loanword tickers (REIT/MLP/BDC) keep their slug across locales.
// ============================================================
export const INDUSTRY_PATH: Record<Locale, string> = {
  en: "industries",
  fr: "industries",
  de: "branchen",
  it: "industrie",
  es: "industrias",
};

export const INDUSTRIES: TaxoEntry[] = [
  e("reit", "reit", { en: "REITs", fr: "REIT (foncières)", de: "REITs (Immobilien)", it: "REIT (immobiliari)", es: "REIT (inmobiliarias)" }, { fr: "reit", de: "reit", it: "reit", es: "reit" }),
  e("mlp", "mlp", { en: "MLPs", fr: "MLP", de: "MLPs", it: "MLP", es: "MLP" }, { fr: "mlp", de: "mlp", it: "mlp", es: "mlp" }),
  e("bdc", "bdc", { en: "BDCs", fr: "BDC", de: "BDCs", it: "BDC", es: "BDC" }, { fr: "bdc", de: "bdc", it: "bdc", es: "bdc" }),
  e("clean-energy", "clean-energy", { en: "Clean Energy", fr: "Énergies propres", de: "Saubere Energie", it: "Energia pulita", es: "Energía limpia" }, { fr: "energies-propres", de: "saubere-energie", it: "energia-pulita", es: "energia-limpia" }),
  e("uranium", "uranium", { en: "Uranium", fr: "Uranium", de: "Uran", it: "Uranio", es: "Uranio" }, { fr: "uranium", de: "uran", it: "uranio", es: "uranio" }),
  e("lithium", "lithium", { en: "Lithium", fr: "Lithium", de: "Lithium", it: "Litio", es: "Litio" }, { fr: "lithium", de: "lithium", it: "litio", es: "litio" }),
  e("precious-metals", "precious-metals", { en: "Precious Metals", fr: "Métaux précieux", de: "Edelmetalle", it: "Metalli preziosi", es: "Metales preciosos" }, { fr: "metaux-precieux", de: "edelmetalle", it: "metalli-preziosi", es: "metales-preciosos" }),
  e("water", "water", { en: "Water", fr: "Eau", de: "Wasser", it: "Acqua", es: "Agua" }, { fr: "eau", de: "wasser", it: "acqua", es: "agua" }),
  e("natural-resources", "natural-resources", { en: "Natural Resources", fr: "Ressources naturelles", de: "Natürliche Ressourcen", it: "Risorse naturali", es: "Recursos naturales" }, { fr: "ressources-naturelles", de: "natuerliche-ressourcen", it: "risorse-naturali", es: "recursos-naturales" }),
  e("energy-infrastructure", "energy-infrastructure", { en: "Energy Infrastructure", fr: "Infrastructures énergétiques", de: "Energieinfrastruktur", it: "Infrastrutture energetiche", es: "Infraestructura energética" }, { fr: "infrastructures-energetiques", de: "energieinfrastruktur", it: "infrastrutture-energetiche", es: "infraestructura-energetica" }),
  e("semiconductors", "semiconductors", { en: "Semiconductors", fr: "Semi-conducteurs", de: "Halbleiter", it: "Semiconduttori", es: "Semiconductores" }, { fr: "semi-conducteurs", de: "halbleiter", it: "semiconduttori", es: "semiconductores" }),
  e("software", "software", { en: "Software", fr: "Logiciels", de: "Software", it: "Software", es: "Software" }, { fr: "logiciels", de: "software", it: "software", es: "software" }),
  e("ecommerce", "ecommerce", { en: "eCommerce", fr: "E-commerce", de: "E-Commerce", it: "E-commerce", es: "Comercio electrónico" }, { fr: "e-commerce", de: "e-commerce", it: "e-commerce", es: "comercio-electronico" }),
  e("transportation", "transportation", { en: "Transportation", fr: "Transport", de: "Transport", it: "Trasporti", es: "Transporte" }, { fr: "transport", de: "transport", it: "trasporti", es: "transporte" }),
  e("autos", "autos", { en: "Autos", fr: "Automobile", de: "Automobil", it: "Automobili", es: "Automóviles" }, { fr: "automobile", de: "automobil", it: "automobili", es: "automoviles" }),
  e("airlines", "airlines", { en: "Airlines", fr: "Compagnies aériennes", de: "Fluggesellschaften", it: "Compagnie aeree", es: "Aerolíneas" }, { fr: "compagnies-aeriennes", de: "fluggesellschaften", it: "compagnie-aeree", es: "aerolineas" }),
  e("shipping", "shipping", { en: "Shipping", fr: "Transport maritime", de: "Schifffahrt", it: "Trasporto marittimo", es: "Transporte marítimo" }, { fr: "transport-maritime", de: "schifffahrt", it: "trasporto-marittimo", es: "transporte-maritimo" }),
  e("cruise-lines", "cruise-lines", { en: "Cruise Lines", fr: "Croisières", de: "Kreuzfahrten", it: "Crociere", es: "Cruceros" }, { fr: "croisieres", de: "kreuzfahrten", it: "crociere", es: "cruceros" }),
  e("hotels", "hotels", { en: "Hotels", fr: "Hôtels", de: "Hotels", it: "Hotel", es: "Hoteles" }, { fr: "hotels", de: "hotels", it: "hotel", es: "hoteles" }),
  e("retail", "retail", { en: "Retail", fr: "Distribution", de: "Einzelhandel", it: "Distribuzione", es: "Comercio minorista" }, { fr: "distribution", de: "einzelhandel", it: "distribuzione", es: "comercio-minorista" }),
  e("iron-steel", "iron-steel", { en: "Iron & Steel", fr: "Fer et acier", de: "Eisen & Stahl", it: "Ferro e acciaio", es: "Hierro y acero" }, { fr: "fer-acier", de: "eisen-stahl", it: "ferro-acciaio", es: "hierro-acero" }),
  e("chemicals", "chemicals", { en: "Chemicals", fr: "Chimie", de: "Chemie", it: "Chimica", es: "Química" }, { fr: "chimie", de: "chemie", it: "chimica", es: "quimica" }),
  e("pharma", "pharma", { en: "Pharma", fr: "Pharmacie", de: "Pharma", it: "Farmaceutica", es: "Farmacéutica" }, { fr: "pharmacie", de: "pharma", it: "farmaceutica", es: "farmaceutica" }),
  e("insurance", "insurance", { en: "Insurance", fr: "Assurance", de: "Versicherung", it: "Assicurazioni", es: "Seguros" }, { fr: "assurance", de: "versicherung", it: "assicurazioni", es: "seguros" }),
  e("aerospace-defense", "aerospace-defense", { en: "Aerospace & Defense", fr: "Aérospatiale et défense", de: "Luft- & Raumfahrt", it: "Aerospazio e difesa", es: "Aeroespacial y defensa" }, { fr: "aerospatiale-defense", de: "luft-raumfahrt", it: "aerospazio-difesa", es: "aeroespacial-defensa" }),
];

export const industryUrl = (locale: Locale, entry: TaxoEntry) => categoryUrl(INDUSTRY_PATH, locale, entry);
export const industryBySlug = (locale: Locale, slug: string) => categoryBySlug(INDUSTRIES, locale, slug);
export const industrySlugs = (locale: Locale) => categorySlugs(INDUSTRIES, locale);
export const industryHreflang = (entry: TaxoEntry) => categoryHreflang(INDUSTRY_PATH, entry);

/** Localized ListStrings for an industry page (templated from the label). */
export function industryStrings(locale: ContentLocale, label: string) {
  const l = label.toLowerCase();
  const t = {
    fr: {
      h1: `Actions à dividende — ${label}`,
      intro: [
        `Les actions du secteur ${l} qui versent un dividende, classées par rendement. Comparez les payeurs de dividende du secteur ${l} et repérez le revenu le plus sûr.`,
        `Tableau mis à jour à partir des données de marché. Cliquez sur une action pour voir son historique de dividendes et sa note.`,
      ],
      sectionTitle: `Payeurs de dividende — ${label}`,
      th: { symbol: "Action", name: "Société", sector: "Secteur", yield: "Rendement", price: "Cours" },
      empty: "Aucune action à afficher pour le moment.",
      cta: [
        { label: "Calendrier des dividendes", href: "/fr/calendrier-dividendes" },
        { label: "Actions à fort dividende", href: "/fr/actions-haut-rendement" },
        { label: "Screener de dividendes", href: "/screener" },
      ],
      faqs: [
        { q: `Quelles sont les meilleures actions à dividende du secteur ${l} ?`, a: `Le tableau classe les payeurs de dividende du secteur ${l} par rendement. Privilégiez ceux dont le dividende est bien couvert par les bénéfices.` },
        { q: "Un rendement élevé est-il toujours une bonne chose ?", a: "Non. Un rendement très élevé signale souvent un risque de baisse du dividende. Regardez le ratio de distribution et la régularité des versements." },
      ],
    },
    de: {
      h1: `Dividenden-Aktien — ${label}`,
      intro: [
        `Aktien aus der Branche ${label}, die eine Dividende zahlen, sortiert nach Rendite. Vergleichen Sie die Dividendenzahler der Branche ${label} und finden Sie das sicherste Einkommen.`,
        `Tabelle aus Marktdaten aktualisiert. Klicken Sie auf eine Aktie für Dividendenhistorie und Bewertung.`,
      ],
      sectionTitle: `Dividendenzahler — ${label}`,
      th: { symbol: "Aktie", name: "Unternehmen", sector: "Sektor", yield: "Rendite", price: "Kurs" },
      empty: "Derzeit keine Aktien verfügbar.",
      cta: [
        { label: "Dividendenkalender", href: "/de/dividendenkalender" },
        { label: "Aktien mit hoher Dividende", href: "/de/aktien-hohe-dividende" },
        { label: "Dividenden-Screener", href: "/screener" },
      ],
      faqs: [
        { q: `Welche sind die besten Dividenden-Aktien der Branche ${label}?`, a: `Die Tabelle sortiert die Dividendenzahler der Branche ${label} nach Rendite. Bevorzugen Sie Aktien mit gut gedeckter Dividende.` },
        { q: "Ist eine hohe Dividendenrendite immer gut?", a: "Nein. Eine sehr hohe Rendite deutet oft auf ein Risiko einer Dividendenkürzung hin. Achten Sie auf Ausschüttungsquote und Beständigkeit." },
      ],
    },
    it: {
      h1: `Azioni con dividendo — ${label}`,
      intro: [
        `Le azioni del settore ${l} che pagano un dividendo, ordinate per rendimento. Confronta chi paga dividendi nel settore ${l} e individua il reddito più sicuro.`,
        `Tabella aggiornata con i dati di mercato. Clicca su un titolo per vedere lo storico dei dividendi e la valutazione.`,
      ],
      sectionTitle: `Chi paga dividendi — ${label}`,
      th: { symbol: "Titolo", name: "Società", sector: "Settore", yield: "Rendimento", price: "Prezzo" },
      empty: "Nessun titolo da mostrare al momento.",
      cta: [
        { label: "Calendario dividendi", href: "/it/calendario-dividendi" },
        { label: "Azioni ad alto rendimento", href: "/it/azioni-alto-rendimento" },
        { label: "Screener dividendi", href: "/screener" },
      ],
      faqs: [
        { q: `Quali sono le migliori azioni con dividendo del settore ${l}?`, a: `La tabella ordina chi paga dividendi nel settore ${l} per rendimento. Privilegia i titoli con un dividendo ben coperto.` },
        { q: "Un rendimento elevato è sempre positivo?", a: "No. Un rendimento molto alto segnala spesso il rischio di un taglio del dividendo. Controlla il payout e la regolarità dei pagamenti." },
      ],
    },
    es: {
      h1: `Acciones por dividendo — ${label}`,
      intro: [
        `Las acciones del sector ${l} que pagan dividendo, ordenadas por rentabilidad. Compara los pagadores de dividendo del sector ${l} y encuentra el ingreso más seguro.`,
        `Tabla actualizada con datos de mercado. Haz clic en una acción para ver su historial de dividendos y su valoración.`,
      ],
      sectionTitle: `Pagadores de dividendo — ${label}`,
      th: { symbol: "Acción", name: "Empresa", sector: "Sector", yield: "Rentabilidad", price: "Precio" },
      empty: "No hay acciones para mostrar por el momento.",
      cta: [
        { label: "Próximos dividendos", href: "/es/proximos-dividendos" },
        { label: "Acciones de alta rentabilidad", href: "/es/acciones-alta-rentabilidad" },
        { label: "Screener de dividendos", href: "/screener" },
      ],
      faqs: [
        { q: `¿Cuáles son las mejores acciones por dividendo del sector ${l}?`, a: `La tabla ordena los pagadores de dividendo del sector ${l} por rentabilidad. Prioriza los que tienen un dividendo bien cubierto.` },
        { q: "¿Una rentabilidad alta es siempre buena?", a: "No. Una rentabilidad muy alta suele indicar riesgo de recorte del dividendo. Fíjate en el pay-out y en la regularidad de los pagos." },
      ],
    },
  };
  return t[locale];
}

// ============================================================
// Payout changes (increasing / decreasing / initiating / suspending / special).
// `db` = the English PayoutChangeKind. English route is /payout-changes/[slug].
// ============================================================
export const PAYOUT_PATH: Record<Locale, string> = {
  en: "payout-changes",
  fr: "variations-dividende",
  de: "dividendenaenderungen",
  it: "variazioni-dividendo",
  es: "cambios-dividendo",
};

export const PAYOUTS: TaxoEntry[] = [
  e("increasing", "increasing", { en: "Increasing Dividend", fr: "Hausse du dividende", de: "Dividendenerhöhung", it: "Aumento del dividendo", es: "Aumento del dividendo" }, { fr: "hausse", de: "erhoehung", it: "aumento", es: "aumento" }),
  e("decreasing", "decreasing", { en: "Decreasing Dividend", fr: "Baisse du dividende", de: "Dividendenkürzung", it: "Riduzione del dividendo", es: "Reducción del dividendo" }, { fr: "baisse", de: "kuerzung", it: "riduzione", es: "reduccion" }),
  e("initiating", "initiating", { en: "Initiating Dividend", fr: "Initiation du dividende", de: "Dividendeneinführung", it: "Avvio del dividendo", es: "Inicio del dividendo" }, { fr: "initiation", de: "einfuehrung", it: "avvio", es: "inicio" }),
  e("suspending", "suspending", { en: "Suspending Dividend", fr: "Suspension du dividende", de: "Dividendenaussetzung", it: "Sospensione del dividendo", es: "Suspensión del dividendo" }, { fr: "suspension", de: "aussetzung", it: "sospensione", es: "suspension" }),
  e("special", "special", { en: "Special Dividend", fr: "Dividende exceptionnel", de: "Sonderdividende", it: "Dividendo straordinario", es: "Dividendo extraordinario" }, { fr: "exceptionnel", de: "sonderdividende", it: "straordinario", es: "extraordinario" }),
];

export const payoutUrl = (locale: Locale, entry: TaxoEntry) => categoryUrl(PAYOUT_PATH, locale, entry);
export const payoutBySlug = (locale: Locale, slug: string) => categoryBySlug(PAYOUTS, locale, slug);
export const payoutSlugs = (locale: Locale) => categorySlugs(PAYOUTS, locale);
export const payoutHreflang = (entry: TaxoEntry) => categoryHreflang(PAYOUT_PATH, entry);

// Registry of every taxonomy family — taxonomyEquivalent() iterates this.
const CATEGORIES: { path: Record<Locale, string>; entries: TaxoEntry[] }[] = [
  { path: SECTOR_PATH, entries: SECTORS },
  { path: GROWER_PATH, entries: GROWERS },
  { path: INDUSTRY_PATH, entries: INDUSTRIES },
  { path: PAYOUT_PATH, entries: PAYOUTS },
];

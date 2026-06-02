import { type Locale } from "@/lib/i18n";

// Client-safe UI/chrome translations for the listing pages. The chrome
// components (ColumnTabs, CountryFilter, ListingToolbar, Pager) derive the
// active locale from the pathname and translate their own labels via these
// dictionaries — so the SAME English page rendered under /fr, /de, … shows
// translated chrome with identical layout and data.

// ---- Toolbar / filter / pager chrome ----
export type ChromeStrings = {
  country: string;
  industry: string;
  all: string;
  prev: string;
  next: string;
  stocks: string; // noun used in "· N stocks"
  filterBySecurityType: string;
  securityStocks: string;
  securityEtfs: string;
};

const CHROME: Record<Locale, ChromeStrings> = {
  en: { country: "Country:", industry: "Industry:", all: "All", prev: "Prev", next: "Next", stocks: "stocks", filterBySecurityType: "Filter by Security Type", securityStocks: "Stocks", securityEtfs: "ETFs" },
  fr: { country: "Pays :", industry: "Industrie :", all: "Tous", prev: "Préc.", next: "Suiv.", stocks: "actions", filterBySecurityType: "Filtrer par type de titre", securityStocks: "Actions", securityEtfs: "ETF" },
  de: { country: "Land:", industry: "Branche:", all: "Alle", prev: "Zurück", next: "Weiter", stocks: "Aktien", filterBySecurityType: "Nach Wertpapiertyp filtern", securityStocks: "Aktien", securityEtfs: "ETFs" },
  it: { country: "Paese:", industry: "Industria:", all: "Tutti", prev: "Prec.", next: "Succ.", stocks: "azioni", filterBySecurityType: "Filtra per tipo di titolo", securityStocks: "Azioni", securityEtfs: "ETF" },
  es: { country: "País:", industry: "Industria:", all: "Todos", prev: "Ant.", next: "Sig.", stocks: "acciones", filterBySecurityType: "Filtrar por tipo de valor", securityStocks: "Acciones", securityEtfs: "ETF" },
};
export const chromeStrings = (locale: Locale): ChromeStrings => CHROME[locale];

// ---- Column tabs: English label → localized ----
const TAB_I18N: Record<Locale, Record<string, string>> = {
  en: {},
  fr: { Overview: "Aperçu", Payout: "Distribution", "Div Growth": "Croissance", Returns: "Rendements", Ratings: "Notes", Income: "Revenu", "Income Risk": "Risque revenu", Distributions: "Distributions", Heatmap: "Carte", Holders: "Détenteurs", "ETF Overview": "Aperçu ETF", "Future Income": "Revenu futur" },
  de: { Overview: "Übersicht", Payout: "Ausschüttung", "Div Growth": "Div.-Wachstum", Returns: "Rendite", Ratings: "Bewertungen", Income: "Einkommen", "Income Risk": "Einkommensrisiko", Distributions: "Ausschüttungen", Heatmap: "Heatmap", Holders: "Halter", "ETF Overview": "ETF-Übersicht", "Future Income": "Künftiges Einkommen" },
  it: { Overview: "Panoramica", Payout: "Distribuzione", "Div Growth": "Crescita div.", Returns: "Rendimenti", Ratings: "Valutazioni", Income: "Reddito", "Income Risk": "Rischio reddito", Distributions: "Distribuzioni", Heatmap: "Mappa", Holders: "Detentori", "ETF Overview": "Panoramica ETF", "Future Income": "Reddito futuro" },
  es: { Overview: "Resumen", Payout: "Reparto", "Div Growth": "Crecimiento div.", Returns: "Rentabilidad", Ratings: "Calificaciones", Income: "Ingresos", "Income Risk": "Riesgo ingresos", Distributions: "Distribuciones", Heatmap: "Mapa", Holders: "Tenedores", "ETF Overview": "Resumen ETF", "Future Income": "Ingresos futuros" },
};
export function tabLabel(label: string, locale: Locale): string {
  if (locale === "en") return label;
  return TAB_I18N[locale]?.[label] ?? label;
}

// ---- "Page X of Y · N stocks" summary line ----
export function pageSummary(locale: Locale, page: number, totalPages: number, total: number): string {
  const n = total.toLocaleString();
  const noun = chromeStrings(locale).stocks;
  switch (locale) {
    case "fr": return `Page ${page} sur ${totalPages} · ${n} ${noun}`;
    case "de": return `Seite ${page} von ${totalPages} · ${n} ${noun}`;
    case "it": return `Pagina ${page} di ${totalPages} · ${n} ${noun}`;
    case "es": return `Página ${page} de ${totalPages} · ${n} ${noun}`;
    default: return `Page ${page} of ${totalPages} · ${n} ${noun}`;
  }
}

// ---- Per-locale country / blue-chip chips ----
// We have no index-constituent data, so the blue-chip chip approximates the
// national index via country + a market-cap floor (tier=large). Labelled by
// the well-known index name for recognisability.
export const LOCALE_MARKETS: Record<string, {
  home: { code: string; label: string };
  blueChip: { code: string; label: string };
}> = {
  fr: { home: { code: "FR", label: "France" }, blueChip: { code: "FR", label: "CAC 40" } },
  de: { home: { code: "DE", label: "Deutschland" }, blueChip: { code: "DE", label: "DAX" } },
  it: { home: { code: "IT", label: "Italia" }, blueChip: { code: "IT", label: "FTSE MIB" } },
  es: { home: { code: "ES", label: "España" }, blueChip: { code: "ES", label: "IBEX 35" } },
};

// Market-cap floor (USD) used to approximate a national blue-chip index.
export const BLUE_CHIP_MIN_MARKET_CAP = 5_000_000_000;

// ---- Page headers (eyebrow / title / description) per page type ----
export type PageHeaderStrings = { eyebrow: string; title: string; description: string };

export function sectorHeader(locale: Locale, label: string): PageHeaderStrings {
  const l = label.toLowerCase();
  switch (locale) {
    case "fr": return { eyebrow: "Dividendes par secteur", title: `Actions à dividende — ${label}`, description: `La liste complète des sociétés du secteur ${l} qui versent un dividende, triées par capitalisation.` };
    case "de": return { eyebrow: "Sektor-Dividenden", title: `Dividenden-Aktien — ${label}`, description: `Die vollständige Liste der dividendenzahlenden Unternehmen im Sektor ${label}, nach Marktkapitalisierung sortiert.` };
    case "it": return { eyebrow: "Dividendi per settore", title: `Azioni con dividendo — ${label}`, description: `L'elenco completo delle società del settore ${l} che pagano un dividendo, ordinate per capitalizzazione.` };
    case "es": return { eyebrow: "Dividendos por sector", title: `Acciones por dividendo — ${label}`, description: `La lista completa de empresas del sector ${l} que pagan dividendo, ordenadas por capitalización.` };
    default: return { eyebrow: "Sector Dividends", title: `${label} Dividend Stocks`, description: `The full list of dividend-paying ${l} companies, sorted by market cap.` };
  }
}

export function industryHeader(locale: Locale, label: string): PageHeaderStrings {
  const l = label.toLowerCase();
  switch (locale) {
    case "fr": return { eyebrow: "Dividendes par industrie", title: `Actions à dividende — ${label}`, description: `Les actions du secteur ${l} qui versent un dividende, classées par capitalisation.` };
    case "de": return { eyebrow: "Branchen-Dividenden", title: `Dividenden-Aktien — ${label}`, description: `Dividendenzahlende Aktien der Branche ${label}, nach Marktkapitalisierung sortiert.` };
    case "it": return { eyebrow: "Dividendi per industria", title: `Azioni con dividendo — ${label}`, description: `Le azioni del settore ${l} che pagano un dividendo, ordinate per capitalizzazione.` };
    case "es": return { eyebrow: "Dividendos por industria", title: `Acciones por dividendo — ${label}`, description: `Las acciones del sector ${l} que pagan dividendo, ordenadas por capitalización.` };
    default: return { eyebrow: "Industry Dividends", title: `${label} Dividend Stocks`, description: `Dividend-paying ${l} stocks ranked by market cap.` };
  }
}

export function growerHeader(locale: Locale, label: string, years: string): PageHeaderStrings {
  switch (locale) {
    case "fr": return { eyebrow: "Croissance du dividende", title: label, description: `Sociétés qui ont augmenté leur dividende pendant ${years} années consécutives.` };
    case "de": return { eyebrow: "Dividendenwachstum", title: label, description: `Unternehmen, die ihre Dividende ${years} Jahre in Folge erhöht haben.` };
    case "it": return { eyebrow: "Crescita dei dividendi", title: label, description: `Società che hanno aumentato il dividendo per ${years} anni consecutivi.` };
    case "es": return { eyebrow: "Crecimiento del dividendo", title: label, description: `Empresas que han aumentado su dividendo durante ${years} años consecutivos.` };
    default: return { eyebrow: "Dividend Growers", title: label, description: `Companies that have raised dividends for ${years} consecutive years.` };
  }
}

const PAYOUT_DESC: Record<string, Record<Locale, string>> = {
  increasing: {
    en: "Companies whose latest dividend was higher than their previous payment.",
    fr: "Sociétés dont le dernier dividende est supérieur au précédent.",
    de: "Unternehmen, deren letzte Dividende höher war als die vorherige Zahlung.",
    it: "Società il cui ultimo dividendo è stato superiore al precedente.",
    es: "Empresas cuyo último dividendo fue superior al pago anterior.",
  },
  decreasing: {
    en: "Companies whose latest dividend was lower than their previous payment.",
    fr: "Sociétés dont le dernier dividende est inférieur au précédent.",
    de: "Unternehmen, deren letzte Dividende niedriger war als die vorherige Zahlung.",
    it: "Società il cui ultimo dividendo è stato inferiore al precedente.",
    es: "Empresas cuyo último dividendo fue inferior al pago anterior.",
  },
  initiating: {
    en: "Companies that have just started paying a dividend for the first time.",
    fr: "Sociétés qui viennent de verser un dividende pour la première fois.",
    de: "Unternehmen, die zum ersten Mal eine Dividende zahlen.",
    it: "Società che hanno appena iniziato a pagare un dividendo per la prima volta.",
    es: "Empresas que acaban de pagar un dividendo por primera vez.",
  },
  suspending: {
    en: "Companies that have skipped an expected dividend payment or paid $0.",
    fr: "Sociétés qui ont sauté un versement de dividende attendu ou versé 0 $.",
    de: "Unternehmen, die eine erwartete Dividendenzahlung ausgelassen oder 0 $ gezahlt haben.",
    it: "Società che hanno saltato un pagamento di dividendo previsto o pagato 0 $.",
    es: "Empresas que han omitido un pago de dividendo previsto o pagado 0 $.",
  },
  special: {
    en: "Companies paying one-time special dividends in addition to regular payouts.",
    fr: "Sociétés versant des dividendes exceptionnels ponctuels en plus des versements réguliers.",
    de: "Unternehmen, die zusätzlich zu regulären Ausschüttungen einmalige Sonderdividenden zahlen.",
    it: "Società che pagano dividendi straordinari una tantum oltre alle distribuzioni regolari.",
    es: "Empresas que pagan dividendos extraordinarios puntuales además de los pagos regulares.",
  },
};

const PAYOUT_EYEBROW: Record<Locale, string> = {
  en: "Payout Changes", fr: "Variations de dividende", de: "Dividendenänderungen", it: "Variazioni di dividendo", es: "Cambios de dividendo",
};

export function payoutHeader(locale: Locale, kind: string, label: string): PageHeaderStrings {
  return {
    eyebrow: PAYOUT_EYEBROW[locale],
    title: label,
    description: PAYOUT_DESC[kind]?.[locale] ?? PAYOUT_DESC[kind]?.en ?? "",
  };
}

// Premium-gate + empty-state strings for the payout-changes page.
export function payoutChrome(locale: Locale): { premiumTitleSuffix: string; premiumDesc: string; noEvents: string } {
  switch (locale) {
    case "fr": return { premiumTitleSuffix: " — Premium", premiumDesc: "Le suivi détaillé des variations de dividende fait partie de la suite de recherche Premium.", noEvents: "Aucun événement correspondant." };
    case "de": return { premiumTitleSuffix: " — Premium", premiumDesc: "Die detaillierte Verfolgung von Dividendenänderungen ist Teil der Premium-Research-Suite.", noEvents: "Keine passenden Ereignisse gefunden." };
    case "it": return { premiumTitleSuffix: " — Premium", premiumDesc: "Il monitoraggio dettagliato delle variazioni di dividendo fa parte della suite di ricerca Premium.", noEvents: "Nessun evento corrispondente." };
    case "es": return { premiumTitleSuffix: " — Premium", premiumDesc: "El seguimiento detallado de los cambios de dividendo forma parte de la suite de análisis Premium.", noEvents: "No se han encontrado eventos." };
    default: return { premiumTitleSuffix: " — Premium", premiumDesc: "Detailed payout change tracking is part of the Premium dividend research suite.", noEvents: "No matching events found." };
  }
}

// When the Stocks/ETFs toggle is on ETFs, the title/description should reflect
// ETFs rather than stocks (used by the sector & industry views).
export function etfHeaderParts(locale: Locale, label: string): { title: string; description: string } {
  const l = label.toLowerCase();
  switch (locale) {
    case "fr": return { title: `ETF à dividende — ${label}`, description: `Les ETF à dividende du secteur ${l}, classés par taille.` };
    case "de": return { title: `${label}-Dividenden-ETFs`, description: `Dividenden-ETFs der Branche ${label}, nach Größe sortiert.` };
    case "it": return { title: `ETF a dividendo — ${label}`, description: `Gli ETF a dividendo del settore ${l}, ordinati per dimensione.` };
    case "es": return { title: `ETF por dividendo — ${label}`, description: `Los ETF por dividendo del sector ${l}, ordenados por tamaño.` };
    default: return { title: `${label} Dividend ETFs`, description: `Dividend ETFs in ${l}, ranked by size.` };
  }
}

export function monthlyHeader(locale: Locale): PageHeaderStrings {
  switch (locale) {
    case "fr": return { eyebrow: "Dividendes mensuels", title: "Actions à dividende mensuel", description: "Des actions qui versent un dividende chaque mois. Construisez un revenu mensuel régulier." };
    case "de": return { eyebrow: "Monatliche Dividenden", title: "Aktien mit monatlicher Dividende", description: "Aktien, die jeden Monat eine Dividende zahlen. Bauen Sie ein stetiges monatliches Einkommen auf." };
    case "it": return { eyebrow: "Dividendi mensili", title: "Azioni a dividendo mensile", description: "Azioni che pagano un dividendo ogni mese. Costruisci un reddito mensile costante." };
    case "es": return { eyebrow: "Dividendos mensuales", title: "Acciones de dividendo mensual", description: "Acciones que pagan dividendo cada mes. Crea un ingreso mensual constante." };
    default: return { eyebrow: "Monthly Dividends", title: "Monthly Dividend Stocks", description: "Stocks that pay dividends every month. Build a steady monthly income stream." };
  }
}

// Calendar range chips (week/month/year) per locale.
export const CALENDAR_RANGE_LABELS: Record<Locale, { week: string; month: string; year: string }> = {
  en: { week: "This Week", month: "This Month", year: "This Year" },
  fr: { week: "Cette semaine", month: "Ce mois", year: "Cette année" },
  de: { week: "Diese Woche", month: "Dieser Monat", year: "Dieses Jahr" },
  it: { week: "Questa settimana", month: "Questo mese", year: "Quest'anno" },
  es: { week: "Esta semana", month: "Este mes", year: "Este año" },
};

export function calendarHeader(locale: Locale, rangeLabel: string): PageHeaderStrings {
  switch (locale) {
    case "fr": return { eyebrow: "Calendrier", title: `Dates de détachement — ${rangeLabel}`, description: "Pour recevoir un dividende, il faut détenir l'action au plus tard à la date de détachement." };
    case "de": return { eyebrow: "Kalender", title: `Ex-Dividenden-Termine — ${rangeLabel}`, description: "Um eine Dividende zu erhalten, müssen Anleger die Aktie spätestens am Ex-Tag besitzen." };
    case "it": return { eyebrow: "Calendario", title: `Date di stacco — ${rangeLabel}`, description: "Per ricevere un dividendo bisogna possedere l'azione entro la data di stacco." };
    case "es": return { eyebrow: "Calendario", title: `Fechas ex-dividendo — ${rangeLabel}`, description: "Para recibir un dividendo hay que poseer la acción en o antes de la fecha ex-dividendo." };
    default: return { eyebrow: "Calendar", title: `Ex-Dividend Dates — ${rangeLabel}`, description: "In order to capture or receive a dividend, investors must own the stock on or before the ex-dividend date." };
  }
}

export function calendarSummary(locale: Locale, total: number, page: number, totalPages: number): string {
  const n = total.toLocaleString();
  switch (locale) {
    case "fr": return `${n} événements · Page ${page} sur ${totalPages}`;
    case "de": return `${n} Ereignisse · Seite ${page} von ${totalPages}`;
    case "it": return `${n} eventi · Pagina ${page} di ${totalPages}`;
    case "es": return `${n} eventos · Página ${page} de ${totalPages}`;
    default: return `${n} events · Page ${page} of ${totalPages}`;
  }
}

export function calendarEmpty(locale: Locale): string {
  switch (locale) {
    case "fr": return "Aucun détachement de dividende sur cette période.";
    case "de": return "Keine Ex-Dividenden-Termine in diesem Zeitraum.";
    case "it": return "Nessuno stacco di dividendo in questo periodo.";
    case "es": return "No hay fechas ex-dividendo en este periodo.";
    default: return "No ex-dividend events in this range.";
  }
}

// Declaration calendar (client-translated; no /xx/ URL).
export const DECLARATION_RANGE_LABELS: Record<Locale, { week: string; month: string; quarter: string }> = {
  en: { week: "Last Week", month: "Last Month", quarter: "Last Three Months" },
  fr: { week: "Semaine dernière", month: "Mois dernier", quarter: "Trois derniers mois" },
  de: { week: "Letzte Woche", month: "Letzter Monat", quarter: "Letzte drei Monate" },
  it: { week: "Settimana scorsa", month: "Mese scorso", quarter: "Ultimi tre mesi" },
  es: { week: "Semana pasada", month: "Mes pasado", quarter: "Últimos tres meses" },
};

export function declarationHeader(locale: Locale, rangeLabel: string): PageHeaderStrings {
  switch (locale) {
    case "fr": return { eyebrow: "Calendrier", title: `Dates de déclaration — ${rangeLabel}`, description: "Suivez les déclarations de dividendes récentes et préparez-vous aux prochains versements." };
    case "de": return { eyebrow: "Kalender", title: `Ankündigungstermine — ${rangeLabel}`, description: "Verfolgen Sie aktuelle Dividendenankündigungen und bereiten Sie sich auf kommende Ausschüttungen vor." };
    case "it": return { eyebrow: "Calendario", title: `Date di annuncio — ${rangeLabel}`, description: "Segui i recenti annunci di dividendi e preparati ai prossimi pagamenti." };
    case "es": return { eyebrow: "Calendario", title: `Fechas de anuncio — ${rangeLabel}`, description: "Sigue los anuncios de dividendos recientes y prepárate para los próximos pagos." };
    default: return { eyebrow: "Calendar", title: `Declaration Dates — ${rangeLabel}`, description: "Track recent dividend declarations and get ready for upcoming payouts." };
  }
}

export function declarationSummary(locale: Locale, total: number, page: number, totalPages: number): string {
  const n = total.toLocaleString();
  switch (locale) {
    case "fr": return `${n} déclarations · Page ${page} sur ${totalPages}`;
    case "de": return `${n} Ankündigungen · Seite ${page} von ${totalPages}`;
    case "it": return `${n} annunci · Pagina ${page} di ${totalPages}`;
    case "es": return `${n} anuncios · Página ${page} de ${totalPages}`;
    default: return `${n} declarations · Page ${page} of ${totalPages}`;
  }
}

export function declarationEmpty(locale: Locale): string {
  switch (locale) {
    case "fr": return "Aucune déclaration sur cette période.";
    case "de": return "Keine Ankündigungen in diesem Zeitraum.";
    case "it": return "Nessun annuncio in questo periodo.";
    case "es": return "No hay anuncios en este periodo.";
    default: return "No declarations in this range.";
  }
}

export function highYieldHeader(locale: Locale): PageHeaderStrings {
  switch (locale) {
    case "fr": return { eyebrow: "Haut rendement", title: "Actions à fort dividende (rendement > 4 %)", description: "Actions à dividende dont le rendement dépasse 4 %, classées du plus élevé au plus faible." };
    case "de": return { eyebrow: "Hohe Rendite", title: "Aktien mit hoher Dividende (Rendite über 4 %)", description: "Dividenden-Aktien mit einer Rendite über 4 %, von der höchsten zur niedrigsten sortiert." };
    case "it": return { eyebrow: "Alto rendimento", title: "Azioni ad alto rendimento (dividendo oltre il 4 %)", description: "Azioni con un rendimento da dividendo superiore al 4 %, ordinate dal più alto al più basso." };
    case "es": return { eyebrow: "Alta rentabilidad", title: "Acciones de alta rentabilidad (más del 4 %)", description: "Acciones con una rentabilidad por dividendo superior al 4 %, ordenadas de mayor a menor." };
    default: return { eyebrow: "High Yield", title: "Stocks Yielding Over 4%", description: "Dividend stocks with forward yields above 4%, ranked highest to lowest." };
  }
}

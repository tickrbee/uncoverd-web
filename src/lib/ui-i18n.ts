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

export function highYieldHeader(locale: Locale): PageHeaderStrings {
  switch (locale) {
    case "fr": return { eyebrow: "Haut rendement", title: "Actions à fort dividende (rendement > 4 %)", description: "Actions à dividende dont le rendement dépasse 4 %, classées du plus élevé au plus faible." };
    case "de": return { eyebrow: "Hohe Rendite", title: "Aktien mit hoher Dividende (Rendite über 4 %)", description: "Dividenden-Aktien mit einer Rendite über 4 %, von der höchsten zur niedrigsten sortiert." };
    case "it": return { eyebrow: "Alto rendimento", title: "Azioni ad alto rendimento (dividendo oltre il 4 %)", description: "Azioni con un rendimento da dividendo superiore al 4 %, ordinate dal più alto al più basso." };
    case "es": return { eyebrow: "Alta rentabilidad", title: "Acciones de alta rentabilidad (más del 4 %)", description: "Acciones con una rentabilidad por dividendo superior al 4 %, ordenadas de mayor a menor." };
    default: return { eyebrow: "High Yield", title: "Stocks Yielding Over 4%", description: "Dividend stocks with forward yields above 4%, ranked highest to lowest." };
  }
}

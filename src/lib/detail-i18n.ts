import { type Locale } from "@/lib/i18n";

// Translations for the shared stock/ETF detail-page chrome: tab labels and
// stat-card labels. Rendered client-side (Stat / *DetailTabs use useLocale), so
// the structured labels follow the chosen language on every detail page.
// Universal finance tokens (AUM, NAV, ISIN, Beta, P/E Ratio, Volume, CEO) fall
// through to English on purpose.
type Tr = Partial<Record<Exclude<Locale, "en">, string>>;

const DETAIL_I18N: Record<string, Tr> = {
  // --- Tabs ---
  Overview: { fr: "Aperçu", de: "Übersicht", it: "Panoramica", es: "Resumen" },
  "Holdings & Sectors": { fr: "Positions et secteurs", de: "Positionen & Sektoren", it: "Partecipazioni e settori", es: "Posiciones y sectores" },
  Distributions: { fr: "Distributions", de: "Ausschüttungen", it: "Distribuzioni", es: "Distribuciones" },
  Rating: { fr: "Note", de: "Bewertung", it: "Valutazione", es: "Calificación" },
  News: { fr: "Actualités", de: "Nachrichten", it: "Notizie", es: "Noticias" },
  Profile: { fr: "Profil", de: "Profil", it: "Profilo", es: "Perfil" },
  Ratings: { fr: "Notes", de: "Bewertungen", it: "Valutazioni", es: "Calificaciones" },
  Recommendation: { fr: "Recommandation", de: "Empfehlung", it: "Raccomandazione", es: "Recomendación" },
  Payouts: { fr: "Versements", de: "Ausschüttungen", it: "Pagamenti", es: "Pagos" },
  "Div Growth": { fr: "Croissance du div.", de: "Div.-Wachstum", it: "Crescita div.", es: "Crecimiento div." },
  "Capture Strategy": { fr: "Stratégie de capture", de: "Capture-Strategie", it: "Strategia di cattura", es: "Estrategia de captura" },
  Financials: { fr: "États financiers", de: "Finanzen", it: "Bilanci", es: "Finanzas" },
  "News & Research": { fr: "Actualités et analyses", de: "News & Analysen", it: "Notizie e analisi", es: "Noticias y análisis" },

  // --- Stat labels ---
  "1-Year return": { fr: "Rendement 1 an", de: "1-Jahres-Rendite", it: "Rendimento 1 anno", es: "Rentabilidad 1 año" },
  "Asset class": { fr: "Classe d'actifs", de: "Anlageklasse", it: "Classe di attività", es: "Clase de activo" },
  Category: { fr: "Catégorie", de: "Kategorie", it: "Categoria", es: "Categoría" },
  Country: { fr: "Pays", de: "Land", it: "Paese", es: "País" },
  Currency: { fr: "Devise", de: "Währung", it: "Valuta", es: "Moneda" },
  Exchange: { fr: "Place de cotation", de: "Börse", it: "Borsa", es: "Mercado" },
  "Expense ratio": { fr: "Frais de gestion", de: "Kostenquote", it: "Spese correnti", es: "Ratio de gastos" },
  Holdings: { fr: "Positions", de: "Positionen", it: "Partecipazioni", es: "Posiciones" },
  Inception: { fr: "Création", de: "Auflage", it: "Avvio", es: "Creación" },
  Issuer: { fr: "Émetteur", de: "Emittent", it: "Emittente", es: "Emisor" },
  "10Y Growth": { fr: "Croissance 10 ans", de: "10J-Wachstum", it: "Crescita 10 anni", es: "Crecimiento 10 a." },
  "5Y Growth": { fr: "Croissance 5 ans", de: "5J-Wachstum", it: "Crescita 5 anni", es: "Crecimiento 5 a." },
  "3Y Growth": { fr: "Croissance 3 ans", de: "3J-Wachstum", it: "Crescita 3 anni", es: "Crecimiento 3 a." },
  "1Y Growth": { fr: "Croissance 1 an", de: "1J-Wachstum", it: "Crescita 1 anno", es: "Crecimiento 1 a." },
  "52-Week Range": { fr: "Plage 52 sem.", de: "52-Wochen-Spanne", it: "Range 52 sett.", es: "Rango 52 sem." },
  "Annual Dividend": { fr: "Dividende annuel", de: "Jährliche Dividende", it: "Dividendo annuo", es: "Dividendo anual" },
  "Current Payout Ratio": { fr: "Ratio de distribution actuel", de: "Aktuelle Ausschüttungsquote", it: "Payout attuale", es: "Pay-out actual" },
  "Dividend Yield": { fr: "Rendement du dividende", de: "Dividendenrendite", it: "Rendimento da dividendo", es: "Rentabilidad por dividendo" },
  Employees: { fr: "Employés", de: "Mitarbeiter", it: "Dipendenti", es: "Empleados" },
  Frequency: { fr: "Fréquence", de: "Rhythmus", it: "Frequenza", es: "Frecuencia" },
  "IPO Date": { fr: "Date d'introduction", de: "IPO-Datum", it: "Data IPO", es: "Fecha de salida a bolsa" },
  Industry: { fr: "Industrie", de: "Branche", it: "Industria", es: "Industria" },
  "Last Dividend": { fr: "Dernier dividende", de: "Letzte Dividende", it: "Ultimo dividendo", es: "Último dividendo" },
  "Market Cap": { fr: "Capitalisation", de: "Marktkap.", it: "Capitalizzazione", es: "Capitalización" },
  "Next/Last Ex-Date": { fr: "Prochain/Dernier détachement", de: "Nächster/Letzter Ex-Tag", it: "Prossimo/Ultimo stacco", es: "Próximo/Último ex-dividendo" },
  "Payout Ratio": { fr: "Ratio de distribution", de: "Ausschüttungsquote", it: "Payout", es: "Pay-out" },
  Sector: { fr: "Secteur", de: "Sektor", it: "Settore", es: "Sector" },
  "Trailing 12-mo Total": { fr: "Total 12 derniers mois", de: "Letzte 12 Monate gesamt", it: "Totale 12 mesi", es: "Total 12 meses" },
  "Yield (FWD)": { fr: "Rendement (prév.)", de: "Rendite (erw.)", it: "Rendimento (prev.)", es: "Rentabilidad (prev.)" },
};

/** Translate a detail-page tab/stat label; unknown/universal tokens stay English. */
export function dLabel(text: string, locale: Locale): string {
  if (locale === "en") return text;
  return DETAIL_I18N[text]?.[locale] ?? text;
}

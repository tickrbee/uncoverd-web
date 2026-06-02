import type { Locale } from "@/lib/i18n";

// Render-time translation for the shared DividendTable / CalendarTable column
// headers + chrome. Keyed by the English header string, so the column
// definitions stay untouched and untranslated keys (P/E, YTD, 1Y, CAGR…) fall
// through to English, which is universal in finance tables.
const T: Record<Exclude<Locale, "en">, Record<string, string>> = {
  fr: {
    Name: "Société", Price: "Cours", "Market Cap": "Capitalisation", "Yield (FWD)": "Rendement",
    "Ex-Div Date": "Détachement", Amount: "Montant", Rating: "Note", Sector: "Secteur",
    Frequency: "Fréquence", "Ex-Div": "Détachement", Payment: "Versement", "Days to Recover": "Jours de récupération",
    "Payout Ratio": "Ratio de distribution", "EPS Growth": "Croissance BPA", "Consec Increases": "Hausses consécutives",
    "Earnings Growth": "Croissance des bénéfices", Reliability: "Fiabilité", Uptrend: "Tendance",
    Verdict: "Verdict", Composite: "Composite", "Yield Attractiveness": "Attrait du rendement",
    "% Off 52w High": "% sous plus-haut 52s", "Net Debt/EBITDA": "Dette nette/EBITDA", "Yield FWD Div": "Rendement (à venir)",
    Watch: "Suivre", "As of": "Au", Declaration: "Déclaration", "Payment Date": "Date de versement",
    Dividend: "Dividende", "Ex-Date": "Détachement", Previous: "Précédent", Change: "Variation",
  },
  de: {
    Name: "Unternehmen", Price: "Kurs", "Market Cap": "Marktkap.", "Yield (FWD)": "Rendite",
    "Ex-Div Date": "Ex-Tag", Amount: "Betrag", Rating: "Bewertung", Sector: "Sektor",
    Frequency: "Rhythmus", "Ex-Div": "Ex-Tag", Payment: "Zahlung", "Days to Recover": "Erholungstage",
    "Payout Ratio": "Ausschüttungsquote", "EPS Growth": "EPS-Wachstum", "Consec Increases": "Erhöhungen in Folge",
    "Earnings Growth": "Gewinnwachstum", Reliability: "Zuverlässigkeit", Uptrend: "Aufwärtstrend",
    Verdict: "Urteil", Composite: "Gesamt", "Yield Attractiveness": "Rendite-Attraktivität",
    "% Off 52w High": "% unter 52W-Hoch", "Net Debt/EBITDA": "Nettoverschuldung/EBITDA", "Yield FWD Div": "Rendite (erwartet)",
    Watch: "Merken", "As of": "Stand", Declaration: "Ankündigung", "Payment Date": "Zahltag",
    Dividend: "Dividende", "Ex-Date": "Ex-Tag", Previous: "Vorher", Change: "Änderung",
  },
  it: {
    Name: "Società", Price: "Prezzo", "Market Cap": "Capitalizzazione", "Yield (FWD)": "Rendimento",
    "Ex-Div Date": "Stacco", Amount: "Importo", Rating: "Valutazione", Sector: "Settore",
    Frequency: "Frequenza", "Ex-Div": "Stacco", Payment: "Pagamento", "Days to Recover": "Giorni di recupero",
    "Payout Ratio": "Payout", "EPS Growth": "Crescita EPS", "Consec Increases": "Aumenti consecutivi",
    "Earnings Growth": "Crescita utili", Reliability: "Affidabilità", Uptrend: "Trend rialzista",
    Verdict: "Giudizio", Composite: "Composito", "Yield Attractiveness": "Attrattività rendimento",
    "% Off 52w High": "% sotto max 52s", "Net Debt/EBITDA": "Debito netto/EBITDA", "Yield FWD Div": "Rendimento (atteso)",
    Watch: "Segui", "As of": "Al", Declaration: "Annuncio", "Payment Date": "Data di pagamento",
    Dividend: "Dividendo", "Ex-Date": "Stacco", Previous: "Precedente", Change: "Variazione",
  },
  es: {
    Name: "Empresa", Price: "Precio", "Market Cap": "Capitalización", "Yield (FWD)": "Rentabilidad",
    "Ex-Div Date": "Ex-dividendo", Amount: "Importe", Rating: "Valoración", Sector: "Sector",
    Frequency: "Frecuencia", "Ex-Div": "Ex-dividendo", Payment: "Pago", "Days to Recover": "Días de recuperación",
    "Payout Ratio": "Pay-out", "EPS Growth": "Crecimiento BPA", "Consec Increases": "Aumentos consecutivos",
    "Earnings Growth": "Crecimiento de beneficios", Reliability: "Fiabilidad", Uptrend: "Tendencia alcista",
    Verdict: "Veredicto", Composite: "Compuesto", "Yield Attractiveness": "Atractivo de rentabilidad",
    "% Off 52w High": "% bajo máx. 52s", "Net Debt/EBITDA": "Deuda neta/EBITDA", "Yield FWD Div": "Rentabilidad (prev.)",
    Watch: "Seguir", "As of": "A fecha", Declaration: "Anuncio", "Payment Date": "Fecha de pago",
    Dividend: "Dividendo", "Ex-Date": "Ex-dividendo", Previous: "Anterior", Change: "Variación",
  },
};

/** Translate a table header/chrome label; unknown keys fall through to English. */
export function th(label: string, locale: Locale): string {
  if (locale === "en") return label;
  return T[locale]?.[label] ?? label;
}

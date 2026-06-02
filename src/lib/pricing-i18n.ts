import { type Locale } from "@/lib/i18n";

// Translations for the pricing cards (PricingCards is client + useLocale).
type Tr = Partial<Record<Exclude<Locale, "en">, string>>;

const PRICING_I18N: Record<string, Tr> = {
  // Plan names (Premium/Pro kept as-is across locales)
  Free: { fr: "Gratuit", de: "Kostenlos", it: "Gratis", es: "Gratis" },
  // Prices
  "$100 / year": { fr: "100 $ / an", de: "100 $ / Jahr", it: "100 $ / anno", es: "100 $ / año" },
  "$199 / year": { fr: "199 $ / an", de: "199 $ / Jahr", it: "199 $ / anno", es: "199 $ / año" },
  // Descriptions
  "Full access to dividend research, model portfolios, screener, watchlist, and ad-free browsing.": { fr: "Accès complet à la recherche sur les dividendes, aux portefeuilles modèles, au screener, à la liste de suivi et à une navigation sans publicité.", de: "Voller Zugriff auf Dividenden-Research, Musterportfolios, Screener, Watchlist und werbefreies Surfen.", it: "Accesso completo alla ricerca sui dividendi, ai portafogli modello, allo screener, alla watchlist e alla navigazione senza pubblicità.", es: "Acceso completo a la investigación de dividendos, carteras modelo, screener, lista de seguimiento y navegación sin anuncios." },
  "Get started with the basics.": { fr: "Commencez avec l'essentiel.", de: "Starten Sie mit den Grundlagen.", it: "Inizia con le basi.", es: "Empieza con lo básico." },
  // Premium features
  "All Model Portfolios (High Yield, Growth, Protection)": { fr: "Tous les portefeuilles modèles (Haut rendement, Croissance, Protection)", de: "Alle Musterportfolios (Hohe Rendite, Wachstum, Schutz)", it: "Tutti i portafogli modello (Alto rendimento, Crescita, Protezione)", es: "Todas las carteras modelo (Alta rentabilidad, Crecimiento, Protección)" },
  "Best Monthly Dividend & Best Sector lists": { fr: "Listes Meilleurs dividendes mensuels et Meilleurs secteurs", de: "Listen „Beste monatliche Dividende“ & „Beste Sektoren“", it: "Liste Migliori dividendi mensili e Migliori settori", es: "Listas de Mejores dividendos mensuales y Mejores sectores" },
  "Best Dividend Capture stocks": { fr: "Meilleures actions de capture de dividende", de: "Beste Dividenden-Capture-Aktien", it: "Migliori azioni di cattura del dividendo", es: "Mejores acciones de captura de dividendo" },
  "Payout Estimator & Compounding Calculator": { fr: "Estimateur de versement et calculateur d'intérêts composés", de: "Ausschüttungsrechner & Zinseszinsrechner", it: "Stimatore dei pagamenti e calcolatore dell'interesse composto", es: "Estimador de pagos y calculadora de interés compuesto" },
  "Dividend Ratings on every stock": { fr: "Notes de dividende sur chaque action", de: "Dividendenbewertungen für jede Aktie", it: "Valutazioni dei dividendi su ogni azione", es: "Calificaciones de dividendo en cada acción" },
  "CSV data downloads for spreadsheets": { fr: "Téléchargements de données CSV pour tableurs", de: "CSV-Datenexport für Tabellen", it: "Download dei dati in CSV per fogli di calcolo", es: "Descargas de datos en CSV para hojas de cálculo" },
  "Dividend Watchlist with alerts": { fr: "Liste de suivi des dividendes avec alertes", de: "Dividenden-Watchlist mit Benachrichtigungen", it: "Watchlist dei dividendi con avvisi", es: "Lista de seguimiento de dividendos con alertas" },
  "In-depth dividend news & research": { fr: "Actualités et analyses approfondies sur les dividendes", de: "Ausführliche Dividenden-News & -Analysen", it: "Notizie e analisi approfondite sui dividendi", es: "Noticias y análisis de dividendos en profundidad" },
  "Upcoming increasers, decreasers, initiations & special payers": { fr: "Hausses, baisses, initiations et dividendes exceptionnels à venir", de: "Bevorstehende Erhöhungen, Kürzungen, Einführungen & Sonderzahler", it: "Prossimi aumenti, riduzioni, avvii e pagatori straordinari", es: "Próximos aumentos, reducciones, inicios y pagadores especiales" },
  "No ads": { fr: "Sans publicité", de: "Keine Werbung", it: "Senza pubblicità", es: "Sin anuncios" },
  // Free features
  "Stock screener with basic filters": { fr: "Screener d'actions avec filtres de base", de: "Aktien-Screener mit Basisfiltern", it: "Screener di azioni con filtri di base", es: "Screener de acciones con filtros básicos" },
  "Ex-dividend calendar": { fr: "Calendrier des détachements", de: "Ex-Dividenden-Kalender", it: "Calendario degli stacchi", es: "Calendario de ex-dividendos" },
  "Public dividend news feed": { fr: "Fil d'actualités publiques sur les dividendes", de: "Öffentlicher Dividenden-News-Feed", it: "Feed pubblico di notizie sui dividendi", es: "Feed público de noticias de dividendos" },
  "Basic stock profiles & dividend history": { fr: "Profils d'actions de base et historique des dividendes", de: "Basis-Aktienprofile & Dividendenhistorie", it: "Profili azionari di base e storico dei dividendi", es: "Perfiles básicos de acciones e historial de dividendos" },
  // Buttons / chrome
  "Current Plan": { fr: "Forfait actuel", de: "Aktueller Plan", it: "Piano attuale", es: "Plan actual" },
  "Log in": { fr: "Connexion", de: "Anmelden", it: "Accedi", es: "Iniciar sesión" },
  "Redirecting...": { fr: "Redirection…", de: "Weiterleitung…", it: "Reindirizzamento…", es: "Redirigiendo…" },
  Downgrade: { fr: "Rétrograder", de: "Herabstufen", it: "Esegui il downgrade", es: "Bajar de plan" },
};

export function pLabel(text: string, locale: Locale): string {
  if (locale === "en") return text;
  // Normalize the &amp; entity that appears in one feature string.
  const key = text.replace(/&amp;/g, "&");
  return PRICING_I18N[key]?.[locale] ?? text;
}

// Localized plan name (Premium/Pro stay; Free is translated).
export function planName(name: string, locale: Locale): string {
  return pLabel(name, locale);
}

// Templated CTA buttons ("Choose Premium", "Upgrade to Pro", …).
export function planCta(kind: "choose" | "upgrade" | "downgrade", name: string, locale: Locale): string {
  const n = planName(name, locale);
  switch (locale) {
    case "fr": return kind === "choose" ? `Choisir ${n}` : kind === "upgrade" ? `Passer à ${n}` : `Rétrograder vers ${n}`;
    case "de": return kind === "choose" ? `${n} wählen` : kind === "upgrade" ? `Upgrade auf ${n}` : `Herabstufen auf ${n}`;
    case "it": return kind === "choose" ? `Scegli ${n}` : kind === "upgrade" ? `Passa a ${n}` : `Esegui il downgrade a ${n}`;
    case "es": return kind === "choose" ? `Elegir ${n}` : kind === "upgrade" ? `Cambiar a ${n}` : `Bajar a ${n}`;
    default: return kind === "choose" ? `Choose ${name}` : kind === "upgrade" ? `Upgrade to ${name}` : `Downgrade to ${name}`;
  }
}

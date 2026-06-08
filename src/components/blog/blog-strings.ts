import type { Locale } from "@/lib/i18n";

// Localized chrome for the blog (titles, labels). Article bodies themselves
// are authored per-language in content/blog/<locale>/.
type Strings = {
  blogTitle: string;
  blogTagline: string;
  blogDescription: string;
  backToBlog: string;
  published: string;
  updated: string;
  faqHeading: string;
  home: string;
  by: string;
  reviewedBy: string;
  factCheckedBy: string;
  defaultAuthor: string;
  definitionLabel: string;
  keyTakeawaysHeading: string;
  topPickCta: string;
};

export const BLOG_STRINGS: Record<Locale, Strings> = {
  en: {
    blogTitle: "Dividend Blog",
    blogTagline: "Guides & research",
    blogDescription:
      "Dividend investing guides, calculators and research from uncoverd — how to find, value and track dividend stocks and ETFs.",
    backToBlog: "← All articles",
    published: "Published",
    updated: "Updated",
    faqHeading: "Frequently asked questions",
    home: "Home",
    by: "By",
    reviewedBy: "Reviewed by",
    factCheckedBy: "Fact checked by",
    defaultAuthor: "uncoverd Research Team",
    definitionLabel: "Definition",
    keyTakeawaysHeading: "Key takeaways",
    topPickCta: "See uncoverd's top-rated dividend stock this month →",
  },
  fr: {
    blogTitle: "Blog Dividendes",
    blogTagline: "Guides et analyses",
    blogDescription:
      "Guides sur l'investissement en dividendes, calculateurs et analyses uncoverd — comment trouver, évaluer et suivre les actions et ETF à dividende.",
    backToBlog: "← Tous les articles",
    published: "Publié le",
    updated: "Mis à jour le",
    faqHeading: "Questions fréquentes",
    home: "Accueil",
    by: "Par",
    reviewedBy: "Revu par",
    factCheckedBy: "Vérifié par",
    defaultAuthor: "L'équipe de recherche uncoverd",
    definitionLabel: "Définition",
    keyTakeawaysHeading: "Points clés",
    topPickCta: "Découvrez l'action à dividende la mieux notée du mois sur uncoverd →",
  },
  de: {
    blogTitle: "Dividenden-Blog",
    blogTagline: "Ratgeber & Analysen",
    blogDescription:
      "Ratgeber zum Dividenden-Investieren, Rechner und Analysen von uncoverd — Dividendenaktien und -ETFs finden, bewerten und verfolgen.",
    backToBlog: "← Alle Artikel",
    published: "Veröffentlicht am",
    updated: "Aktualisiert am",
    faqHeading: "Häufig gestellte Fragen",
    home: "Startseite",
    by: "Von",
    reviewedBy: "Geprüft von",
    factCheckedBy: "Fakten geprüft von",
    defaultAuthor: "uncoverd Research-Team",
    definitionLabel: "Definition",
    keyTakeawaysHeading: "Das Wichtigste in Kürze",
    topPickCta: "Die bestbewertete Dividendenaktie des Monats auf uncoverd ansehen →",
  },
  it: {
    blogTitle: "Blog Dividendi",
    blogTagline: "Guide e analisi",
    blogDescription:
      "Guide sull'investimento in dividendi, calcolatori e analisi di uncoverd — come trovare, valutare e monitorare azioni ed ETF a dividendo.",
    backToBlog: "← Tutti gli articoli",
    published: "Pubblicato il",
    updated: "Aggiornato il",
    faqHeading: "Domande frequenti",
    home: "Home",
    by: "Di",
    reviewedBy: "Revisionato da",
    factCheckedBy: "Verificato da",
    defaultAuthor: "Team di ricerca uncoverd",
    definitionLabel: "Definizione",
    keyTakeawaysHeading: "Punti chiave",
    topPickCta: "Scopri l'azione a dividendo meglio valutata del mese su uncoverd →",
  },
  es: {
    blogTitle: "Blog de Dividendos",
    blogTagline: "Guías y análisis",
    blogDescription:
      "Guías de inversión en dividendos, calculadoras y análisis de uncoverd — cómo encontrar, valorar y seguir acciones y ETF de dividendos.",
    backToBlog: "← Todos los artículos",
    published: "Publicado el",
    updated: "Actualizado el",
    faqHeading: "Preguntas frecuentes",
    home: "Inicio",
    by: "Por",
    reviewedBy: "Revisado por",
    factCheckedBy: "Verificado por",
    defaultAuthor: "Equipo de investigación de uncoverd",
    definitionLabel: "Definición",
    keyTakeawaysHeading: "Puntos clave",
    topPickCta: "Descubre la acción de dividendo mejor valorada del mes en uncoverd →",
  },
};

const DATE_LOCALE: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES",
};

export function formatPostDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(DATE_LOCALE[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

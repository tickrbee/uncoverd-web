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

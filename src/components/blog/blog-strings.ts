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
  // Conversion rail + inline gates (prototype redesign).
  ratingCardLabel: string;
  unlockRating: string;
  fairValueLabel: string;
  lockedTitle: string;
  lockedBody: string;
  lockedCta: string;
  putToWork: string;
  toolHealthcheck: string;
  toolHealthcheckNote: string;
  toolAlternatives: string;
  toolAlternativesNote: string;
  toolCompare: string;
  toolCompareNote: string;
  toolBest: string;
  toolBestNote: string;
  endCtaKicker: string;
  endCtaTitle: string;
  endCtaBody: string;
  endCtaBtn: string;
  endCtaSecondary: string;
  mobileCta: string;
  // Inline mid-article promo banners (rotate: best list / healthcheck / generator).
  bannerBestTitle: string;
  bannerBestBody: string;
  bannerBestCta: string;
  bannerHealthTitle: string;
  bannerHealthBody: string;
  bannerHealthCta: string;
  bannerGenTitle: string;
  bannerGenBody: string;
  bannerGenCta: string;
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
    ratingCardLabel: "uncoverd rating",
    unlockRating: "Unlock the full rating",
    fairValueLabel: "Full pillar report & fair-value view",
    lockedTitle: "Read uncoverd's full verdict",
    lockedBody: "The complete A–F rating report, pillar breakdown and how it stacks against every peer — on every stock we cover.",
    lockedCta: "Unlock with Pro",
    putToWork: "Put this to work",
    toolHealthcheck: "Run a Portfolio Healthcheck",
    toolHealthcheckNote: "See what a name like this does to your risk",
    toolAlternatives: "Find a better alternative",
    toolAlternativesNote: "Comparable names that do one thing better",
    toolCompare: "Compare it head-to-head",
    toolCompareNote: "Side-by-side vs its peers",
    toolBest: "Top-rated stocks this month",
    toolBestNote: "The names our model ranks highest right now",
    endCtaKicker: "Stop guessing on catalysts",
    endCtaTitle: "Every stock, rated — with the verdict, not just the news",
    endCtaBody: "A–F ratings on every dividend stock, model portfolios, the screener and the portfolio tools — one flat price.",
    endCtaBtn: "Get Pro — $100/yr",
    endCtaSecondary: "See what's included",
    mobileCta: "Unlock every rating — $100/yr",
    bannerBestTitle: "The 10 top-rated dividend stocks to own this month",
    bannerBestBody: "Our model re-ranks every payer daily. See who sits on top right now.",
    bannerBestCta: "See the list →",
    bannerHealthTitle: "Is your portfolio built for a day like this?",
    bannerHealthBody: "Run the Portfolio Healthcheck — risk, concentration and diversification in one score.",
    bannerHealthCta: "Check my portfolio →",
    bannerGenTitle: "Let the model build your next portfolio",
    bannerGenBody: "Top-rated holdings, measured risk, six optimizations — sized to your amount.",
    bannerGenCta: "Generate a portfolio →",
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
    ratingCardLabel: "Note uncoverd",
    unlockRating: "Débloquer la note complète",
    fairValueLabel: "Rapport complet par pilier & juste valeur",
    lockedTitle: "Lisez le verdict complet d'uncoverd",
    lockedBody: "Le rapport de notation A–F complet, le détail par pilier et la comparaison face à tous ses pairs — sur chaque action couverte.",
    lockedCta: "Débloquer avec Pro",
    putToWork: "Passez à l'action",
    toolHealthcheck: "Lancer un bilan de portefeuille",
    toolHealthcheckNote: "L'effet d'un titre comme celui-ci sur votre risque",
    toolAlternatives: "Trouver une meilleure alternative",
    toolAlternativesNote: "Des pairs comparables qui font mieux sur un axe",
    toolCompare: "Comparer face à face",
    toolCompareNote: "Côte à côte avec ses pairs",
    toolBest: "Les actions les mieux notées ce mois-ci",
    toolBestNote: "Les titres les mieux classés par notre modèle",
    endCtaKicker: "Ne devinez plus les catalyseurs",
    endCtaTitle: "Chaque action, notée — avec le verdict, pas seulement la nouvelle",
    endCtaBody: "Notes A–F sur chaque action à dividende, portefeuilles modèles, screener et outils de portefeuille — un seul tarif.",
    endCtaBtn: "Passer Pro — 100 $/an",
    endCtaSecondary: "Voir ce qui est inclus",
    mobileCta: "Débloquez toutes les notes — 100 $/an",
    bannerBestTitle: "Les 10 actions à dividende les mieux notées du mois",
    bannerBestBody: "Notre modèle reclasse chaque payeur quotidiennement. Voyez qui est en tête en ce moment.",
    bannerBestCta: "Voir la liste →",
    bannerHealthTitle: "Votre portefeuille est-il prêt pour une journée comme celle-ci ?",
    bannerHealthBody: "Lancez le bilan de portefeuille — risque, concentration et diversification en un seul score.",
    bannerHealthCta: "Analyser mon portefeuille →",
    bannerGenTitle: "Laissez le modèle construire votre prochain portefeuille",
    bannerGenBody: "Titres bien notés, risque mesuré, six optimisations — à la taille de votre montant.",
    bannerGenCta: "Générer un portefeuille →",
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
    ratingCardLabel: "uncoverd-Bewertung",
    unlockRating: "Komplette Bewertung freischalten",
    fairValueLabel: "Voller Säulen-Report & Fair-Value-Sicht",
    lockedTitle: "Das vollständige uncoverd-Urteil lesen",
    lockedBody: "Der komplette A–F-Bewertungsreport, die Säulen-Aufschlüsselung und der Vergleich mit allen Peers — für jede abgedeckte Aktie.",
    lockedCta: "Mit Pro freischalten",
    putToWork: "Direkt anwenden",
    toolHealthcheck: "Portfolio-Check starten",
    toolHealthcheckNote: "Was so ein Wert mit Ihrem Risiko macht",
    toolAlternatives: "Bessere Alternative finden",
    toolAlternativesNote: "Vergleichbare Werte, die eine Sache besser machen",
    toolCompare: "Direkt vergleichen",
    toolCompareNote: "Seite an Seite mit den Peers",
    toolBest: "Bestbewertete Aktien des Monats",
    toolBestNote: "Die aktuell höchstplatzierten Werte unseres Modells",
    endCtaKicker: "Schluss mit Raten bei Katalysatoren",
    endCtaTitle: "Jede Aktie bewertet — mit Urteil, nicht nur mit News",
    endCtaBody: "A–F-Bewertungen für jede Dividendenaktie, Musterportfolios, Screener und Portfolio-Tools — ein fester Preis.",
    endCtaBtn: "Pro holen — 100 $/Jahr",
    endCtaSecondary: "Alles Inklusive ansehen",
    mobileCta: "Alle Bewertungen freischalten — 100 $/Jahr",
    bannerBestTitle: "Die 10 bestbewerteten Dividendenaktien des Monats",
    bannerBestBody: "Unser Modell stuft jeden Zahler täglich neu ein. Sehen Sie, wer gerade vorne liegt.",
    bannerBestCta: "Liste ansehen →",
    bannerHealthTitle: "Ist Ihr Portfolio für so einen Tag gebaut?",
    bannerHealthBody: "Portfolio-Check starten — Risiko, Konzentration und Diversifikation in einem Score.",
    bannerHealthCta: "Portfolio prüfen →",
    bannerGenTitle: "Lassen Sie das Modell Ihr nächstes Portfolio bauen",
    bannerGenBody: "Bestbewertete Positionen, gemessenes Risiko, sechs Optimierungen — passend zu Ihrem Betrag.",
    bannerGenCta: "Portfolio generieren →",
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
    ratingCardLabel: "Valutazione uncoverd",
    unlockRating: "Sblocca la valutazione completa",
    fairValueLabel: "Report completo per pilastro & fair value",
    lockedTitle: "Leggi il verdetto completo di uncoverd",
    lockedBody: "Il report di valutazione A–F completo, il dettaglio per pilastro e il confronto con tutti i peer — su ogni azione coperta.",
    lockedCta: "Sblocca con Pro",
    putToWork: "Mettilo in pratica",
    toolHealthcheck: "Avvia un check del portafoglio",
    toolHealthcheckNote: "L'effetto di un titolo così sul tuo rischio",
    toolAlternatives: "Trova un'alternativa migliore",
    toolAlternativesNote: "Peer comparabili che fanno meglio su un asse",
    toolCompare: "Confrontalo testa a testa",
    toolCompareNote: "Fianco a fianco con i suoi peer",
    toolBest: "Le azioni meglio valutate del mese",
    toolBestNote: "I titoli più in alto nel nostro modello adesso",
    endCtaKicker: "Basta indovinare i catalizzatori",
    endCtaTitle: "Ogni azione, valutata — con il verdetto, non solo la notizia",
    endCtaBody: "Valutazioni A–F su ogni azione a dividendo, portafogli modello, screener e strumenti di portafoglio — un solo prezzo.",
    endCtaBtn: "Passa a Pro — 100 $/anno",
    endCtaSecondary: "Vedi cosa è incluso",
    mobileCta: "Sblocca tutte le valutazioni — 100 $/anno",
    bannerBestTitle: "Le 10 azioni a dividendo meglio valutate del mese",
    bannerBestBody: "Il nostro modello riclassifica ogni titolo ogni giorno. Guarda chi è in cima adesso.",
    bannerBestCta: "Vedi la lista →",
    bannerHealthTitle: "Il tuo portafoglio è pronto per una giornata così?",
    bannerHealthBody: "Avvia il check del portafoglio — rischio, concentrazione e diversificazione in un solo punteggio.",
    bannerHealthCta: "Analizza il mio portafoglio →",
    bannerGenTitle: "Lascia che il modello costruisca il tuo prossimo portafoglio",
    bannerGenBody: "Titoli ben valutati, rischio misurato, sei ottimizzazioni — sulla misura del tuo importo.",
    bannerGenCta: "Genera un portafoglio →",
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
    ratingCardLabel: "Calificación uncoverd",
    unlockRating: "Desbloquear la calificación completa",
    fairValueLabel: "Informe completo por pilar y valor razonable",
    lockedTitle: "Lee el veredicto completo de uncoverd",
    lockedBody: "El informe de calificación A–F completo, el desglose por pilares y la comparación con todos sus pares — en cada acción cubierta.",
    lockedCta: "Desbloquear con Pro",
    putToWork: "Ponlo en práctica",
    toolHealthcheck: "Hacer un chequeo de cartera",
    toolHealthcheckNote: "El efecto de un valor así en tu riesgo",
    toolAlternatives: "Encontrar una alternativa mejor",
    toolAlternativesNote: "Pares comparables que hacen algo mejor",
    toolCompare: "Compararla cara a cara",
    toolCompareNote: "Lado a lado con sus pares",
    toolBest: "Las acciones mejor valoradas del mes",
    toolBestNote: "Los valores mejor clasificados por nuestro modelo",
    endCtaKicker: "Deja de adivinar los catalizadores",
    endCtaTitle: "Cada acción, calificada — con el veredicto, no solo la noticia",
    endCtaBody: "Calificaciones A–F en cada acción de dividendo, carteras modelo, screener y herramientas de cartera — un precio único.",
    endCtaBtn: "Hazte Pro — 100 $/año",
    endCtaSecondary: "Ver qué incluye",
    mobileCta: "Desbloquea todas las calificaciones — 100 $/año",
    bannerBestTitle: "Las 10 acciones de dividendo mejor valoradas del mes",
    bannerBestBody: "Nuestro modelo reclasifica cada valor a diario. Mira quién está arriba ahora mismo.",
    bannerBestCta: "Ver la lista →",
    bannerHealthTitle: "¿Está tu cartera preparada para un día como este?",
    bannerHealthBody: "Haz el chequeo de cartera — riesgo, concentración y diversificación en una sola puntuación.",
    bannerHealthCta: "Analizar mi cartera →",
    bannerGenTitle: "Deja que el modelo construya tu próxima cartera",
    bannerGenBody: "Valores bien calificados, riesgo medido, seis optimizaciones — al tamaño de tu importe.",
    bannerGenCta: "Generar una cartera →",
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

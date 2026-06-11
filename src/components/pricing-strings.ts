import type { Locale } from "@/lib/i18n";

// All localized copy for /pricing. SSR renders English (canonical, cacheable);
// the locale cookie applies the user's language on hydration (use-locale.ts).
export type PricingStr = {
  redirecting: string;
  heroKicker: string; heroTitle: string; heroSub: string; heroCta: string; heroMonthly: string; heroCancel: string;
  planFree: { name: string; sub: string; tagline: string; points: string[]; capNote: string; cta: string };
  planPro: { name: string; sub: string; tagline: string; points: string[]; capNote: string; cta: string; badge: string };
  plansFoot: string;
  unlocksKicker: string; unlocksTitle: string;
  unlocks: { icon: string; title: string; body: string }[];
  cmpKicker: string; cmpTitle: string; cmpFeature: string; cmpFree: string; cmpPro: string;
  compare: { group: string; rows: { f: string; free: boolean | string; prem: boolean | string }[] }[];
  faqKicker: string; faqTitle: string;
  faqs: { q: string; a: string }[];
  finalTitle: string; finalSub: string; finalCta: string; finalLink: string;
};

export const PRICING_STR: Record<Locale, PricingStr> = {
  en: {
    redirecting: "Redirecting…",
    heroKicker: "Pricing",
    heroTitle: "Every edge in dividend investing. One flat price.",
    heroSub: "A rating on every stock, model portfolios, curated best-of lists, dividend-capture picks, income tools and alerts — all included, all the time.",
    heroCta: "Get Pro — $100 / year", heroMonthly: "About $8.33 / month", heroCancel: "Cancel anytime · Secure checkout via Stripe",
    planFree: {
      name: "Free", sub: "forever", tagline: "Browse the basics",
      points: ["Stock & ETF screener (basic filters)", "Ex-dividend calendar", "Standard dividend news feed", "Stock profiles & full dividend history"],
      capNote: "no card required", cta: "Keep browsing free",
    },
    planPro: {
      name: "Pro", sub: "/ year", tagline: "Everything uncoverd, one flat price", badge: "EVERYTHING INCLUDED",
      points: [
        "A–F dividend rating on every stock", "All model portfolios — High-Yield, Growth & Protection",
        "Portfolio Healthcheck & generator on your own holdings",
        "Best monthly payers, sector & dividend-capture lists", "Payout estimator & compounding calculator",
        "Dividend watchlist with alerts", "Upcoming increases, cuts, initiations & specials",
        "CSV downloads for spreadsheets", "Completely ad-free browsing",
      ],
      capNote: "≈ $8.33 / month · billed yearly", cta: "Get Pro",
    },
    plansFoot: "Cancel anytime · Instant access · No data is sold, ever.",
    unlocksKicker: "What Pro unlocks", unlocksTitle: "Research and decisions, not just data tables.",
    unlocks: [
      { icon: "bars", title: "A rating on every stock", body: "An A–F dividend score for all 65,000+ tickers — Value, Growth, Profitability, Momentum and Health, each standardised against industry peers so the grade actually means something." },
      { icon: "grid", title: "Model portfolios", body: "Ready-built High-Yield, Growth and Protection baskets, constructed from our ratings — so you start from a vetted shortlist, not a blank screener." },
      { icon: "sparkles", title: "Curated best-of lists", body: "The best monthly payers, the best in each sector, and the best dividend-capture candidates — screened and ranked, not just sorted by yield." },
      { icon: "alert", title: "Never miss a change", body: "Upcoming increases, cuts, initiations and special dividends — see who's about to raise (or slash) the payout before the market reprices it." },
      { icon: "percent", title: "Income tools", body: "A payout estimator and compounding calculator to project real income over time, plus a watchlist that alerts you on the names you follow." },
      { icon: "send", title: "Your data, exportable", body: "Download any list or screen to CSV for your own spreadsheets and models — and browse the entire site completely ad-free." },
    ],
    cmpKicker: "Free vs Pro", cmpTitle: "Exactly what you get.", cmpFeature: "Feature", cmpFree: "Free", cmpPro: "Pro",
    compare: [
      { group: "Research & data", rows: [
        { f: "Stock & ETF screener", free: "Basic filters", prem: "Advanced filters" },
        { f: "Ex-dividend calendar", free: true, prem: true },
        { f: "Dividend news feed", free: true, prem: "In-depth + research" },
        { f: "Stock profiles & full dividend history", free: true, prem: true },
      ] },
      { group: "Pro intelligence", rows: [
        { f: "A–F dividend rating on every stock", free: false, prem: true },
        { f: "Model portfolios (HY · Growth · Protection)", free: false, prem: true },
        { f: "Curated best-of & dividend-capture lists", free: false, prem: true },
        { f: "Upcoming increases, cuts & specials", free: false, prem: true },
      ] },
      { group: "Portfolio tools", rows: [
        { f: "Portfolio Healthcheck on your own holdings", free: false, prem: true },
        { f: "Portfolio generator (model portfolio builder)", free: false, prem: true },
        { f: "Holdings, weights & dollar sizing", free: false, prem: true },
      ] },
      { group: "Tools & exports", rows: [
        { f: "Payout estimator & compounding calculator", free: false, prem: true },
        { f: "Watchlist with dividend alerts", free: false, prem: true },
        { f: "CSV / spreadsheet downloads", free: false, prem: true },
        { f: "Ad-free experience", free: false, prem: true },
      ] },
    ],
    faqKicker: "Pricing FAQ", faqTitle: "Questions before you upgrade.",
    faqs: [
      { q: "How much is Pro?", a: "Pro is $100 per year — about $8.33 a month — billed once annually. One flat price unlocks everything: ratings, model portfolios, curated lists, income tools, alerts, CSV exports and ad-free browsing. There are no add-ons or tiers." },
      { q: "Can I cancel anytime?", a: "Yes. Cancel in one click from your account and you'll keep Pro until the end of the period you've already paid for. No phone calls, no retention hoops." },
      { q: "What stays free?", a: "The screener with basic filters, the ex-dividend calendar, the standard news feed, and full stock profiles with dividend history all stay free, forever. Pro adds the ratings, portfolios, tools and exports on top." },
      { q: "How do payments work?", a: "Checkout is handled securely by Stripe and access is instant — you're in the moment you pay. We never see or store your card details, and we never sell your data." },
      { q: "How is this different from other dividend sites?", a: "Most sites stop at a yield number. We put a standardised A–F rating on every stock, build model portfolios from those ratings, and flag dividend changes before they're priced in — research and decisions, not just data tables." },
    ],
    finalTitle: "Start finding safer, higher-returning dividends today.",
    finalSub: "One flat price. Everything included. Cancel whenever you like.",
    finalCta: "Get Pro — $100 / year", finalLink: "Explore the free screener →",
  },
  fr: {
    redirecting: "Redirection…",
    heroKicker: "Tarifs",
    heroTitle: "Tous les avantages de l'investissement en dividendes. Un prix unique.",
    heroSub: "Une notation sur chaque action, des portefeuilles modèles, des listes des meilleurs titres, des outils de revenu et des alertes — tout est inclus, tout le temps.",
    heroCta: "Passer Pro — 100 $ / an", heroMonthly: "Environ 8,33 $ / mois", heroCancel: "Résiliable à tout moment · Paiement sécurisé via Stripe",
    planFree: {
      name: "Gratuit", sub: "pour toujours", tagline: "L'essentiel, librement",
      points: ["Screener actions & ETF (filtres de base)", "Calendrier des ex-dividendes", "Fil d'actualité dividendes", "Profils complets avec historique de dividendes"],
      capNote: "sans carte bancaire", cta: "Continuer gratuitement",
    },
    planPro: {
      name: "Pro", sub: "/ an", tagline: "Tout uncoverd, un prix unique", badge: "TOUT INCLUS",
      points: [
        "Notation A–F sur chaque action", "Tous les portefeuilles modèles — Haut Rendement, Croissance & Protection",
        "Bilan de portefeuille & générateur sur vos propres positions",
        "Meilleurs payeurs mensuels, listes sectorielles & dividend-capture", "Estimateur de revenus & calculateur d'intérêts composés",
        "Watchlist avec alertes dividendes", "Hausses, baisses, initiations & dividendes exceptionnels à venir",
        "Exports CSV pour vos tableurs", "Navigation entièrement sans publicité",
      ],
      capNote: "≈ 8,33 $ / mois · facturé à l'année", cta: "Passer Pro",
    },
    plansFoot: "Résiliable à tout moment · Accès instantané · Vos données ne sont jamais vendues.",
    unlocksKicker: "Ce que Pro débloque", unlocksTitle: "De la recherche et des décisions, pas seulement des tableaux.",
    unlocks: [
      { icon: "bars", title: "Une note sur chaque action", body: "Un score A–F sur plus de 65 000 titres — Valeur, Croissance, Rentabilité, Momentum et Santé, standardisés face aux pairs sectoriels pour que la note veuille vraiment dire quelque chose." },
      { icon: "grid", title: "Portefeuilles modèles", body: "Des paniers Haut-Rendement, Croissance et Protection prêts à l'emploi, construits à partir de nos notations — partez d'une shortlist vérifiée, pas d'un screener vide." },
      { icon: "sparkles", title: "Listes des meilleurs", body: "Les meilleurs payeurs mensuels, les meilleurs de chaque secteur et les meilleurs candidats au dividend-capture — filtrés et classés, pas simplement triés par rendement." },
      { icon: "alert", title: "Ne ratez aucun changement", body: "Hausses, baisses, initiations et dividendes exceptionnels à venir — voyez qui s'apprête à augmenter (ou sabrer) son dividende avant que le marché ne l'intègre." },
      { icon: "percent", title: "Outils de revenu", body: "Un estimateur de revenus et un calculateur d'intérêts composés pour projeter votre revenu réel, plus une watchlist qui vous alerte sur vos valeurs." },
      { icon: "send", title: "Vos données, exportables", body: "Téléchargez n'importe quelle liste en CSV pour vos propres modèles — et naviguez sur tout le site sans aucune publicité." },
    ],
    cmpKicker: "Gratuit vs Pro", cmpTitle: "Exactement ce que vous obtenez.", cmpFeature: "Fonctionnalité", cmpFree: "Gratuit", cmpPro: "Pro",
    compare: [
      { group: "Recherche & données", rows: [
        { f: "Screener actions & ETF", free: "Filtres de base", prem: "Filtres avancés" },
        { f: "Calendrier des ex-dividendes", free: true, prem: true },
        { f: "Fil d'actualité dividendes", free: true, prem: "Approfondi + recherche" },
        { f: "Profils & historique complet des dividendes", free: true, prem: true },
      ] },
      { group: "Intelligence Pro", rows: [
        { f: "Notation A–F sur chaque action", free: false, prem: true },
        { f: "Portefeuilles modèles (HR · Croissance · Protection)", free: false, prem: true },
        { f: "Listes des meilleurs & dividend-capture", free: false, prem: true },
        { f: "Hausses, baisses & exceptionnels à venir", free: false, prem: true },
      ] },
      { group: "Outils de portefeuille", rows: [
        { f: "Bilan de portefeuille sur vos positions", free: false, prem: true },
        { f: "Générateur de portefeuille", free: false, prem: true },
        { f: "Positions, pondérations & montants", free: false, prem: true },
      ] },
      { group: "Outils & exports", rows: [
        { f: "Estimateur de revenus & calculateur composé", free: false, prem: true },
        { f: "Watchlist avec alertes dividendes", free: false, prem: true },
        { f: "Exports CSV / tableur", free: false, prem: true },
        { f: "Expérience sans publicité", free: false, prem: true },
      ] },
    ],
    faqKicker: "FAQ tarifs", faqTitle: "Vos questions avant de passer Pro.",
    faqs: [
      { q: "Combien coûte Pro ?", a: "Pro coûte 100 $ par an — environ 8,33 $ par mois — facturé une fois par an. Un prix unique débloque tout : notations, portefeuilles modèles, listes, outils de revenu, alertes, exports CSV et navigation sans publicité. Pas d'options ni de paliers." },
      { q: "Puis-je résilier à tout moment ?", a: "Oui. Résiliez en un clic depuis votre compte et vous conservez Pro jusqu'à la fin de la période déjà payée. Pas d'appel téléphonique, pas de parcours du combattant." },
      { q: "Qu'est-ce qui reste gratuit ?", a: "Le screener avec filtres de base, le calendrier des ex-dividendes, le fil d'actualité standard et les profils complets avec historique de dividendes restent gratuits, pour toujours. Pro ajoute les notations, portefeuilles, outils et exports." },
      { q: "Comment fonctionne le paiement ?", a: "Le paiement est géré de façon sécurisée par Stripe et l'accès est instantané. Nous ne voyons ni ne stockons jamais vos données de carte, et nous ne vendons jamais vos données." },
      { q: "En quoi est-ce différent des autres sites de dividendes ?", a: "La plupart des sites s'arrêtent au rendement. Nous mettons une notation A–F standardisée sur chaque action, construisons des portefeuilles modèles à partir de ces notes et signalons les changements de dividende avant qu'ils ne soient intégrés aux cours." },
    ],
    finalTitle: "Trouvez dès aujourd'hui des dividendes plus sûrs et plus rentables.",
    finalSub: "Un prix unique. Tout inclus. Résiliez quand vous voulez.",
    finalCta: "Passer Pro — 100 $ / an", finalLink: "Explorer le screener gratuit →",
  },
  de: {
    redirecting: "Weiterleitung…",
    heroKicker: "Preise",
    heroTitle: "Jeder Vorteil beim Dividenden-Investieren. Ein Festpreis.",
    heroSub: "Ein Rating für jede Aktie, Modellportfolios, kuratierte Bestenlisten, Income-Tools und Alerts — alles inklusive, jederzeit.",
    heroCta: "Pro holen — 100 $ / Jahr", heroMonthly: "Etwa 8,33 $ / Monat", heroCancel: "Jederzeit kündbar · Sichere Zahlung über Stripe",
    planFree: {
      name: "Gratis", sub: "für immer", tagline: "Die Grundlagen, frei",
      points: ["Aktien- & ETF-Screener (Basisfilter)", "Ex-Dividenden-Kalender", "Standard-Dividenden-News", "Vollständige Profile mit Dividendenhistorie"],
      capNote: "keine Karte nötig", cta: "Gratis weitermachen",
    },
    planPro: {
      name: "Pro", sub: "/ Jahr", tagline: "Alles von uncoverd, ein Festpreis", badge: "ALLES INKLUSIVE",
      points: [
        "A–F-Dividendenrating für jede Aktie", "Alle Modellportfolios — High-Yield, Wachstum & Schutz",
        "Portfolio-Check & Generator für deine eigenen Positionen",
        "Beste Monatszahler, Sektor- & Dividend-Capture-Listen", "Ausschüttungs-Schätzer & Zinseszins-Rechner",
        "Dividenden-Watchlist mit Alerts", "Kommende Erhöhungen, Kürzungen, Initiierungen & Sonderdividenden",
        "CSV-Downloads für Tabellen", "Komplett werbefreies Browsen",
      ],
      capNote: "≈ 8,33 $ / Monat · jährlich abgerechnet", cta: "Pro holen",
    },
    plansFoot: "Jederzeit kündbar · Sofortiger Zugang · Daten werden nie verkauft.",
    unlocksKicker: "Was Pro freischaltet", unlocksTitle: "Research und Entscheidungen, nicht nur Datentabellen.",
    unlocks: [
      { icon: "bars", title: "Ein Rating für jede Aktie", body: "Ein A–F-Score für über 65.000 Titel — Bewertung, Wachstum, Profitabilität, Momentum und Gesundheit, standardisiert gegen Branchen-Peers, damit die Note wirklich etwas bedeutet." },
      { icon: "grid", title: "Modellportfolios", body: "Fertige High-Yield-, Wachstums- und Schutz-Körbe, direkt aus unseren Ratings gebaut — starte mit einer geprüften Shortlist statt einem leeren Screener." },
      { icon: "sparkles", title: "Kuratierte Bestenlisten", body: "Die besten Monatszahler, die besten je Sektor und die besten Dividend-Capture-Kandidaten — gescreent und gerankt, nicht bloß nach Rendite sortiert." },
      { icon: "alert", title: "Keine Änderung verpassen", body: "Kommende Erhöhungen, Kürzungen, Initiierungen und Sonderdividenden — sieh, wer die Ausschüttung gleich anhebt (oder kappt), bevor der Markt es einpreist." },
      { icon: "percent", title: "Income-Tools", body: "Ausschüttungs-Schätzer und Zinseszins-Rechner für dein reales Einkommen über die Zeit, plus eine Watchlist mit Alerts für deine Titel." },
      { icon: "send", title: "Deine Daten, exportierbar", body: "Lade jede Liste als CSV für eigene Tabellen und Modelle herunter — und nutze die gesamte Seite komplett werbefrei." },
    ],
    cmpKicker: "Gratis vs Pro", cmpTitle: "Genau das bekommst du.", cmpFeature: "Funktion", cmpFree: "Gratis", cmpPro: "Pro",
    compare: [
      { group: "Research & Daten", rows: [
        { f: "Aktien- & ETF-Screener", free: "Basisfilter", prem: "Erweiterte Filter" },
        { f: "Ex-Dividenden-Kalender", free: true, prem: true },
        { f: "Dividenden-News", free: true, prem: "Vertieft + Research" },
        { f: "Profile & volle Dividendenhistorie", free: true, prem: true },
      ] },
      { group: "Pro-Intelligenz", rows: [
        { f: "A–F-Rating für jede Aktie", free: false, prem: true },
        { f: "Modellportfolios (HY · Wachstum · Schutz)", free: false, prem: true },
        { f: "Bestenlisten & Dividend-Capture", free: false, prem: true },
        { f: "Kommende Erhöhungen, Kürzungen & Specials", free: false, prem: true },
      ] },
      { group: "Portfolio-Tools", rows: [
        { f: "Portfolio-Check auf eigenen Positionen", free: false, prem: true },
        { f: "Portfolio-Generator", free: false, prem: true },
        { f: "Positionen, Gewichte & Beträge", free: false, prem: true },
      ] },
      { group: "Tools & Exporte", rows: [
        { f: "Ausschüttungs-Schätzer & Zinseszins-Rechner", free: false, prem: true },
        { f: "Watchlist mit Dividenden-Alerts", free: false, prem: true },
        { f: "CSV- / Tabellen-Downloads", free: false, prem: true },
        { f: "Werbefreies Erlebnis", free: false, prem: true },
      ] },
    ],
    faqKicker: "Preis-FAQ", faqTitle: "Fragen vor dem Upgrade.",
    faqs: [
      { q: "Was kostet Pro?", a: "Pro kostet 100 $ pro Jahr — etwa 8,33 $ im Monat — einmal jährlich abgerechnet. Ein Festpreis schaltet alles frei: Ratings, Modellportfolios, Listen, Income-Tools, Alerts, CSV-Exporte und werbefreies Browsen. Keine Add-ons, keine Stufen." },
      { q: "Kann ich jederzeit kündigen?", a: "Ja. Kündige mit einem Klick im Konto und behalte Pro bis zum Ende des bereits bezahlten Zeitraums. Keine Anrufe, keine Hürden." },
      { q: "Was bleibt gratis?", a: "Der Screener mit Basisfiltern, der Ex-Dividenden-Kalender, der Standard-Newsfeed und die vollständigen Profile mit Dividendenhistorie bleiben für immer gratis. Pro legt Ratings, Portfolios, Tools und Exporte obendrauf." },
      { q: "Wie funktioniert die Zahlung?", a: "Der Checkout läuft sicher über Stripe, der Zugang ist sofort da. Wir sehen und speichern deine Kartendaten nie — und verkaufen deine Daten nie." },
      { q: "Was unterscheidet euch von anderen Dividenden-Seiten?", a: "Die meisten Seiten hören bei der Rendite auf. Wir geben jeder Aktie ein standardisiertes A–F-Rating, bauen daraus Modellportfolios und melden Dividendenänderungen, bevor der Markt sie einpreist." },
    ],
    finalTitle: "Finde noch heute sicherere Dividenden mit mehr Rendite.",
    finalSub: "Ein Festpreis. Alles inklusive. Kündbar, wann immer du willst.",
    finalCta: "Pro holen — 100 $ / Jahr", finalLink: "Den Gratis-Screener erkunden →",
  },
  es: {
    redirecting: "Redirigiendo…",
    heroKicker: "Precios",
    heroTitle: "Todas las ventajas de invertir en dividendos. Un precio plano.",
    heroSub: "Una calificación en cada acción, carteras modelo, listas de los mejores, herramientas de ingresos y alertas — todo incluido, siempre.",
    heroCta: "Hazte Pro — 100 $ / año", heroMonthly: "Unos 8,33 $ / mes", heroCancel: "Cancela cuando quieras · Pago seguro con Stripe",
    planFree: {
      name: "Gratis", sub: "para siempre", tagline: "Lo básico, libre",
      points: ["Screener de acciones y ETFs (filtros básicos)", "Calendario de ex-dividendos", "Noticias de dividendos estándar", "Perfiles completos con historial de dividendos"],
      capNote: "sin tarjeta", cta: "Seguir gratis",
    },
    planPro: {
      name: "Pro", sub: "/ año", tagline: "Todo uncoverd, un precio plano", badge: "TODO INCLUIDO",
      points: [
        "Calificación A–F de dividendos en cada acción", "Todas las carteras modelo — Alto Rendimiento, Crecimiento y Protección",
        "Chequeo de cartera y generador con tus propias posiciones",
        "Mejores pagadores mensuales, listas sectoriales y de dividend-capture", "Estimador de ingresos y calculadora de interés compuesto",
        "Watchlist con alertas de dividendos", "Próximas subidas, recortes, inicios y dividendos especiales",
        "Descargas CSV para tus hojas de cálculo", "Navegación totalmente sin anuncios",
      ],
      capNote: "≈ 8,33 $ / mes · cobro anual", cta: "Hazte Pro",
    },
    plansFoot: "Cancela cuando quieras · Acceso instantáneo · Nunca vendemos tus datos.",
    unlocksKicker: "Lo que Pro desbloquea", unlocksTitle: "Investigación y decisiones, no solo tablas de datos.",
    unlocks: [
      { icon: "bars", title: "Una calificación en cada acción", body: "Una nota A–F para más de 65.000 valores — Valor, Crecimiento, Rentabilidad, Momentum y Salud, estandarizadas frente a los pares del sector para que la nota signifique algo de verdad." },
      { icon: "grid", title: "Carteras modelo", body: "Cestas de Alto Rendimiento, Crecimiento y Protección listas para usar, construidas desde nuestras calificaciones — empieza con una lista verificada, no con un screener vacío." },
      { icon: "sparkles", title: "Listas de los mejores", body: "Los mejores pagadores mensuales, los mejores de cada sector y los mejores candidatos de dividend-capture — filtrados y clasificados, no solo ordenados por rentabilidad." },
      { icon: "alert", title: "No te pierdas ningún cambio", body: "Próximas subidas, recortes, inicios y dividendos especiales — ve quién está a punto de subir (o recortar) el pago antes de que el mercado lo descuente." },
      { icon: "percent", title: "Herramientas de ingresos", body: "Un estimador de pagos y una calculadora de interés compuesto para proyectar tu ingreso real, más una watchlist que te avisa de tus valores." },
      { icon: "send", title: "Tus datos, exportables", body: "Descarga cualquier lista en CSV para tus propias hojas y modelos — y navega todo el sitio sin publicidad." },
    ],
    cmpKicker: "Gratis vs Pro", cmpTitle: "Exactamente lo que obtienes.", cmpFeature: "Función", cmpFree: "Gratis", cmpPro: "Pro",
    compare: [
      { group: "Investigación y datos", rows: [
        { f: "Screener de acciones y ETFs", free: "Filtros básicos", prem: "Filtros avanzados" },
        { f: "Calendario de ex-dividendos", free: true, prem: true },
        { f: "Noticias de dividendos", free: true, prem: "En profundidad + análisis" },
        { f: "Perfiles e historial completo de dividendos", free: true, prem: true },
      ] },
      { group: "Inteligencia Pro", rows: [
        { f: "Calificación A–F en cada acción", free: false, prem: true },
        { f: "Carteras modelo (AR · Crecimiento · Protección)", free: false, prem: true },
        { f: "Listas de los mejores y dividend-capture", free: false, prem: true },
        { f: "Próximas subidas, recortes y especiales", free: false, prem: true },
      ] },
      { group: "Herramientas de cartera", rows: [
        { f: "Chequeo de cartera con tus posiciones", free: false, prem: true },
        { f: "Generador de carteras", free: false, prem: true },
        { f: "Posiciones, pesos e importes", free: false, prem: true },
      ] },
      { group: "Herramientas y exportes", rows: [
        { f: "Estimador de pagos y calculadora compuesta", free: false, prem: true },
        { f: "Watchlist con alertas de dividendos", free: false, prem: true },
        { f: "Descargas CSV / hoja de cálculo", free: false, prem: true },
        { f: "Experiencia sin anuncios", free: false, prem: true },
      ] },
    ],
    faqKicker: "FAQ de precios", faqTitle: "Dudas antes de pasarte a Pro.",
    faqs: [
      { q: "¿Cuánto cuesta Pro?", a: "Pro cuesta 100 $ al año — unos 8,33 $ al mes — con un único cobro anual. Un precio plano lo desbloquea todo: calificaciones, carteras modelo, listas, herramientas de ingresos, alertas, exportes CSV y navegación sin anuncios. Sin extras ni niveles." },
      { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Cancela con un clic desde tu cuenta y conservas Pro hasta el final del periodo ya pagado. Sin llamadas ni trabas." },
      { q: "¿Qué sigue siendo gratis?", a: "El screener con filtros básicos, el calendario de ex-dividendos, las noticias estándar y los perfiles completos con historial de dividendos siguen siendo gratis, para siempre. Pro añade calificaciones, carteras, herramientas y exportes." },
      { q: "¿Cómo funciona el pago?", a: "El pago lo gestiona Stripe de forma segura y el acceso es instantáneo. Nunca vemos ni guardamos los datos de tu tarjeta, y nunca vendemos tus datos." },
      { q: "¿En qué se diferencia de otros sitios de dividendos?", a: "La mayoría se queda en el número de rentabilidad. Nosotros ponemos una calificación A–F estandarizada en cada acción, construimos carteras modelo a partir de esas notas y señalamos los cambios de dividendo antes de que coticen." },
    ],
    finalTitle: "Empieza hoy a encontrar dividendos más seguros y rentables.",
    finalSub: "Un precio plano. Todo incluido. Cancela cuando quieras.",
    finalCta: "Hazte Pro — 100 $ / año", finalLink: "Explorar el screener gratis →",
  },
  it: {
    redirecting: "Reindirizzamento…",
    heroKicker: "Prezzi",
    heroTitle: "Ogni vantaggio nell'investire in dividendi. Un prezzo unico.",
    heroSub: "Una valutazione su ogni azione, portafogli modello, liste dei migliori, strumenti da reddito e avvisi — tutto incluso, sempre.",
    heroCta: "Passa a Pro — 100 $ / anno", heroMonthly: "Circa 8,33 $ / mese", heroCancel: "Disdici quando vuoi · Pagamento sicuro con Stripe",
    planFree: {
      name: "Gratis", sub: "per sempre", tagline: "Le basi, liberamente",
      points: ["Screener azioni & ETF (filtri base)", "Calendario ex-dividendo", "Notizie sui dividendi standard", "Profili completi con storico dividendi"],
      capNote: "nessuna carta richiesta", cta: "Continua gratis",
    },
    planPro: {
      name: "Pro", sub: "/ anno", tagline: "Tutto uncoverd, un prezzo unico", badge: "TUTTO INCLUSO",
      points: [
        "Valutazione A–F dei dividendi su ogni azione", "Tutti i portafogli modello — High-Yield, Crescita & Protezione",
        "Check del portafoglio & generatore sulle tue posizioni",
        "Migliori pagatori mensili, liste settoriali & dividend-capture", "Stimatore dei pagamenti & calcolatore dell'interesse composto",
        "Watchlist con avvisi sui dividendi", "Prossimi aumenti, tagli, avvii & dividendi straordinari",
        "Download CSV per i tuoi fogli di calcolo", "Navigazione completamente senza pubblicità",
      ],
      capNote: "≈ 8,33 $ / mese · addebito annuale", cta: "Passa a Pro",
    },
    plansFoot: "Disdici quando vuoi · Accesso immediato · I tuoi dati non vengono mai venduti.",
    unlocksKicker: "Cosa sblocca Pro", unlocksTitle: "Ricerca e decisioni, non solo tabelle di dati.",
    unlocks: [
      { icon: "bars", title: "Una valutazione su ogni azione", body: "Un punteggio A–F su oltre 65.000 titoli — Valore, Crescita, Redditività, Momentum e Salute, standardizzati sui pari di settore perché il voto significhi davvero qualcosa." },
      { icon: "grid", title: "Portafogli modello", body: "Panieri High-Yield, Crescita e Protezione già pronti, costruiti dalle nostre valutazioni — parti da una shortlist verificata, non da uno screener vuoto." },
      { icon: "sparkles", title: "Liste dei migliori", body: "I migliori pagatori mensili, i migliori per settore e i migliori candidati al dividend-capture — selezionati e classificati, non solo ordinati per rendimento." },
      { icon: "alert", title: "Nessun cambiamento perso", body: "Prossimi aumenti, tagli, avvii e dividendi straordinari — vedi chi sta per alzare (o tagliare) il dividendo prima che il mercato lo prezzi." },
      { icon: "percent", title: "Strumenti da reddito", body: "Uno stimatore dei pagamenti e un calcolatore dell'interesse composto per proiettare il reddito reale, più una watchlist con avvisi sui tuoi titoli." },
      { icon: "send", title: "I tuoi dati, esportabili", body: "Scarica qualsiasi lista in CSV per i tuoi fogli e modelli — e naviga l'intero sito senza pubblicità." },
    ],
    cmpKicker: "Gratis vs Pro", cmpTitle: "Esattamente quello che ottieni.", cmpFeature: "Funzione", cmpFree: "Gratis", cmpPro: "Pro",
    compare: [
      { group: "Ricerca & dati", rows: [
        { f: "Screener azioni & ETF", free: "Filtri base", prem: "Filtri avanzati" },
        { f: "Calendario ex-dividendo", free: true, prem: true },
        { f: "Notizie sui dividendi", free: true, prem: "Approfondite + ricerca" },
        { f: "Profili & storico completo dei dividendi", free: true, prem: true },
      ] },
      { group: "Intelligenza Pro", rows: [
        { f: "Valutazione A–F su ogni azione", free: false, prem: true },
        { f: "Portafogli modello (HY · Crescita · Protezione)", free: false, prem: true },
        { f: "Liste dei migliori & dividend-capture", free: false, prem: true },
        { f: "Prossimi aumenti, tagli & straordinari", free: false, prem: true },
      ] },
      { group: "Strumenti di portafoglio", rows: [
        { f: "Check del portafoglio sulle tue posizioni", free: false, prem: true },
        { f: "Generatore di portafogli", free: false, prem: true },
        { f: "Posizioni, pesi & importi", free: false, prem: true },
      ] },
      { group: "Strumenti & esportazioni", rows: [
        { f: "Stimatore pagamenti & calcolatore composto", free: false, prem: true },
        { f: "Watchlist con avvisi sui dividendi", free: false, prem: true },
        { f: "Download CSV / fogli di calcolo", free: false, prem: true },
        { f: "Esperienza senza pubblicità", free: false, prem: true },
      ] },
    ],
    faqKicker: "FAQ prezzi", faqTitle: "Domande prima dell'upgrade.",
    faqs: [
      { q: "Quanto costa Pro?", a: "Pro costa 100 $ l'anno — circa 8,33 $ al mese — con un unico addebito annuale. Un prezzo unico sblocca tutto: valutazioni, portafogli modello, liste, strumenti da reddito, avvisi, esportazioni CSV e navigazione senza pubblicità. Niente extra né livelli." },
      { q: "Posso disdire quando voglio?", a: "Sì. Disdici con un clic dal tuo account e mantieni Pro fino alla fine del periodo già pagato. Nessuna telefonata, nessun ostacolo." },
      { q: "Cosa resta gratis?", a: "Lo screener con filtri base, il calendario ex-dividendo, le notizie standard e i profili completi con storico dei dividendi restano gratis, per sempre. Pro aggiunge valutazioni, portafogli, strumenti ed esportazioni." },
      { q: "Come funziona il pagamento?", a: "Il checkout è gestito in modo sicuro da Stripe e l'accesso è immediato. Non vediamo né salviamo mai i dati della tua carta, e non vendiamo mai i tuoi dati." },
      { q: "In cosa è diverso dagli altri siti sui dividendi?", a: "La maggior parte dei siti si ferma al rendimento. Noi mettiamo una valutazione A–F standardizzata su ogni azione, costruiamo portafogli modello da quei voti e segnaliamo i cambiamenti dei dividendi prima che vengano prezzati." },
    ],
    finalTitle: "Inizia oggi a trovare dividendi più sicuri e più redditizi.",
    finalSub: "Un prezzo unico. Tutto incluso. Disdici quando vuoi.",
    finalCta: "Passa a Pro — 100 $ / anno", finalLink: "Esplora lo screener gratuito →",
  },
};

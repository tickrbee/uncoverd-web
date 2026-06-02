import { type Locale } from "@/lib/i18n";

// Translations for the shared PageHeader (eyebrow / title / description) on the
// standalone app pages that have NO localized /xx/ URL (screener, ETF pages,
// picks, watchlist, news, staggered, …). PageHeader is a client component that
// looks each string up here by its English text and renders the chosen
// language (cookie/path locale). Pages keep passing English props; unmatched
// strings fall through to English. The /fr/ SEO views already pass localized
// header text server-side, so those don't need entries here.
type Tr = Partial<Record<Exclude<Locale, "en">, string>>;

const HEADER_I18N: Record<string, Tr> = {
  // --- Eyebrows ---
  "ETFs & Exposure": { fr: "ETF et exposition", de: "ETFs & Engagement", it: "ETF ed esposizione", es: "ETF y exposición" },
  "ETF Heatmap": { fr: "Carte de chaleur ETF", de: "ETF-Heatmap", it: "Mappa di calore ETF", es: "Mapa de calor ETF" },
  News: { fr: "Actualités", de: "Nachrichten", it: "Notizie", es: "Noticias" },
  Watchlist: { fr: "Liste de suivi", de: "Watchlist", it: "Watchlist", es: "Lista de seguimiento" },
  "Monthly Income": { fr: "Revenu mensuel", de: "Monatliches Einkommen", it: "Reddito mensile", es: "Ingreso mensual" },
  "Model Portfolio": { fr: "Portefeuille modèle", de: "Musterportfolio", it: "Portafoglio modello", es: "Cartera modelo" },

  // --- Titles ---
  "Best Dividend Stock Screener in 2026": { fr: "Meilleur screener d'actions à dividende en 2026", de: "Bester Dividenden-Aktien-Screener 2026", it: "Miglior screener di azioni da dividendo nel 2026", es: "Mejor screener de acciones por dividendo en 2026" },
  "Best Dividend Stock Screener in 2027": { fr: "Meilleur screener d'actions à dividende en 2027", de: "Bester Dividenden-Aktien-Screener 2027", it: "Miglior screener di azioni da dividendo nel 2027", es: "Mejor screener de acciones por dividendo en 2027" },
  "Which ETF owns a stock?": { fr: "Quel ETF détient une action ?", de: "Welcher ETF hält eine Aktie?", it: "Quale ETF detiene un'azione?", es: "¿Qué ETF posee una acción?" },
  "Stocks most held by ETFs": { fr: "Actions les plus détenues par les ETF", de: "Aktien, die am meisten von ETFs gehalten werden", it: "Azioni più detenute dagli ETF", es: "Acciones más mantenidas por ETF" },
  "Dividend & Market News": { fr: "Actualités dividendes et marchés", de: "Dividenden- & Marktnachrichten", it: "Notizie su dividendi e mercati", es: "Noticias de dividendos y mercados" },
  "My Dividend Watchlist": { fr: "Ma liste de suivi de dividendes", de: "Meine Dividenden-Watchlist", it: "La mia watchlist di dividendi", es: "Mi lista de seguimiento de dividendos" },
  "Monthly Payments from Quarterly Dividends": { fr: "Revenus mensuels à partir de dividendes trimestriels", de: "Monatliche Zahlungen aus Quartalsdividenden", it: "Pagamenti mensili da dividendi trimestrali", es: "Pagos mensuales a partir de dividendos trimestrales" },
  "Best Dividend Stocks Model Portfolio": { fr: "Portefeuille modèle des meilleures actions à dividende", de: "Musterportfolio der besten Dividenden-Aktien", it: "Portafoglio modello delle migliori azioni da dividendo", es: "Cartera modelo de las mejores acciones por dividendo" },
  "Best High Dividend Stocks": { fr: "Meilleures actions à haut rendement", de: "Beste Aktien mit hoher Dividende", it: "Migliori azioni ad alto dividendo", es: "Mejores acciones de alto dividendo" },
  "Best Dividend Growth Stocks": { fr: "Meilleures actions à dividende croissant", de: "Beste Dividendenwachstums-Aktien", it: "Migliori azioni a dividendo in crescita", es: "Mejores acciones de dividendo creciente" },
  "Best Dividend Protection": { fr: "Meilleure protection du dividende", de: "Bester Dividendenschutz", it: "Migliore protezione del dividendo", es: "Mejor protección del dividendo" },
  "Best Monthly Dividend Stocks": { fr: "Meilleures actions à dividende mensuel", de: "Beste monatliche Dividenden-Aktien", it: "Migliori azioni a dividendo mensile", es: "Mejores acciones de dividendo mensual" },
  "Best Dividend Capture Stocks": { fr: "Meilleures actions de capture de dividende", de: "Beste Dividenden-Capture-Aktien", it: "Migliori azioni di cattura del dividendo", es: "Mejores acciones de captura de dividendo" },

  // --- Descriptions ---
  "Find dividend stocks across sectors, currencies, and market caps. Filter by yield, size, and industry.": { fr: "Trouvez des actions à dividende par secteur, devise et capitalisation. Filtrez par rendement, taille et industrie.", de: "Finden Sie Dividenden-Aktien nach Sektor, Währung und Marktkapitalisierung. Filtern Sie nach Rendite, Größe und Branche.", it: "Trova azioni da dividendo per settore, valuta e capitalizzazione. Filtra per rendimento, dimensione e settore.", es: "Encuentra acciones por dividendo por sector, divisa y capitalización. Filtra por rentabilidad, tamaño e industria." },
  "Search any ticker or company name to see every ETF in our database that holds it — with each fund's weight, AUM, expense ratio, and position size.": { fr: "Recherchez un symbole ou un nom d'entreprise pour voir tous les ETF de notre base qui le détiennent — avec le poids, l'encours, les frais et la taille de position de chaque fonds.", de: "Suchen Sie einen Ticker oder Firmennamen, um jeden ETF in unserer Datenbank zu sehen, der ihn hält — mit Gewichtung, Volumen, Kostenquote und Positionsgröße jedes Fonds.", it: "Cerca un simbolo o il nome di una società per vedere ogni ETF nel nostro database che lo detiene — con peso, patrimonio, costi e dimensione della posizione di ciascun fondo.", es: "Busca un símbolo o nombre de empresa para ver todos los ETF de nuestra base que lo poseen — con el peso, patrimonio, comisiones y tamaño de posición de cada fondo." },
  "The 500 companies that show up in the most ETFs across our database, ordered by ETF count. Click any ticker to see exactly which funds hold it.": { fr: "Les 500 entreprises présentes dans le plus d'ETF de notre base, classées par nombre d'ETF. Cliquez sur un symbole pour voir exactement quels fonds le détiennent.", de: "Die 500 Unternehmen, die in den meisten ETFs unserer Datenbank vorkommen, nach ETF-Anzahl sortiert. Klicken Sie auf einen Ticker, um zu sehen, welche Fonds ihn halten.", it: "Le 500 società presenti nel maggior numero di ETF del nostro database, ordinate per numero di ETF. Clicca su un simbolo per vedere quali fondi lo detengono.", es: "Las 500 empresas que aparecen en más ETF de nuestra base, ordenadas por número de ETF. Haz clic en un símbolo para ver qué fondos lo poseen." },
  "Stay up to date with dividend declarations, payouts, and market commentary.": { fr: "Restez informé des déclarations de dividendes, des versements et de l'actualité des marchés.", de: "Bleiben Sie über Dividendenankündigungen, Auszahlungen und Marktkommentare auf dem Laufenden.", it: "Resta aggiornato su annunci di dividendi, pagamenti e commenti di mercato.", es: "Mantente al día de los anuncios de dividendos, los pagos y los comentarios del mercado." },
  "Track and compare your favorite dividend stocks in one place.": { fr: "Suivez et comparez vos actions à dividende préférées au même endroit.", de: "Verfolgen und vergleichen Sie Ihre bevorzugten Dividenden-Aktien an einem Ort.", it: "Segui e confronta le tue azioni da dividendo preferite in un unico posto.", es: "Sigue y compara tus acciones por dividendo favoritas en un solo lugar." },
  "Quarterly dividend payers split into 3 month buckets — buy across all 3 buckets and you receive a dividend every month of the year.": { fr: "Des payeurs trimestriels répartis en 3 groupes mensuels — achetez dans les 3 groupes et recevez un dividende chaque mois de l'année.", de: "Quartalszahler in 3 Monatsgruppen aufgeteilt — kaufen Sie aus allen 3 Gruppen und erhalten Sie jeden Monat eine Dividende.", it: "Pagatori trimestrali divisi in 3 gruppi mensili — acquista in tutti e 3 i gruppi e ricevi un dividendo ogni mese dell'anno.", es: "Pagadores trimestrales divididos en 3 grupos mensuales — compra en los 3 grupos y recibe un dividendo cada mes del año." },
  "A balanced blend of yield and total return — our flagship Model Portfolio. Ranked by composite rating.": { fr: "Un équilibre entre rendement et performance totale — notre portefeuille modèle phare. Classé par note composite.", de: "Eine ausgewogene Mischung aus Rendite und Gesamtertrag — unser Vorzeige-Musterportfolio. Nach Gesamtbewertung sortiert.", it: "Un equilibrio tra rendimento e rendimento totale — il nostro portafoglio modello di punta. Ordinato per valutazione composita.", es: "Un equilibrio entre rentabilidad y retorno total — nuestra cartera modelo insignia. Ordenada por calificación compuesta." },
  "Model portfolio targeting 6–12% dividend yield, ranked by composite rating (so we surface high-quality high-yield names, not yield traps).": { fr: "Portefeuille modèle visant un rendement de 6 à 12 %, classé par note composite (pour faire ressortir les titres de qualité, pas les pièges à rendement).", de: "Musterportfolio mit Ziel 6–12 % Dividendenrendite, nach Gesamtbewertung sortiert (um Qualitätswerte statt Renditefallen hervorzuheben).", it: "Portafoglio modello con obiettivo di rendimento 6–12 %, ordinato per valutazione composita (per far emergere titoli di qualità, non trappole da rendimento).", es: "Cartera modelo con objetivo de rentabilidad del 6–12 %, ordenada por calificación compuesta (para destacar valores de calidad, no trampas de rentabilidad)." },
  "Companies that consistently raise dividends — ranked by our Growth rating (1-5 scale) which weights revenue growth, EPS growth, and dividend CAGR.": { fr: "Des sociétés qui augmentent régulièrement leur dividende — classées par notre note de Croissance (échelle 1-5) qui pondère la croissance du chiffre d'affaires, du BPA et le CAGR du dividende.", de: "Unternehmen, die ihre Dividende stetig erhöhen — nach unserer Wachstumsbewertung (Skala 1-5) sortiert, die Umsatzwachstum, EPS-Wachstum und Dividenden-CAGR gewichtet.", it: "Società che aumentano costantemente i dividendi — ordinate secondo la nostra valutazione di Crescita (scala 1-5) che pesa crescita dei ricavi, dell'EPS e CAGR del dividendo.", es: "Empresas que aumentan sus dividendos de forma constante — ordenadas por nuestra calificación de Crecimiento (escala 1-5) que pondera el crecimiento de ingresos, del BPA y el CAGR del dividendo." },
  "Maximum safety — large-cap dividend payers with the highest Health rating (debt coverage, cash position, payout ratio).": { fr: "Sécurité maximale — des payeurs de dividende de grande capitalisation avec la meilleure note de Santé (couverture de la dette, trésorerie, ratio de distribution).", de: "Maximale Sicherheit — Large-Cap-Dividendenzahler mit der höchsten Gesundheitsbewertung (Schuldendeckung, Liquidität, Ausschüttungsquote).", it: "Massima sicurezza — pagatori di dividendi a grande capitalizzazione con la più alta valutazione di Salute (copertura del debito, liquidità, payout).", es: "Máxima seguridad — pagadores de dividendos de gran capitalización con la mejor calificación de Salud (cobertura de deuda, liquidez, pay-out)." },
  "Top-rated monthly dividend payers for steady income — ranked by composite rating.": { fr: "Les payeurs de dividende mensuel les mieux notés pour un revenu régulier — classés par note composite.", de: "Bestbewertete monatliche Dividendenzahler für stetiges Einkommen — nach Gesamtbewertung sortiert.", it: "I pagatori di dividendi mensili più votati per un reddito costante — ordinati per valutazione composita.", es: "Los pagadores de dividendos mensuales mejor valorados para ingresos constantes — ordenados por calificación compuesta." },
  "Stable high-yield dividend payers with strong Momentum scores — quick to recover from ex-dividend drops, making them ideal capture candidates.": { fr: "Des payeurs de dividende à haut rendement stables avec un fort score de Momentum — qui récupèrent vite après le détachement, ce qui en fait des candidats idéaux à la capture.", de: "Stabile, renditestarke Dividendenzahler mit starken Momentum-Werten — erholen sich schnell von Ex-Dividenden-Abschlägen und sind so ideale Capture-Kandidaten.", it: "Pagatori di dividendi ad alto rendimento stabili con forti punteggi di Momentum — recuperano rapidamente dopo lo stacco, ideali per la strategia di cattura.", es: "Pagadores de dividendos de alta rentabilidad estables con fuertes puntuaciones de Momentum — se recuperan rápido tras el ex-dividendo, ideales para la captura." },

  // --- Hero copy for bespoke pages (pricing / alternatives / compare) ---
  Tools: { fr: "Outils", de: "Tools", it: "Strumenti", es: "Herramientas" },
  Compare: { fr: "Comparer", de: "Vergleichen", it: "Confronta", es: "Comparar" },
  "Choose your subscription": { fr: "Choisissez votre abonnement", de: "Wählen Sie Ihr Abonnement", it: "Scegli il tuo abbonamento", es: "Elige tu suscripción" },
  "Premium unlocks all dividend Model Portfolios, the Watchlist, payout estimator, ratings on every stock, in-depth research, and an ad-free experience.": { fr: "Premium débloque tous les portefeuilles modèles de dividendes, la liste de suivi, l'estimateur de versement, les notes sur chaque action, des analyses approfondies et une expérience sans publicité.", de: "Premium schaltet alle Dividenden-Musterportfolios, die Watchlist, den Ausschüttungsrechner, Bewertungen für jede Aktie, tiefgehende Analysen und ein werbefreies Erlebnis frei.", it: "Premium sblocca tutti i portafogli modello di dividendi, la watchlist, lo stimatore dei pagamenti, le valutazioni su ogni azione, analisi approfondite e un'esperienza senza pubblicità.", es: "Premium desbloquea todas las carteras modelo de dividendos, la lista de seguimiento, el estimador de pagos, las calificaciones de cada acción, análisis en profundidad y una experiencia sin anuncios." },
  "Find an alternative": { fr: "Trouver une alternative", de: "Eine Alternative finden", it: "Trova un'alternativa", es: "Encontrar una alternativa" },
  "Type a dividend stock or ETF and see comparable peers ranked by what they do better — higher yield, better rating, cheaper valuation, lower expense ratio, or stronger balance sheet.": { fr: "Saisissez une action à dividende ou un ETF et découvrez des pairs comparables classés selon ce qu'ils font de mieux — rendement supérieur, meilleure note, valorisation plus basse, frais réduits ou bilan plus solide.", de: "Geben Sie eine Dividenden-Aktie oder einen ETF ein und sehen Sie vergleichbare Werte, gereiht nach dem, was sie besser machen — höhere Rendite, bessere Bewertung, günstigere Bewertung, niedrigere Kosten oder stärkere Bilanz.", it: "Digita un'azione da dividendo o un ETF e scopri titoli comparabili ordinati per ciò che fanno meglio — rendimento più alto, valutazione migliore, prezzo più conveniente, costi inferiori o bilancio più solido.", es: "Escribe una acción por dividendo o un ETF y verás pares comparables ordenados por lo que hacen mejor — mayor rentabilidad, mejor calificación, valoración más barata, menores costes o un balance más sólido." },
  "Compare dividend stocks & ETFs": { fr: "Comparer des actions à dividende et des ETF", de: "Dividenden-Aktien & ETFs vergleichen", it: "Confronta azioni da dividendo ed ETF", es: "Compara acciones por dividendo y ETF" },
  "Drop in 2–4 tickers. See yield, dividend growth, payout, rating, expense ratio, returns, and ETF overlap — side by side. Stock-vs-stock, ETF-vs-ETF, or mixed.": { fr: "Ajoutez 2 à 4 symboles. Comparez côte à côte le rendement, la croissance du dividende, la distribution, la note, les frais, la performance et le chevauchement d'ETF. Action contre action, ETF contre ETF, ou mixte.", de: "Geben Sie 2–4 Ticker ein. Vergleichen Sie Rendite, Dividendenwachstum, Ausschüttung, Bewertung, Kosten, Performance und ETF-Überschneidung — nebeneinander. Aktie gegen Aktie, ETF gegen ETF oder gemischt.", it: "Inserisci 2–4 simboli. Confronta fianco a fianco rendimento, crescita del dividendo, payout, valutazione, costi, performance e sovrapposizione tra ETF. Azione contro azione, ETF contro ETF o misto.", es: "Añade 2–4 símbolos. Compara lado a lado la rentabilidad, el crecimiento del dividendo, el reparto, la calificación, los costes, la rentabilidad y el solapamiento de ETF. Acción contra acción, ETF contra ETF o mixto." },
  "Side-by-side dividend comparison. Green badges mark the leader on each metric.": { fr: "Comparaison de dividendes côte à côte. Les badges verts indiquent le leader pour chaque indicateur.", de: "Dividendenvergleich nebeneinander. Grüne Badges markieren den Spitzenreiter je Kennzahl.", it: "Confronto dei dividendi fianco a fianco. I badge verdi indicano il leader per ogni metrica.", es: "Comparación de dividendos lado a lado. Las insignias verdes marcan al líder en cada métrica." },

  // --- News filter chips ---
  "All News": { fr: "Toutes les actus", de: "Alle News", it: "Tutte le notizie", es: "Todas las noticias" },
  Dividends: { fr: "Dividendes", de: "Dividenden", it: "Dividendi", es: "Dividendos" },
  Earnings: { fr: "Résultats", de: "Ergebnisse", it: "Risultati", es: "Resultados" },
  Buybacks: { fr: "Rachats d'actions", de: "Aktienrückkäufe", it: "Riacquisti", es: "Recompras" },
  "Fed & Rates": { fr: "Fed et taux", de: "Fed & Zinsen", it: "Fed e tassi", es: "Fed y tipos" },
  "Or browse by sector:": { fr: "Ou parcourir par secteur :", de: "Oder nach Sektor stöbern:", it: "Oppure sfoglia per settore:", es: "O explora por sector:" },

  // --- Screener sort + sector filter ---
  "All Sectors": { fr: "Tous les secteurs", de: "Alle Sektoren", it: "Tutti i settori", es: "Todos los sectores" },
  "Sort: Market Cap": { fr: "Tri : Capitalisation", de: "Sortierung: Marktkap.", it: "Ordina: Capitalizzazione", es: "Orden: Capitalización" },
  "Sort: Yield": { fr: "Tri : Rendement", de: "Sortierung: Rendite", it: "Ordina: Rendimento", es: "Orden: Rentabilidad" },

  // --- Sector display names (chips on news / screener; match the taxonomy labels) ---
  Financials: { fr: "Finance", de: "Finanzwesen", it: "Finanza", es: "Finanzas" },
  "Real Estate": { fr: "Immobilier", de: "Immobilien", it: "Immobiliare", es: "Inmobiliario" },
  Communications: { fr: "Communications", de: "Kommunikation", it: "Comunicazioni", es: "Comunicaciones" },
  "Consumer Discretionary": { fr: "Consommation discrétionnaire", de: "Zyklische Konsumgüter", it: "Beni di consumo ciclici", es: "Consumo discrecional" },
  "Consumer Staples": { fr: "Consommation de base", de: "Basiskonsumgüter", it: "Beni di prima necessità", es: "Consumo básico" },
  Energy: { fr: "Énergie", de: "Energie", it: "Energia", es: "Energía" },
  "Health Care": { fr: "Santé", de: "Gesundheit", it: "Sanità", es: "Salud" },
  Industrials: { fr: "Industrie", de: "Industrie", it: "Industria", es: "Industria" },
  Technology: { fr: "Technologie", de: "Technologie", it: "Tecnologia", es: "Tecnología" },
  Materials: { fr: "Matériaux de base", de: "Grundstoffe", it: "Materiali di base", es: "Materiales básicos" },
  Utilities: { fr: "Services aux collectivités", de: "Versorger", it: "Servizi di pubblica utilità", es: "Servicios públicos" },

  // --- Screener "All Filters" modal ---
  "All Filters": { fr: "Tous les filtres", de: "Alle Filter", it: "Tutti i filtri", es: "Todos los filtros" },
  Sector: { fr: "Secteur", de: "Sektor", it: "Settore", es: "Sector" },
  Overview: { fr: "Aperçu", de: "Übersicht", it: "Panoramica", es: "Resumen" },
  "Dividend Growth": { fr: "Croissance du dividende", de: "Dividendenwachstum", it: "Crescita del dividendo", es: "Crecimiento del dividendo" },
  Returns: { fr: "Rendements", de: "Rendite", it: "Rendimenti", es: "Rentabilidad" },
  "Min Yield (%)": { fr: "Rendement min. (%)", de: "Min. Rendite (%)", it: "Rendimento min. (%)", es: "Rentabilidad mín. (%)" },
  "Max Yield (%)": { fr: "Rendement max. (%)", de: "Max. Rendite (%)", it: "Rendimento max. (%)", es: "Rentabilidad máx. (%)" },
  "AUM / Market Cap": { fr: "AUM / Capitalisation", de: "AUM / Marktkap.", it: "AUM / Capitalizzazione", es: "AUM / Capitalización" },
  Frequency: { fr: "Fréquence", de: "Rhythmus", it: "Frequenza", es: "Frecuencia" },
  "Min Consecutive Increases (years)": { fr: "Hausses consécutives min. (ans)", de: "Min. Erhöhungen in Folge (Jahre)", it: "Aumenti consecutivi min. (anni)", es: "Aumentos consecutivos mín. (años)" },
  "Min 5Y CAGR (%)": { fr: "CAGR 5 ans min. (%)", de: "Min. 5J-CAGR (%)", it: "CAGR 5 anni min. (%)", es: "CAGR 5 a. mín. (%)" },
  "Min Payout Ratio (%)": { fr: "Ratio de distribution min. (%)", de: "Min. Ausschüttungsquote (%)", it: "Payout min. (%)", es: "Pay-out mín. (%)" },
  "Max Payout Ratio (%)": { fr: "Ratio de distribution max. (%)", de: "Max. Ausschüttungsquote (%)", it: "Payout max. (%)", es: "Pay-out máx. (%)" },
  "Min P/E": { fr: "P/E min.", de: "Min. P/E", it: "P/E min.", es: "PER mín." },
  "Max P/E": { fr: "P/E max.", de: "Max. P/E", it: "P/E max.", es: "PER máx." },
  "Min YTD Return (%)": { fr: "Perf. YTD min. (%)", de: "Min. YTD-Rendite (%)", it: "Rendimento YTD min. (%)", es: "Rentabilidad YTD mín. (%)" },
  "Min 1-Year Return (%)": { fr: "Perf. 1 an min. (%)", de: "Min. 1-Jahres-Rendite (%)", it: "Rendimento 1 anno min. (%)", es: "Rentabilidad 1 año mín. (%)" },
  "Min 5-Year Return (%)": { fr: "Perf. 5 ans min. (%)", de: "Min. 5-Jahres-Rendite (%)", it: "Rendimento 5 anni min. (%)", es: "Rentabilidad 5 años mín. (%)" },
  "Max % from 52-Week High": { fr: "% max. sous plus-haut 52s", de: "Max. % unter 52W-Hoch", it: "% max. sotto max 52 sett.", es: "% máx. bajo máx. 52s" },
  "Any size": { fr: "Toute taille", de: "Beliebige Größe", it: "Qualsiasi dimensione", es: "Cualquier tamaño" },
  "All sectors": { fr: "Tous les secteurs", de: "Alle Sektoren", it: "Tutti i settori", es: "Todos los sectores" },
  Any: { fr: "Tous", de: "Beliebig", it: "Qualsiasi", es: "Cualquiera" },
  Monthly: { fr: "Mensuel", de: "Monatlich", it: "Mensile", es: "Mensual" },
  Quarterly: { fr: "Trimestriel", de: "Vierteljährlich", it: "Trimestrale", es: "Trimestral" },
  "Semi-Annual": { fr: "Semestriel", de: "Halbjährlich", it: "Semestrale", es: "Semestral" },
  Annual: { fr: "Annuel", de: "Jährlich", it: "Annuale", es: "Anual" },
  Reset: { fr: "Réinitialiser", de: "Zurücksetzen", it: "Reimposta", es: "Restablecer" },
  "Apply filters": { fr: "Appliquer les filtres", de: "Filter anwenden", it: "Applica filtri", es: "Aplicar filtros" },
};

/** Translate a PageHeader string by its English text; English falls through. */
export function tHeader(text: string | undefined, locale: Locale): string | undefined {
  if (!text || locale === "en") return text;
  return HEADER_I18N[text]?.[locale] ?? text;
}

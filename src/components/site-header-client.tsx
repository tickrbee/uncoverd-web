"use client";

import { useEffect, useState, useRef } from "react";
import { LocaleLink as Link } from "@/components/locale-link";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/branding";
import { createClient } from "@/lib/supabase/browser";
import { CurrencyPicker } from "@/components/currency-picker";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/lib/use-locale";
import { tickerHref } from "@/lib/format";
import { SECTORS, INDUSTRIES, GROWERS, PAYOUTS, GROWER_YEARS } from "@/lib/i18n-taxonomy";
import type { Locale } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

// Mega-menu section titles + ETF/misc link labels (the deep category links
// themselves come from the taxonomy, localized via entry.label[locale]).
type MegaStrings = {
  industryDividends: string; sectorDividends: string; dividendGrowers: string;
  etfsExposure: string; payoutChangesTitle: string; futureDividendPayers: string;
  allDividendEtfs: string; whichEtfOwns: string; mostHeldByEtfs: string;
  reitEtfs: string; energyEtfs: string; technologyEtfs: string; healthcareEtfs: string;
  // Lists (model portfolios / picks)
  modelPortfolios: string; bestSectorDividend: string; bestPrefix: string;
  bestHighDividend: string; bestDividendGrowth: string; bestDividendProtection: string;
  bestDividendStocks: string; bestMonthlyDividend: string;
  bestDividendCaptureTitle: string; bestDividendCaptureStocks: string; captureBlurb: string;
  // High Yield
  highYieldsTitle: string; yieldsOver4: string; allReits: string; equityReits: string;
  mortgageReits: string; industrialReits: string; residentialReits: string; healthcareReits: string;
  // Calendar
  exDividendDates: string; exBlurb: string; thisWeekEx: string; thisMonthEx: string; thisYearEx: string;
  declarationDates: string; declBlurb: string; lastWeekDecl: string; lastMonthDecl: string; lastThreeMonths: string;
  // Income
  monthlyDividends: string; monthlyDividendStocks: string; quarterlyMonthly: string;
  monthlyIncomeQuarterly: string; bestPicks: string;
  // Tools
  toolsTitle: string; calculatorsTitle: string; dividendCalculator: string; compoundingCalculator: string;
  portfolioHealthcheck: string; payoutEstimator: string;
};
const MEGA: Record<Locale, MegaStrings> = {
  en: { industryDividends: "Industry Dividends", sectorDividends: "Sector Dividends", dividendGrowers: "Dividend Growers", etfsExposure: "ETFs & Exposure", payoutChangesTitle: "Payout Changes", futureDividendPayers: "Future Dividend Payers", allDividendEtfs: "All Dividend ETFs", whichEtfOwns: "Which ETF owns a stock?", mostHeldByEtfs: "Most held by ETFs", reitEtfs: "REIT ETFs", energyEtfs: "Energy ETFs", technologyEtfs: "Technology ETFs", healthcareEtfs: "Healthcare ETFs", modelPortfolios: "Model Portfolios", bestSectorDividend: "Best Sector Dividend Stocks", bestPrefix: "Best", bestHighDividend: "Best High Dividend Stocks", bestDividendGrowth: "Best Dividend Growth Stocks", bestDividendProtection: "Best Dividend Protection", bestDividendStocks: "Best Dividend Stocks", bestMonthlyDividend: "Best Monthly Dividend Stocks", bestDividendCaptureTitle: "Best Dividend Capture", bestDividendCaptureStocks: "Best Dividend Capture Stocks", captureBlurb: "Quickest stock price recoveries post dividend. Buy just before the ex-dividend date and sell after the price recovers.", highYieldsTitle: "High Yields", yieldsOver4: "Yields over 4%", allReits: "All REITs", equityReits: "Equity REITs", mortgageReits: "Mortgage REITs", industrialReits: "Industrial REITs", residentialReits: "Residential REITs", healthcareReits: "Healthcare REITs", exDividendDates: "Ex-Dividend Dates", exBlurb: "Must be a shareholder on or before the next ex-dividend date to receive the upcoming dividend.", thisWeekEx: "This Week's Ex-Dates", thisMonthEx: "This Month's Ex-Dates", thisYearEx: "This Year's Ex-Dates", declarationDates: "Declaration Dates", declBlurb: "Track recent declarations and get ready for upcoming payouts.", lastWeekDecl: "Last Week's Declarations", lastMonthDecl: "Last Month's Declarations", lastThreeMonths: "Last Three Months", monthlyDividends: "Monthly Dividends", monthlyDividendStocks: "Monthly Dividend Stocks", quarterlyMonthly: "Quarterly that pay monthly", monthlyIncomeQuarterly: "Monthly Income from Quarterly", bestPicks: "Best Picks", toolsTitle: "Research Tools", calculatorsTitle: "Calculators", dividendCalculator: "Dividend Calculator", compoundingCalculator: "Compounding Calculator", portfolioHealthcheck: "Portfolio Healthcheck", payoutEstimator: "Payout Estimator" },
  fr: { industryDividends: "Dividendes par industrie", sectorDividends: "Dividendes par secteur", dividendGrowers: "Croissance du dividende", etfsExposure: "ETF et exposition", payoutChangesTitle: "Variations de dividende", futureDividendPayers: "Futurs payeurs de dividende", allDividendEtfs: "Tous les ETF à dividende", whichEtfOwns: "Quel ETF détient une action ?", mostHeldByEtfs: "Les plus détenus par les ETF", reitEtfs: "ETF de REIT", energyEtfs: "ETF énergie", technologyEtfs: "ETF technologie", healthcareEtfs: "ETF santé", modelPortfolios: "Portefeuilles modèles", bestSectorDividend: "Meilleures actions à dividende par secteur", bestPrefix: "Meilleures", bestHighDividend: "Meilleures actions à haut rendement", bestDividendGrowth: "Meilleures actions à dividende croissant", bestDividendProtection: "Meilleure protection du dividende", bestDividendStocks: "Meilleures actions à dividende", bestMonthlyDividend: "Meilleures actions à dividende mensuel", bestDividendCaptureTitle: "Meilleure capture de dividende", bestDividendCaptureStocks: "Meilleures actions de capture de dividende", captureBlurb: "Reprises de cours les plus rapides après le dividende. Achetez juste avant le détachement et vendez après la reprise du cours.", highYieldsTitle: "Hauts rendements", yieldsOver4: "Rendements supérieurs à 4 %", allReits: "Tous les REIT", equityReits: "REIT actions", mortgageReits: "REIT hypothécaires", industrialReits: "REIT industriels", residentialReits: "REIT résidentiels", healthcareReits: "REIT santé", exDividendDates: "Dates de détachement", exBlurb: "Vous devez être actionnaire au plus tard à la date de détachement pour recevoir le prochain dividende.", thisWeekEx: "Détachements de cette semaine", thisMonthEx: "Détachements de ce mois", thisYearEx: "Détachements de cette année", declarationDates: "Dates de déclaration", declBlurb: "Suivez les déclarations récentes et préparez-vous aux prochains versements.", lastWeekDecl: "Déclarations de la semaine dernière", lastMonthDecl: "Déclarations du mois dernier", lastThreeMonths: "Trois derniers mois", monthlyDividends: "Dividendes mensuels", monthlyDividendStocks: "Actions à dividende mensuel", quarterlyMonthly: "Trimestrielles versant mensuellement", monthlyIncomeQuarterly: "Revenu mensuel via trimestrielles", bestPicks: "Meilleures sélections", toolsTitle: "Outils d'analyse", calculatorsTitle: "Calculateurs", dividendCalculator: "Calculateur de dividendes", compoundingCalculator: "Calculateur d'intérêts composés", portfolioHealthcheck: "Bilan de portefeuille", payoutEstimator: "Estimateur de versement" },
  de: { industryDividends: "Branchen-Dividenden", sectorDividends: "Sektor-Dividenden", dividendGrowers: "Dividendenwachstum", etfsExposure: "ETFs & Engagement", payoutChangesTitle: "Dividendenänderungen", futureDividendPayers: "Künftige Dividendenzahler", allDividendEtfs: "Alle Dividenden-ETFs", whichEtfOwns: "Welcher ETF hält eine Aktie?", mostHeldByEtfs: "Am meisten von ETFs gehalten", reitEtfs: "REIT-ETFs", energyEtfs: "Energie-ETFs", technologyEtfs: "Technologie-ETFs", healthcareEtfs: "Gesundheits-ETFs", modelPortfolios: "Musterportfolios", bestSectorDividend: "Beste Sektor-Dividenden-Aktien", bestPrefix: "Beste", bestHighDividend: "Beste Aktien mit hoher Dividende", bestDividendGrowth: "Beste Dividendenwachstums-Aktien", bestDividendProtection: "Bester Dividendenschutz", bestDividendStocks: "Beste Dividenden-Aktien", bestMonthlyDividend: "Beste monatliche Dividenden-Aktien", bestDividendCaptureTitle: "Beste Dividenden-Capture", bestDividendCaptureStocks: "Beste Dividenden-Capture-Aktien", captureBlurb: "Schnellste Kurserholungen nach der Dividende. Kurz vor dem Ex-Tag kaufen und nach der Kurserholung verkaufen.", highYieldsTitle: "Hohe Renditen", yieldsOver4: "Renditen über 4 %", allReits: "Alle REITs", equityReits: "Equity-REITs", mortgageReits: "Hypotheken-REITs", industrialReits: "Industrie-REITs", residentialReits: "Wohn-REITs", healthcareReits: "Gesundheits-REITs", exDividendDates: "Ex-Dividenden-Termine", exBlurb: "Sie müssen spätestens am Ex-Dividenden-Tag Aktionär sein, um die kommende Dividende zu erhalten.", thisWeekEx: "Ex-Termine dieser Woche", thisMonthEx: "Ex-Termine dieses Monats", thisYearEx: "Ex-Termine dieses Jahres", declarationDates: "Ankündigungstermine", declBlurb: "Verfolgen Sie aktuelle Ankündigungen und bereiten Sie sich auf kommende Ausschüttungen vor.", lastWeekDecl: "Ankündigungen letzte Woche", lastMonthDecl: "Ankündigungen letzten Monat", lastThreeMonths: "Letzte drei Monate", monthlyDividends: "Monatliche Dividenden", monthlyDividendStocks: "Aktien mit monatlicher Dividende", quarterlyMonthly: "Quartalszahler mit Monatsausschüttung", monthlyIncomeQuarterly: "Monatliches Einkommen aus Quartalszahlern", bestPicks: "Beste Auswahl", toolsTitle: "Analyse-Tools", calculatorsTitle: "Rechner", dividendCalculator: "Dividendenrechner", compoundingCalculator: "Zinseszinsrechner", portfolioHealthcheck: "Portfolio-Check", payoutEstimator: "Ausschüttungsrechner" },
  it: { industryDividends: "Dividendi per industria", sectorDividends: "Dividendi per settore", dividendGrowers: "Crescita dei dividendi", etfsExposure: "ETF ed esposizione", payoutChangesTitle: "Variazioni di dividendo", futureDividendPayers: "Futuri pagatori di dividendi", allDividendEtfs: "Tutti gli ETF a dividendo", whichEtfOwns: "Quale ETF detiene un'azione?", mostHeldByEtfs: "Più detenuti dagli ETF", reitEtfs: "ETF REIT", energyEtfs: "ETF energia", technologyEtfs: "ETF tecnologia", healthcareEtfs: "ETF sanità", modelPortfolios: "Portafogli modello", bestSectorDividend: "Migliori azioni a dividendo per settore", bestPrefix: "Migliori", bestHighDividend: "Migliori azioni ad alto dividendo", bestDividendGrowth: "Migliori azioni a dividendo in crescita", bestDividendProtection: "Migliore protezione del dividendo", bestDividendStocks: "Migliori azioni da dividendo", bestMonthlyDividend: "Migliori azioni a dividendo mensile", bestDividendCaptureTitle: "Migliore cattura del dividendo", bestDividendCaptureStocks: "Migliori azioni di cattura del dividendo", captureBlurb: "Recuperi di prezzo più rapidi dopo il dividendo. Acquista poco prima dello stacco e vendi dopo il recupero del prezzo.", highYieldsTitle: "Alti rendimenti", yieldsOver4: "Rendimenti oltre il 4 %", allReits: "Tutti i REIT", equityReits: "REIT azionari", mortgageReits: "REIT ipotecari", industrialReits: "REIT industriali", residentialReits: "REIT residenziali", healthcareReits: "REIT sanitari", exDividendDates: "Date di stacco", exBlurb: "Devi essere azionista entro la data di stacco per ricevere il prossimo dividendo.", thisWeekEx: "Stacchi di questa settimana", thisMonthEx: "Stacchi di questo mese", thisYearEx: "Stacchi di quest'anno", declarationDates: "Date di annuncio", declBlurb: "Segui gli annunci recenti e preparati ai prossimi pagamenti.", lastWeekDecl: "Annunci della settimana scorsa", lastMonthDecl: "Annunci del mese scorso", lastThreeMonths: "Ultimi tre mesi", monthlyDividends: "Dividendi mensili", monthlyDividendStocks: "Azioni a dividendo mensile", quarterlyMonthly: "Trimestrali che pagano mensilmente", monthlyIncomeQuarterly: "Reddito mensile da trimestrali", bestPicks: "Migliori selezioni", toolsTitle: "Strumenti di analisi", calculatorsTitle: "Calcolatori", dividendCalculator: "Calcolatore di dividendi", compoundingCalculator: "Calcolatore di interesse composto", portfolioHealthcheck: "Check del portafoglio", payoutEstimator: "Stimatore dei pagamenti" },
  es: { industryDividends: "Dividendos por industria", sectorDividends: "Dividendos por sector", dividendGrowers: "Crecimiento del dividendo", etfsExposure: "ETF y exposición", payoutChangesTitle: "Cambios de dividendo", futureDividendPayers: "Futuros pagadores de dividendos", allDividendEtfs: "Todos los ETF de dividendos", whichEtfOwns: "¿Qué ETF posee una acción?", mostHeldByEtfs: "Más mantenidos por ETF", reitEtfs: "ETF de REIT", energyEtfs: "ETF de energía", technologyEtfs: "ETF de tecnología", healthcareEtfs: "ETF de salud", modelPortfolios: "Carteras modelo", bestSectorDividend: "Mejores acciones por dividendo por sector", bestPrefix: "Mejores", bestHighDividend: "Mejores acciones de alto dividendo", bestDividendGrowth: "Mejores acciones de dividendo creciente", bestDividendProtection: "Mejor protección del dividendo", bestDividendStocks: "Mejores acciones por dividendo", bestMonthlyDividend: "Mejores acciones de dividendo mensual", bestDividendCaptureTitle: "Mejor captura de dividendo", bestDividendCaptureStocks: "Mejores acciones de captura de dividendo", captureBlurb: "Recuperaciones de precio más rápidas tras el dividendo. Compra justo antes del ex-dividendo y vende tras la recuperación.", highYieldsTitle: "Altas rentabilidades", yieldsOver4: "Rentabilidades superiores al 4 %", allReits: "Todos los REIT", equityReits: "REIT de renta variable", mortgageReits: "REIT hipotecarios", industrialReits: "REIT industriales", residentialReits: "REIT residenciales", healthcareReits: "REIT de salud", exDividendDates: "Fechas ex-dividendo", exBlurb: "Debes ser accionista en o antes de la fecha ex-dividendo para recibir el próximo dividendo.", thisWeekEx: "Ex-fechas de esta semana", thisMonthEx: "Ex-fechas de este mes", thisYearEx: "Ex-fechas de este año", declarationDates: "Fechas de anuncio", declBlurb: "Sigue los anuncios recientes y prepárate para los próximos pagos.", lastWeekDecl: "Anuncios de la semana pasada", lastMonthDecl: "Anuncios del mes pasado", lastThreeMonths: "Últimos tres meses", monthlyDividends: "Dividendos mensuales", monthlyDividendStocks: "Acciones de dividendo mensual", quarterlyMonthly: "Trimestrales que pagan mensualmente", monthlyIncomeQuarterly: "Ingreso mensual de trimestrales", bestPicks: "Mejores selecciones", toolsTitle: "Herramientas de análisis", calculatorsTitle: "Calculadoras", dividendCalculator: "Calculadora de dividendos", compoundingCalculator: "Calculadora de interés compuesto", portfolioHealthcheck: "Chequeo de cartera", payoutEstimator: "Estimador de pagos" },
};

// Localized labels for the nav CHROME (top-level items, solo links, action
// buttons, search, mobile group titles). Deep mega-menu links stay English —
// many point to pages not yet localized, and the LocaleLink wrapper already
// routes them to the localized equivalent where one exists.
type NavStrings = {
  explore: string; lists: string; highYield: string; calendar: string; income: string; tools: string;
  screener: string; compare: string; alternatives: string; news: string; blog: string;
  watchlist: string; app: string; pricing: string; signIn: string; signUp: string;
  account: string; search: string; searchPlaceholder: string;
  methodology: string; about: string; languages: string; industries: string;
  sectors: string; payoutChanges: string; listsPicks: string; etfs: string; growers: string;
};

const NAV_STRINGS: Record<Locale, NavStrings> = {
  en: {
    explore: "Explore", lists: "Lists", highYield: "High Yield", calendar: "Calendar", income: "Income", tools: "Tools",
    screener: "Screener", compare: "Compare", alternatives: "Alternatives", news: "News", blog: "Blog",
    watchlist: "Watchlist", app: "App", pricing: "Pricing", signIn: "Sign In", signUp: "Sign Up",
    account: "Account", search: "Search",
    searchPlaceholder: "Search by ticker or company name (e.g. AAPL, Johnson, Realty Income)",
    methodology: "Methodology", about: "About", languages: "Languages", industries: "Industries",
    sectors: "Sectors", payoutChanges: "Payout Changes", listsPicks: "Lists & Picks", etfs: "ETFs", growers: "Dividend Growers",
  },
  fr: {
    explore: "Explorer", lists: "Listes", highYield: "Haut rendement", calendar: "Calendrier", income: "Revenu", tools: "Outils",
    screener: "Screener", compare: "Comparer", alternatives: "Alternatives", news: "Actualités", blog: "Blog",
    watchlist: "Liste de suivi", app: "Appli", pricing: "Tarifs", signIn: "Connexion", signUp: "Inscription",
    account: "Compte", search: "Rechercher",
    searchPlaceholder: "Rechercher par symbole ou nom d'entreprise (ex. AAPL, Johnson, Realty Income)",
    methodology: "Méthodologie", about: "À propos", languages: "Langues", industries: "Industries",
    sectors: "Secteurs", payoutChanges: "Variations de dividende", listsPicks: "Listes et sélections", etfs: "ETF", growers: "Croissance du dividende",
  },
  de: {
    explore: "Entdecken", lists: "Listen", highYield: "Hohe Rendite", calendar: "Kalender", income: "Einkommen", tools: "Tools",
    screener: "Screener", compare: "Vergleichen", alternatives: "Alternativen", news: "Nachrichten", blog: "Blog",
    watchlist: "Watchlist", app: "App", pricing: "Preise", signIn: "Anmelden", signUp: "Registrieren",
    account: "Konto", search: "Suchen",
    searchPlaceholder: "Nach Ticker oder Firmennamen suchen (z. B. AAPL, Johnson, Realty Income)",
    methodology: "Methodik", about: "Über uns", languages: "Sprachen", industries: "Branchen",
    sectors: "Sektoren", payoutChanges: "Dividendenänderungen", listsPicks: "Listen & Auswahl", etfs: "ETFs", growers: "Dividendenwachstum",
  },
  it: {
    explore: "Esplora", lists: "Liste", highYield: "Alto rendimento", calendar: "Calendario", income: "Reddito", tools: "Strumenti",
    screener: "Screener", compare: "Confronta", alternatives: "Alternative", news: "Notizie", blog: "Blog",
    watchlist: "Watchlist", app: "App", pricing: "Prezzi", signIn: "Accedi", signUp: "Registrati",
    account: "Account", search: "Cerca",
    searchPlaceholder: "Cerca per simbolo o nome società (es. AAPL, Johnson, Realty Income)",
    methodology: "Metodologia", about: "Chi siamo", languages: "Lingue", industries: "Industrie",
    sectors: "Settori", payoutChanges: "Variazioni dividendo", listsPicks: "Liste e selezioni", etfs: "ETF", growers: "Crescita dividendi",
  },
  es: {
    explore: "Explorar", lists: "Listas", highYield: "Alta rentabilidad", calendar: "Calendario", income: "Ingresos", tools: "Herramientas",
    screener: "Screener", compare: "Comparar", alternatives: "Alternativas", news: "Noticias", blog: "Blog",
    watchlist: "Lista de seguimiento", app: "App", pricing: "Precios", signIn: "Iniciar sesión", signUp: "Registrarse",
    account: "Cuenta", search: "Buscar",
    searchPlaceholder: "Busca por símbolo o nombre de empresa (p. ej. AAPL, Johnson, Realty Income)",
    methodology: "Metodología", about: "Acerca de", languages: "Idiomas", industries: "Industrias",
    sectors: "Sectores", payoutChanges: "Cambios de dividendo", listsPicks: "Listas y selecciones", etfs: "ETF", growers: "Crecimiento del dividendo",
  },
};

type MenuKey =
  | "explore"
  | "lists"
  | "high-yield"
  | "calendar"
  | "income"
  | "tools"
  | null;

type Suggestion = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
};

export function SiteHeaderClient({ initialUser }: { initialUser: User | null }) {
  // initialUser comes from the server (authoritative — reads the same cookies
  // as middleware/account page). The browser supabase client may fail to read
  // session cookies in some configs, which used to leave the header showing
  // "Sign In/Sign Up" for already-signed-in users. We trust the server value
  // by default, then onAuthStateChange picks up subsequent logins/logouts.
  const [user, setUser] = useState<User | null>(initialUser);
  const [open, setOpen] = useState<MenuKey>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  // Mobile slide-in drawer state. Desktop ignores this — the regular dv-nav
  // is rendered identically above the ≥1100px breakpoint.
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const locale = useLocale();
  const t = NAV_STRINGS[locale];
  const m = MEGA[locale];

  // Lock body scroll while the mobile drawer is open + close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const supabase = createClient();
    // We already seeded `user` from the server. Don't overwrite with a stale
    // client-read session — only trust client reads when they differ AND the
    // server seeded null (i.e. SSR ran before login finished).
    if (!initialUser) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setUser(session.user);
      });
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function openMenu(key: MenuKey) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(key);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 150);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    // Prefer the highlighted result, else the top suggestion — both are real
    // tickers. Only when there are no matches do we fall back to the /search
    // results page (which handles "no results"). Never guess a ticker URL
    // directly, which 404s when the symbol doesn't exist.
    const sel = activeIdx >= 0 ? suggestions[activeIdx] : suggestions[0];
    if (sel) {
      goToResult(sel);
      return;
    }
    const q = searchValue.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    closeSearch();
  }

  function goToResult(s: Suggestion) {
    const path = tickerHref(s.symbol, s.is_etf, s.is_fund);
    router.push(path);
    closeSearch();
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchValue("");
    setSuggestions([]);
    setActiveIdx(-1);
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const q = searchValue.trim();
    if (q.length < 1 || !searchOpen) {
      setSuggestions([]);
      setActiveIdx(-1);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        setSuggestions(data.results ?? []);
        setActiveIdx(-1);
      } catch {
        // network errors silently ignored — typeahead is best-effort
      }
    }, 150);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchValue, searchOpen]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }

  return (
    <>
    <header className="dv-header">
      <div className="dv-header__inner">
        <Link href="/" className="dv-brand" aria-label={`${APP_NAME} home`}>
          <span className="dv-brand__dot" />
          <span className="dv-brand__name">{APP_NAME}</span>
        </Link>

        {/* Hamburger button — only visible on mobile (<1100px) */}
        <button
          type="button"
          className="dv-hamburger"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <nav className="dv-nav" aria-label="Main">
          <NavItem
            label={t.explore}
            menuKey="explore"
            open={open}
            onOpen={openMenu}
            onClose={scheduleClose}
          >
            <MenuGrid columns={3}>
              <MenuCol title={m.industryDividends}>
                {INDUSTRIES.map((i) => (
                  <MenuLink key={i.key} href={`/industries/${i.key}`}>{i.label[locale]}</MenuLink>
                ))}
              </MenuCol>
              <MenuCol title={m.sectorDividends}>
                {SECTORS.map((s) => (
                  <MenuLink key={s.key} href={`/sectors/${s.key}`}>{s.label[locale]}</MenuLink>
                ))}
                <MenuTitle>{m.payoutChangesTitle}</MenuTitle>
                {PAYOUTS.map((p) => (
                  <MenuLink key={p.key} href={`/payout-changes/${p.key}`}>{p.label[locale]}</MenuLink>
                ))}
                <MenuLink href="/lists/potential-payers">{m.futureDividendPayers}</MenuLink>
              </MenuCol>
              <MenuCol title={m.dividendGrowers}>
                {GROWERS.map((g) => (
                  <MenuLink key={g.key} href={`/growers/${g.key}`}>{`${g.label[locale]} (${GROWER_YEARS[g.key]})`}</MenuLink>
                ))}
                <MenuTitle>{m.etfsExposure}</MenuTitle>
                <MenuLink href="/screener?type=etfs">{m.allDividendEtfs}</MenuLink>
                <MenuLink href="/etfs/which-owns">{m.whichEtfOwns}</MenuLink>
                <MenuLink href="/etfs/top-held">{m.mostHeldByEtfs}</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=real-estate">{m.reitEtfs}</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=energy">{m.energyEtfs}</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=technology">{m.technologyEtfs}</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=health-care">{m.healthcareEtfs}</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.lists} menuKey="lists" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={3}>
              <MenuCol title={m.modelPortfolios}>
                <MenuLink href="/picks/best-high-yield">{m.bestHighDividend}</MenuLink>
                <MenuLink href="/picks/best-dividend-growth">{m.bestDividendGrowth}</MenuLink>
                <MenuLink href="/picks/best-dividend-protection">{m.bestDividendProtection}</MenuLink>
                <MenuLink href="/picks/best-dividend-stocks">{m.bestDividendStocks}</MenuLink>
                <MenuLink href="/picks/best-monthly-dividend">{m.bestMonthlyDividend}</MenuLink>
              </MenuCol>
              <MenuCol title={m.bestSectorDividend}>
                {SECTORS.map((s) => (
                  <MenuLink key={s.key} href={`/picks/best/${s.key}`}>{`${m.bestPrefix} ${s.label[locale]}`}</MenuLink>
                ))}
              </MenuCol>
              <MenuCol title={m.bestDividendCaptureTitle}>
                <MenuLink href="/picks/dividend-capture">{m.bestDividendCaptureStocks}</MenuLink>
                <p className="dv-menu-blurb">{m.captureBlurb}</p>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.highYield} menuKey="high-yield" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={2}>
              <MenuCol title={m.highYieldsTitle}>
                <MenuLink href="/high-yield">{m.yieldsOver4}</MenuLink>
                <MenuLink href="/picks/best-high-yield">{m.bestHighDividend}</MenuLink>
              </MenuCol>
              <MenuCol title="REITs">
                <MenuLink href="/industries/reit">{m.allReits}</MenuLink>
                <MenuLink href="/industries/reit?type=equity">{m.equityReits}</MenuLink>
                <MenuLink href="/industries/reit?type=mortgage">{m.mortgageReits}</MenuLink>
                <MenuLink href="/industries/reit?type=industrial">{m.industrialReits}</MenuLink>
                <MenuLink href="/industries/reit?type=residential">{m.residentialReits}</MenuLink>
                <MenuLink href="/industries/reit?type=healthcare">{m.healthcareReits}</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.calendar} menuKey="calendar" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={2}>
              <MenuCol title={m.exDividendDates}>
                <p className="dv-menu-blurb">{m.exBlurb}</p>
                <MenuLink href="/calendar/ex-dividend?range=week">{m.thisWeekEx}</MenuLink>
                <MenuLink href="/calendar/ex-dividend?range=month">{m.thisMonthEx}</MenuLink>
                <MenuLink href="/calendar/ex-dividend?range=year">{m.thisYearEx}</MenuLink>
              </MenuCol>
              <MenuCol title={m.declarationDates}>
                <p className="dv-menu-blurb">{m.declBlurb}</p>
                <MenuLink href="/calendar/declaration?range=week">{m.lastWeekDecl}</MenuLink>
                <MenuLink href="/calendar/declaration?range=month">{m.lastMonthDecl}</MenuLink>
                <MenuLink href="/calendar/declaration?range=quarter">{m.lastThreeMonths}</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.income} menuKey="income" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={3}>
              <MenuCol title={m.monthlyDividends}>
                <MenuLink href="/monthly">{m.monthlyDividendStocks}</MenuLink>
              </MenuCol>
              <MenuCol title={m.quarterlyMonthly}>
                <MenuLink href="/monthly/staggered">{m.monthlyIncomeQuarterly}</MenuLink>
              </MenuCol>
              <MenuCol title={m.bestPicks}>
                <MenuLink href="/picks/best-monthly-dividend">{m.bestMonthlyDividend}</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <Link href="/screener" className="dv-nav__item dv-nav__item--solo">
            {t.screener}
          </Link>

          <NavItem label={t.tools} menuKey="tools" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={2}>
              <MenuCol title={m.toolsTitle}>
                <MenuLink href="/compare">{t.compare}</MenuLink>
                <MenuLink href="/alternatives">{t.alternatives}</MenuLink>
                <MenuLink href="/tools/portfolio-healthcheck">{m.portfolioHealthcheck}</MenuLink>
              </MenuCol>
              <MenuCol title={m.calculatorsTitle}>
                <MenuLink href="/tools/dividend-calculator">{m.dividendCalculator}</MenuLink>
                <MenuLink href="/tools/compounding-calculator">{m.compoundingCalculator}</MenuLink>
                <MenuLink href="/tools/payout-estimator">{m.payoutEstimator}</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <Link href="/news" className="dv-nav__item dv-nav__item--solo">
            {t.news}
          </Link>

          <Link href="/blog" className="dv-nav__item dv-nav__item--solo">
            {t.blog}
          </Link>

          <Link href="/watchlist" className="dv-nav__item dv-nav__item--solo">
            {t.watchlist}
          </Link>

          <Link href="/download" className="dv-nav__item dv-nav__item--solo">
            {t.app}
          </Link>
        </nav>

        <div className="dv-actions">
          <LanguageSwitcher />
          <CurrencyPicker />
          <button
            type="button"
            className="dv-icon-btn"
            aria-label={t.search}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link href="/pricing" className="dv-action-link">
            {t.pricing}
          </Link>
          {/* Render Sign In / Sign Up immediately on first paint. Earlier this
              was gated on the supabase getSession promise resolving — if that
              hung, nothing rendered after Pricing. Now: signed-out is the
              default, the Account swap happens once auth resolves. */}
          {user ? (
            <Link href="/account" className="dv-action-link dv-action-link--accent">
              {t.account}
            </Link>
          ) : (
            <>
              <Link href="/login" className="dv-action-link">
                {t.signIn}
              </Link>
              <Link href="/signup" className="dv-action-link dv-action-link--accent">
                {t.signUp}
              </Link>
            </>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="dv-search-bar">
          <form className="dv-search-form" onSubmit={submitSearch} role="combobox" aria-expanded={suggestions.length > 0}>
            <input
              autoFocus
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKey}
              className="dv-search-input"
              autoComplete="off"
              aria-autocomplete="list"
            />
            <button type="submit" className="btn">
              {t.search}
            </button>
          </form>
          {suggestions.length > 0 && (
            <ul className="dv-search-suggestions" role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={s.symbol}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`dv-search-suggestion ${i === activeIdx ? "dv-search-suggestion--active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    goToResult(s);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <span className="dv-search-suggestion__symbol">{s.symbol}</span>
                  <span className="dv-search-suggestion__name">{s.name ?? ""}</span>
                  <span className="dv-search-suggestion__meta">
                    {s.is_etf || s.is_fund ? "ETF" : s.sector ?? ""}
                    {s.exchange ? ` · ${s.exchange}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </header>
      {/* Mobile slide-in drawer. Rendered OUTSIDE <header> because .dv-header
          uses backdrop-filter, which creates a containing block for fixed
          positioning — placing the drawer inside breaks `position: fixed`.
          Hidden via CSS at ≥1100px so it never appears on desktop. */}
      {mobileOpen && (
        <>
          <div
            className="dv-mobile-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="dv-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <div className="dv-mobile-drawer__head">
              <span className="dv-brand">
                <span className="dv-brand__dot" />
                <span className="dv-brand__name">{APP_NAME}</span>
              </span>
              <button
                type="button"
                className="dv-mobile-drawer__close"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="dv-mobile-nav" onClick={(e) => {
              // Close the drawer when any internal link is clicked.
              const target = e.target as HTMLElement;
              if (target.closest("a")) setMobileOpen(false);
            }}>
              {/* Account / CTA up top — sign-in/up (or Account) shouldn't be
                  buried at the very bottom of the drawer. */}
              <div className="dv-mobile-account">
                {user ? (
                  <Link href="/account" className="dv-mobile-cta">{t.account}</Link>
                ) : (
                  <div className="dv-mobile-auth">
                    <Link href="/login" className="dv-mobile-cta dv-mobile-cta--ghost">{t.signIn}</Link>
                    <Link href="/signup" className="dv-mobile-cta">{t.signUp}</Link>
                  </div>
                )}
                <Link href="/pricing" className="dv-mobile-account__pricing">{t.pricing}</Link>
              </div>
              {/* Primary quick links — the most-used standalone destinations. */}
              <div className="dv-mobile-solo">
                <Link href="/screener">{t.screener}</Link>
                <Link href="/screener?type=etfs">{`ETF ${t.screener}`}</Link>
                <Link href="/high-yield">{t.highYield}</Link>
                <Link href="/news">{t.news}</Link>
                <Link href="/blog">{t.blog}</Link>
                <Link href="/watchlist">{t.watchlist}</Link>
                <Link href="/download">{t.app}</Link>
              </div>
              <MobileGroup title={t.tools}>
                <Link href="/compare">{t.compare}</Link>
                <Link href="/alternatives">{t.alternatives}</Link>
                <Link href="/tools/portfolio-healthcheck">{m.portfolioHealthcheck}</Link>
                <Link href="/tools/dividend-calculator">{m.dividendCalculator}</Link>
                <Link href="/tools/compounding-calculator">{m.compoundingCalculator}</Link>
                <Link href="/tools/payout-estimator">{m.payoutEstimator}</Link>
              </MobileGroup>
              <MobileGroup title={t.explore}>
                <Link href="/methodology">{t.methodology}</Link>
                <Link href="/about">{t.about}</Link>
              </MobileGroup>
              <MobileGroup title={t.industries}>
                {INDUSTRIES.map((i) => (
                  <Link key={i.key} href={`/industries/${i.key}`}>{i.label[locale]}</Link>
                ))}
              </MobileGroup>
              <MobileGroup title={t.sectors}>
                {SECTORS.map((s) => (
                  <Link key={s.key} href={`/sectors/${s.key}`}>{s.label[locale]}</Link>
                ))}
              </MobileGroup>
              <MobileGroup title={t.payoutChanges}>
                {PAYOUTS.map((p) => (
                  <Link key={p.key} href={`/payout-changes/${p.key}`}>{p.label[locale]}</Link>
                ))}
                <Link href="/lists/potential-payers">{m.futureDividendPayers}</Link>
              </MobileGroup>
              <MobileGroup title={t.listsPicks}>
                <Link href="/picks/best-dividend-stocks">{m.bestDividendStocks}</Link>
                <Link href="/picks/best-high-yield">{m.bestHighDividend}</Link>
                <Link href="/picks/best-dividend-growth">{m.bestDividendGrowth}</Link>
                <Link href="/picks/best-dividend-protection">{m.bestDividendProtection}</Link>
                <Link href="/picks/best-monthly-dividend">{m.bestMonthlyDividend}</Link>
                <Link href="/picks/dividend-capture">{m.bestDividendCaptureStocks}</Link>
                {SECTORS.map((s) => (
                  <Link key={s.key} href={`/picks/best/${s.key}`}>{`${m.bestPrefix} ${s.label[locale]}`}</Link>
                ))}
              </MobileGroup>
              <MobileGroup title={t.calendar}>
                <Link href="/calendar/ex-dividend?range=week">{m.thisWeekEx}</Link>
                <Link href="/calendar/ex-dividend?range=month">{m.thisMonthEx}</Link>
                <Link href="/calendar/ex-dividend?range=year">{m.thisYearEx}</Link>
                <Link href="/calendar/declaration?range=week">{m.lastWeekDecl}</Link>
                <Link href="/calendar/declaration?range=month">{m.lastMonthDecl}</Link>
                <Link href="/calendar/declaration?range=quarter">{m.lastThreeMonths}</Link>
              </MobileGroup>
              <MobileGroup title={t.income}>
                <Link href="/monthly">{m.monthlyDividendStocks}</Link>
                <Link href="/monthly/staggered">{m.monthlyIncomeQuarterly}</Link>
                <Link href="/high-yield">{m.yieldsOver4}</Link>
              </MobileGroup>
              <MobileGroup title={t.etfs}>
                <Link href="/screener?type=etfs">{m.allDividendEtfs}</Link>
                <Link href="/etfs/which-owns">{m.whichEtfOwns}</Link>
                <Link href="/etfs/top-held">{m.mostHeldByEtfs}</Link>
                <Link href="/screener?type=etfs&sector=real-estate">{m.reitEtfs}</Link>
                <Link href="/screener?type=etfs&sector=energy">{m.energyEtfs}</Link>
                <Link href="/screener?type=etfs&sector=technology">{m.technologyEtfs}</Link>
                <Link href="/screener?type=etfs&sector=health-care">{m.healthcareEtfs}</Link>
                <Link href="/lists/potential-payers">{m.futureDividendPayers}</Link>
              </MobileGroup>
              <MobileGroup title={t.growers}>
                {GROWERS.map((g) => (
                  <Link key={g.key} href={`/growers/${g.key}`}>{`${g.label[locale]} (${GROWER_YEARS[g.key]})`}</Link>
                ))}
              </MobileGroup>
              {/* Language switcher — compact flag chips at the foot of the
                  drawer, not an accordion buried among the content sections. */}
              <div className="dv-mobile-langs">
                <span className="dv-mobile-langs__label">{t.languages}</span>
                <div className="dv-mobile-langs__row">
                  <Link href="/" hrefLang="en-US" lang="en" className="dv-mobile-lang">🇬🇧 EN</Link>
                  <Link href="/fr" hrefLang="fr-FR" lang="fr" className="dv-mobile-lang">🇫🇷 FR</Link>
                  <Link href="/de" hrefLang="de-DE" lang="de" className="dv-mobile-lang">🇩🇪 DE</Link>
                  <Link href="/it" hrefLang="it-IT" lang="it" className="dv-mobile-lang">🇮🇹 IT</Link>
                  <Link href="/es" hrefLang="es-ES" lang="es" className="dv-mobile-lang">🇪🇸 ES</Link>
                </div>
              </div>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

function MobileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="dv-mobile-group">
      <summary>{title}</summary>
      <div className="dv-mobile-group__items">{children}</div>
    </details>
  );
}

function NavItem({
  label,
  menuKey,
  open,
  onOpen,
  onClose,
  children,
}: {
  label: string;
  menuKey: MenuKey;
  open: MenuKey;
  onOpen: (k: MenuKey) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isOpen = open === menuKey;
  return (
    <div className="dv-nav__group" onMouseEnter={() => onOpen(menuKey)} onMouseLeave={onClose}>
      <button type="button" className={`dv-nav__item ${isOpen ? "dv-nav__item--active" : ""}`}>
        {label}
        <svg
          className="dv-nav__chevron"
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </button>
      {isOpen && <div className="dv-mega">{children}</div>}
    </div>
  );
}

function MenuGrid({ children, columns }: { children: React.ReactNode; columns: 2 | 3 }) {
  return <div className={`dv-mega__grid dv-mega__grid--${columns}`}>{children}</div>;
}

function MenuCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dv-mega__col">
      <h3 className="dv-mega__title">{title}</h3>
      <div className="dv-mega__items">{children}</div>
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="dv-mega__link">
      <span className="dv-mega__chevron">›</span>
      <span>{children}</span>
    </Link>
  );
}

function MenuTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="dv-mega__subtitle">{children}</h4>;
}

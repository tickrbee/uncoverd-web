"use client";

import { useEffect, useState, useRef } from "react";
import { LocaleLink as Link } from "@/components/locale-link";
import { useRouter, usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/branding";
import { createClient } from "@/lib/supabase/browser";
import { CurrencyPicker } from "@/components/currency-picker";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localeFromPath } from "@/lib/page-equivalents";
import type { Locale } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

// Localized labels for the nav CHROME (top-level items, solo links, action
// buttons, search, mobile group titles). Deep mega-menu links stay English —
// many point to pages not yet localized, and the LocaleLink wrapper already
// routes them to the localized equivalent where one exists.
type NavStrings = {
  explore: string; lists: string; highYield: string; calendar: string; income: string;
  screener: string; compare: string; alternatives: string; news: string; blog: string;
  watchlist: string; app: string; pricing: string; signIn: string; signUp: string;
  account: string; search: string; searchPlaceholder: string;
  methodology: string; about: string; languages: string; industries: string;
  sectors: string; payoutChanges: string; listsPicks: string; etfs: string; growers: string;
};

const NAV_STRINGS: Record<Locale, NavStrings> = {
  en: {
    explore: "Explore", lists: "Lists", highYield: "High Yield", calendar: "Calendar", income: "Income",
    screener: "Screener", compare: "Compare", alternatives: "Alternatives", news: "News", blog: "Blog",
    watchlist: "Watchlist", app: "App", pricing: "Pricing", signIn: "Sign In", signUp: "Sign Up",
    account: "Account", search: "Search",
    searchPlaceholder: "Search by ticker or company name (e.g. AAPL, Johnson, Realty Income)",
    methodology: "Methodology", about: "About", languages: "Languages", industries: "Industries",
    sectors: "Sectors", payoutChanges: "Payout Changes", listsPicks: "Lists & Picks", etfs: "ETFs", growers: "Dividend Growers",
  },
  fr: {
    explore: "Explorer", lists: "Listes", highYield: "Haut rendement", calendar: "Calendrier", income: "Revenu",
    screener: "Screener", compare: "Comparer", alternatives: "Alternatives", news: "Actualités", blog: "Blog",
    watchlist: "Liste de suivi", app: "Appli", pricing: "Tarifs", signIn: "Connexion", signUp: "Inscription",
    account: "Compte", search: "Rechercher",
    searchPlaceholder: "Rechercher par symbole ou nom d'entreprise (ex. AAPL, Johnson, Realty Income)",
    methodology: "Méthodologie", about: "À propos", languages: "Langues", industries: "Industries",
    sectors: "Secteurs", payoutChanges: "Variations de dividende", listsPicks: "Listes et sélections", etfs: "ETF", growers: "Croissance du dividende",
  },
  de: {
    explore: "Entdecken", lists: "Listen", highYield: "Hohe Rendite", calendar: "Kalender", income: "Einkommen",
    screener: "Screener", compare: "Vergleichen", alternatives: "Alternativen", news: "Nachrichten", blog: "Blog",
    watchlist: "Watchlist", app: "App", pricing: "Preise", signIn: "Anmelden", signUp: "Registrieren",
    account: "Konto", search: "Suchen",
    searchPlaceholder: "Nach Ticker oder Firmennamen suchen (z. B. AAPL, Johnson, Realty Income)",
    methodology: "Methodik", about: "Über uns", languages: "Sprachen", industries: "Branchen",
    sectors: "Sektoren", payoutChanges: "Dividendenänderungen", listsPicks: "Listen & Auswahl", etfs: "ETFs", growers: "Dividendenwachstum",
  },
  it: {
    explore: "Esplora", lists: "Liste", highYield: "Alto rendimento", calendar: "Calendario", income: "Reddito",
    screener: "Screener", compare: "Confronta", alternatives: "Alternative", news: "Notizie", blog: "Blog",
    watchlist: "Watchlist", app: "App", pricing: "Prezzi", signIn: "Accedi", signUp: "Registrati",
    account: "Account", search: "Cerca",
    searchPlaceholder: "Cerca per simbolo o nome società (es. AAPL, Johnson, Realty Income)",
    methodology: "Metodologia", about: "Chi siamo", languages: "Lingue", industries: "Industrie",
    sectors: "Settori", payoutChanges: "Variazioni dividendo", listsPicks: "Liste e selezioni", etfs: "ETF", growers: "Crescita dividendi",
  },
  es: {
    explore: "Explorar", lists: "Listas", highYield: "Alta rentabilidad", calendar: "Calendario", income: "Ingresos",
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
  const t = NAV_STRINGS[localeFromPath(usePathname() || "/")];

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
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      goToResult(suggestions[activeIdx]);
      return;
    }
    const q = searchValue.trim();
    if (!q) return;
    const upper = q.toUpperCase().replace(/[^A-Z.\-]/g, "");
    if (upper.length >= 1 && upper.length <= 6) {
      router.push(`/stocks/${upper}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
    closeSearch();
  }

  function goToResult(s: Suggestion) {
    const path = s.is_etf || s.is_fund ? `/etfs/symbol/${s.symbol}` : `/stocks/${s.symbol}`;
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
              <MenuCol title="Industry Dividends">
                <MenuLink href="/industries/reit">REIT</MenuLink>
                <MenuLink href="/industries/mlp">MLP</MenuLink>
                <MenuLink href="/industries/bdc">BDC</MenuLink>
                <MenuLink href="/industries/clean-energy">Clean Energy</MenuLink>
                <MenuLink href="/industries/uranium">Uranium</MenuLink>
                <MenuLink href="/industries/lithium">Lithium</MenuLink>
                <MenuLink href="/industries/precious-metals">Precious Metals</MenuLink>
                <MenuLink href="/industries/water">Water</MenuLink>
                <MenuLink href="/industries/natural-resources">Natural Resources</MenuLink>
                <MenuLink href="/industries/energy-infrastructure">Energy Infrastructure</MenuLink>
                <MenuLink href="/industries/semiconductors">Semiconductors</MenuLink>
                <MenuLink href="/industries/software">Software</MenuLink>
                <MenuLink href="/industries/ecommerce">eCommerce</MenuLink>
                <MenuLink href="/industries/transportation">Transportation</MenuLink>
                <MenuLink href="/industries/autos">Autos</MenuLink>
                <MenuLink href="/industries/airlines">Airlines</MenuLink>
                <MenuLink href="/industries/shipping">Shipping</MenuLink>
                <MenuLink href="/industries/cruise-lines">Cruise Lines</MenuLink>
                <MenuLink href="/industries/hotels">Hotels</MenuLink>
                <MenuLink href="/industries/retail">Retail</MenuLink>
                <MenuLink href="/industries/iron-steel">Iron &amp; Steel</MenuLink>
                <MenuLink href="/industries/chemicals">Chemicals</MenuLink>
                <MenuLink href="/industries/pharma">Pharma</MenuLink>
                <MenuLink href="/industries/insurance">Insurance</MenuLink>
                <MenuLink href="/industries/aerospace-defense">Aerospace &amp; Defense</MenuLink>
              </MenuCol>
              <MenuCol title="Sector Dividends">
                <MenuLink href="/sectors/financials">Financials</MenuLink>
                <MenuLink href="/sectors/real-estate">Real Estate</MenuLink>
                <MenuLink href="/sectors/communications">Communications</MenuLink>
                <MenuLink href="/sectors/consumer-discretionary">Consumer Discretionary</MenuLink>
                <MenuLink href="/sectors/consumer-staples">Consumer Staples</MenuLink>
                <MenuLink href="/sectors/energy">Energy</MenuLink>
                <MenuLink href="/sectors/health-care">Health Care</MenuLink>
                <MenuLink href="/sectors/industrials">Industrials</MenuLink>
                <MenuLink href="/sectors/technology">Technology</MenuLink>
                <MenuLink href="/sectors/materials">Materials</MenuLink>
                <MenuLink href="/sectors/utilities">Utilities</MenuLink>
                <MenuTitle>Payout Changes</MenuTitle>
                <MenuLink href="/payout-changes/increasing">Increasing Dividend</MenuLink>
                <MenuLink href="/payout-changes/decreasing">Decreasing Dividend</MenuLink>
                <MenuLink href="/payout-changes/initiating">Initiating Dividend</MenuLink>
                <MenuLink href="/payout-changes/suspending">Suspending Dividend</MenuLink>
                <MenuLink href="/payout-changes/special">Special Dividend</MenuLink>
                <MenuLink href="/lists/potential-payers">Future Dividend Payers</MenuLink>
              </MenuCol>
              <MenuCol title="Dividend Growers">
                <MenuLink href="/growers/aristocrats">Dividend Aristocrats (&gt;25 yrs)</MenuLink>
                <MenuLink href="/growers/kings">Dividend Kings (&gt;50 yrs)</MenuLink>
                <MenuLink href="/growers/champions">Dividend Champions (&gt;25 yrs)</MenuLink>
                <MenuLink href="/growers/contenders">Dividend Contenders (10–24 yrs)</MenuLink>
                <MenuLink href="/growers/challengers">Dividend Challengers (5–9 yrs)</MenuLink>
                <MenuLink href="/growers/achievers">Dividend Achievers (&gt;10 yrs)</MenuLink>
                <MenuTitle>ETFs &amp; Exposure</MenuTitle>
                <MenuLink href="/screener?type=etfs">All Dividend ETFs</MenuLink>
                <MenuLink href="/etfs/which-owns">Which ETF owns a stock?</MenuLink>
                <MenuLink href="/etfs/top-held">Most held by ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=real-estate">REIT ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=energy">Energy ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=technology">Technology ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=health-care">Healthcare ETFs</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.lists} menuKey="lists" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={3}>
              <MenuCol title="Model Portfolios">
                <MenuLink href="/picks/best-high-yield">Best High Dividend Stocks</MenuLink>
                <MenuLink href="/picks/best-dividend-growth">Best Dividend Growth Stocks</MenuLink>
                <MenuLink href="/picks/best-dividend-protection">Best Dividend Protection</MenuLink>
                <MenuLink href="/picks/best-dividend-stocks">Best Dividend Stocks</MenuLink>
                <MenuLink href="/picks/best-monthly-dividend">Best Monthly Dividend Stocks</MenuLink>
              </MenuCol>
              <MenuCol title="Best Sector Dividend Stocks">
                <MenuLink href="/picks/best/financials">Best Financials</MenuLink>
                <MenuLink href="/picks/best/real-estate">Best Real Estate</MenuLink>
                <MenuLink href="/picks/best/communications">Best Communications</MenuLink>
                <MenuLink href="/picks/best/consumer-discretionary">Best Consumer Disc.</MenuLink>
                <MenuLink href="/picks/best/consumer-staples">Best Consumer Staples</MenuLink>
                <MenuLink href="/picks/best/energy">Best Energy</MenuLink>
                <MenuLink href="/picks/best/health-care">Best Health Care</MenuLink>
                <MenuLink href="/picks/best/industrials">Best Industrial</MenuLink>
                <MenuLink href="/picks/best/technology">Best Technology</MenuLink>
                <MenuLink href="/picks/best/materials">Best Materials</MenuLink>
                <MenuLink href="/picks/best/utilities">Best Utilities</MenuLink>
              </MenuCol>
              <MenuCol title="Best Dividend Capture">
                <MenuLink href="/picks/dividend-capture">Best Dividend Capture Stocks</MenuLink>
                <p className="dv-menu-blurb">
                  Quickest stock price recoveries post dividend. Buy just before the ex-dividend date and sell after the
                  price recovers.
                </p>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.highYield} menuKey="high-yield" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={2}>
              <MenuCol title="High Yields">
                <MenuLink href="/high-yield">Yields over 4%</MenuLink>
                <MenuLink href="/picks/best-high-yield">Best High Dividend Stocks</MenuLink>
              </MenuCol>
              <MenuCol title="REITs">
                <MenuLink href="/industries/reit">All REITs</MenuLink>
                <MenuLink href="/industries/reit?type=equity">Equity REITs</MenuLink>
                <MenuLink href="/industries/reit?type=mortgage">Mortgage REITs</MenuLink>
                <MenuLink href="/industries/reit?type=industrial">Industrial REITs</MenuLink>
                <MenuLink href="/industries/reit?type=residential">Residential REITs</MenuLink>
                <MenuLink href="/industries/reit?type=healthcare">Healthcare REITs</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.calendar} menuKey="calendar" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={2}>
              <MenuCol title="Ex-Dividend Dates">
                <p className="dv-menu-blurb">
                  Must be a shareholder on or before the next ex-dividend date to receive the upcoming dividend.
                </p>
                <MenuLink href="/calendar/ex-dividend?range=week">This Week&apos;s Ex-Dates</MenuLink>
                <MenuLink href="/calendar/ex-dividend?range=month">This Month&apos;s Ex-Dates</MenuLink>
                <MenuLink href="/calendar/ex-dividend?range=year">This Year&apos;s Ex-Dates</MenuLink>
              </MenuCol>
              <MenuCol title="Declaration Dates">
                <p className="dv-menu-blurb">
                  Track recent declarations and get ready for upcoming payouts.
                </p>
                <MenuLink href="/calendar/declaration?range=week">Last Week&apos;s Declarations</MenuLink>
                <MenuLink href="/calendar/declaration?range=month">Last Month&apos;s Declarations</MenuLink>
                <MenuLink href="/calendar/declaration?range=quarter">Last Three Months</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label={t.income} menuKey="income" open={open} onOpen={openMenu} onClose={scheduleClose}>
            <MenuGrid columns={3}>
              <MenuCol title="Monthly Dividends">
                <MenuLink href="/monthly">Monthly Dividend Stocks</MenuLink>
              </MenuCol>
              <MenuCol title="Quarterly that pay monthly">
                <MenuLink href="/monthly/staggered">Monthly Income from Quarterly</MenuLink>
              </MenuCol>
              <MenuCol title="Best Picks">
                <MenuLink href="/picks/best-monthly-dividend">Best Monthly Dividend Stocks</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <Link href="/screener" className="dv-nav__item dv-nav__item--solo">
            {t.screener}
          </Link>

          <Link href="/compare" className="dv-nav__item dv-nav__item--solo">
            {t.compare}
          </Link>

          <Link href="/alternatives" className="dv-nav__item dv-nav__item--solo">
            {t.alternatives}
          </Link>

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
              {/* Top-level direct links — match the desktop nav's standalone
                  items (Screener, Compare, Alternatives, News, Watchlist,
                  App). Anything that's a single link on desktop should be
                  a single link here too, not buried in a collapsed group. */}
              <div className="dv-mobile-solo">
                <Link href="/screener">{t.screener}</Link>
                <Link href="/screener?type=etfs">{`ETF ${t.screener}`}</Link>
                <Link href="/compare">{t.compare}</Link>
                <Link href="/alternatives">{t.alternatives}</Link>
                <Link href="/news">{t.news}</Link>
                <Link href="/blog">{t.blog}</Link>
                <Link href="/watchlist">{t.watchlist}</Link>
                <Link href="/download">{t.app}</Link>
              </div>
              <MobileGroup title={t.explore}>
                <Link href="/methodology">{t.methodology}</Link>
                <Link href="/about">{t.about}</Link>
              </MobileGroup>
              <MobileGroup title={t.languages}>
                <Link href="/fr" hrefLang="fr-FR" lang="fr">🇫🇷 Français</Link>
                <Link href="/de" hrefLang="de-DE" lang="de">🇩🇪 Deutsch</Link>
                <Link href="/it" hrefLang="it-IT" lang="it">🇮🇹 Italiano</Link>
                <Link href="/es" hrefLang="es-ES" lang="es">🇪🇸 Español</Link>
              </MobileGroup>
              <MobileGroup title={t.industries}>
                <Link href="/industries/reit">REIT</Link>
                <Link href="/industries/mlp">MLP</Link>
                <Link href="/industries/bdc">BDC</Link>
                <Link href="/industries/clean-energy">Clean Energy</Link>
                <Link href="/industries/uranium">Uranium</Link>
                <Link href="/industries/lithium">Lithium</Link>
                <Link href="/industries/precious-metals">Precious Metals</Link>
                <Link href="/industries/water">Water</Link>
                <Link href="/industries/natural-resources">Natural Resources</Link>
                <Link href="/industries/energy-infrastructure">Energy Infrastructure</Link>
                <Link href="/industries/semiconductors">Semiconductors</Link>
                <Link href="/industries/software">Software</Link>
                <Link href="/industries/ecommerce">eCommerce</Link>
                <Link href="/industries/transportation">Transportation</Link>
                <Link href="/industries/autos">Autos</Link>
                <Link href="/industries/airlines">Airlines</Link>
                <Link href="/industries/shipping">Shipping</Link>
                <Link href="/industries/cruise-lines">Cruise Lines</Link>
                <Link href="/industries/hotels">Hotels</Link>
                <Link href="/industries/retail">Retail</Link>
                <Link href="/industries/iron-steel">Iron &amp; Steel</Link>
                <Link href="/industries/chemicals">Chemicals</Link>
                <Link href="/industries/pharma">Pharma</Link>
                <Link href="/industries/insurance">Insurance</Link>
                <Link href="/industries/aerospace-defense">Aerospace &amp; Defense</Link>
              </MobileGroup>
              <MobileGroup title={t.sectors}>
                <Link href="/sectors/financials">Financials</Link>
                <Link href="/sectors/real-estate">Real Estate</Link>
                <Link href="/sectors/communications">Communications</Link>
                <Link href="/sectors/consumer-discretionary">Consumer Discretionary</Link>
                <Link href="/sectors/consumer-staples">Consumer Staples</Link>
                <Link href="/sectors/energy">Energy</Link>
                <Link href="/sectors/health-care">Health Care</Link>
                <Link href="/sectors/industrials">Industrials</Link>
                <Link href="/sectors/technology">Technology</Link>
                <Link href="/sectors/materials">Materials</Link>
                <Link href="/sectors/utilities">Utilities</Link>
              </MobileGroup>
              <MobileGroup title={t.payoutChanges}>
                <Link href="/payout-changes/increasing">Increasing Dividend</Link>
                <Link href="/payout-changes/decreasing">Decreasing Dividend</Link>
                <Link href="/payout-changes/initiating">Initiating Dividend</Link>
                <Link href="/payout-changes/suspending">Suspending Dividend</Link>
                <Link href="/payout-changes/special">Special Dividend</Link>
                <Link href="/lists/potential-payers">Future Dividend Payers</Link>
              </MobileGroup>
              <MobileGroup title={t.listsPicks}>
                <Link href="/picks/best-dividend-stocks">Best Dividend Stocks</Link>
                <Link href="/picks/best-high-yield">Best High Yield</Link>
                <Link href="/picks/best-dividend-growth">Best Dividend Growth</Link>
                <Link href="/picks/best-dividend-protection">Best Dividend Protection</Link>
                <Link href="/picks/best-monthly-dividend">Best Monthly Dividend</Link>
                <Link href="/picks/dividend-capture">Best Dividend Capture</Link>
                <Link href="/picks/best/financials">Best Financials</Link>
                <Link href="/picks/best/real-estate">Best Real Estate</Link>
                <Link href="/picks/best/communications">Best Communications</Link>
                <Link href="/picks/best/consumer-discretionary">Best Consumer Disc.</Link>
                <Link href="/picks/best/consumer-staples">Best Consumer Staples</Link>
                <Link href="/picks/best/energy">Best Energy</Link>
                <Link href="/picks/best/health-care">Best Health Care</Link>
                <Link href="/picks/best/industrials">Best Industrial</Link>
                <Link href="/picks/best/technology">Best Technology</Link>
                <Link href="/picks/best/materials">Best Materials</Link>
                <Link href="/picks/best/utilities">Best Utilities</Link>
              </MobileGroup>
              <MobileGroup title={t.calendar}>
                <Link href="/calendar/ex-dividend?range=week">This Week's Ex-Dates</Link>
                <Link href="/calendar/ex-dividend?range=month">This Month's Ex-Dates</Link>
                <Link href="/calendar/ex-dividend?range=year">This Year's Ex-Dates</Link>
                <Link href="/calendar/declaration?range=week">Last Week's Declarations</Link>
                <Link href="/calendar/declaration?range=month">Last Month's Declarations</Link>
                <Link href="/calendar/declaration?range=quarter">Last Three Months</Link>
              </MobileGroup>
              <MobileGroup title={t.income}>
                <Link href="/monthly">Monthly Dividend Stocks</Link>
                <Link href="/monthly/staggered">Monthly Income from Quarterly</Link>
                <Link href="/high-yield">Yields over 4%</Link>
              </MobileGroup>
              <MobileGroup title={t.etfs}>
                <Link href="/screener?type=etfs">All Dividend ETFs</Link>
                <Link href="/etfs/which-owns">Which ETF owns a stock?</Link>
                <Link href="/etfs/top-held">Most held by ETFs</Link>
                <Link href="/screener?type=etfs&sector=real-estate">REIT ETFs</Link>
                <Link href="/screener?type=etfs&sector=energy">Energy ETFs</Link>
                <Link href="/screener?type=etfs&sector=technology">Technology ETFs</Link>
                <Link href="/screener?type=etfs&sector=health-care">Healthcare ETFs</Link>
                <Link href="/lists/potential-payers">Future Dividend Payers</Link>
              </MobileGroup>
              <MobileGroup title={t.growers}>
                <Link href="/growers/aristocrats">Aristocrats (25+ yrs)</Link>
                <Link href="/growers/kings">Kings (50+ yrs)</Link>
                <Link href="/growers/champions">Champions (25+ yrs)</Link>
                <Link href="/growers/contenders">Contenders (10–24 yrs)</Link>
                <Link href="/growers/challengers">Challengers (5–9 yrs)</Link>
                <Link href="/growers/achievers">Achievers (10+ yrs)</Link>
              </MobileGroup>
              <MobileGroup title={t.account}>
                <Link href="/watchlist">{t.watchlist}</Link>
                <Link href="/download">{t.app}</Link>
                <Link href="/pricing">{t.pricing}</Link>
                {user ? (
                  <Link href="/account">{t.account}</Link>
                ) : (
                  <>
                    <Link href="/login">{t.signIn}</Link>
                    <Link href="/signup">{t.signUp}</Link>
                  </>
                )}
              </MobileGroup>
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

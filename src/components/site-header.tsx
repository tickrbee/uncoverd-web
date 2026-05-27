"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/branding";
import { createClient } from "@/lib/supabase/browser";
import { CurrencyPicker } from "@/components/currency-picker";
import type { User } from "@supabase/supabase-js";

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

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<MenuKey>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
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
    <header className="dv-header">
      <div className="dv-header__inner">
        <Link href="/" className="dv-brand" aria-label={`${APP_NAME} home`}>
          <span className="dv-brand__dot" />
          <span className="dv-brand__name">{APP_NAME}</span>
        </Link>

        <nav className="dv-nav" aria-label="Main">
          <NavItem
            label="Explore"
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
              </MenuCol>
              <MenuCol title="Dividend Growers">
                <MenuLink href="/growers/aristocrats">Dividend Aristocrats (&gt;25 yrs)</MenuLink>
                <MenuLink href="/growers/kings">Dividend Kings (&gt;50 yrs)</MenuLink>
                <MenuLink href="/growers/champions">Dividend Champions (&gt;25 yrs)</MenuLink>
                <MenuLink href="/growers/contenders">Dividend Contenders (10–24 yrs)</MenuLink>
                <MenuLink href="/growers/challengers">Dividend Challengers (5–9 yrs)</MenuLink>
                <MenuLink href="/growers/achievers">Dividend Achievers (&gt;10 yrs)</MenuLink>
                <MenuTitle>ETFs by industry</MenuTitle>
                <MenuLink href="/screener?type=etfs">All Dividend ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=real-estate">REIT ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=energy">Energy ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=financials">Financials ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=technology">Technology ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=health-care">Healthcare ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=utilities">Utility ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=consumer-staples">Consumer Staples ETFs</MenuLink>
                <MenuLink href="/screener?type=etfs&sector=materials">Materials ETFs</MenuLink>
              </MenuCol>
            </MenuGrid>
          </NavItem>

          <NavItem label="Lists" menuKey="lists" open={open} onOpen={openMenu} onClose={scheduleClose}>
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

          <NavItem label="High Yield" menuKey="high-yield" open={open} onOpen={openMenu} onClose={scheduleClose}>
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

          <NavItem label="Calendar" menuKey="calendar" open={open} onOpen={openMenu} onClose={scheduleClose}>
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

          <NavItem label="Income" menuKey="income" open={open} onOpen={openMenu} onClose={scheduleClose}>
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
            Screener
          </Link>

          <Link href="/news" className="dv-nav__item dv-nav__item--solo">
            News
          </Link>

          <Link href="/watchlist" className="dv-nav__item dv-nav__item--solo">
            Watchlist
          </Link>

          <Link href="/download" className="dv-nav__item dv-nav__item--solo">
            App
          </Link>
        </nav>

        <div className="dv-actions">
          <CurrencyPicker />
          <button
            type="button"
            className="dv-icon-btn"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link href="/pricing" className="dv-action-link">
            Pricing
          </Link>
          {!loading && (
            <>
              {user ? (
                <Link href="/account" className="dv-action-link dv-action-link--accent">
                  Account
                </Link>
              ) : (
                <Link href="/login" className="dv-action-link dv-action-link--accent">
                  Log In
                </Link>
              )}
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
              placeholder="Search by ticker or company name (e.g. AAPL, Johnson, Realty Income)"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKey}
              className="dv-search-input"
              autoComplete="off"
              aria-autocomplete="list"
            />
            <button type="submit" className="btn">
              Search
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

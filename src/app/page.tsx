import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DividendTable, CalendarTable } from "@/components/dividend-table";
import {
  listStocks,
  dividendCalendar,
  latestNews,
  isoToday,
  isoDaysFromNow,
  getStockRatings,
  formatDate,
  type StockRow,
  type DividendEvent,
  type NewsRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "uncoverd — Dividend stock research, screener, and model portfolios",
  description:
    "Discover the best dividend stocks with the uncoverd screener, ratings, model portfolios, and ex-dividend calendar.",
};

export const dynamic = "force-dynamic";
export const revalidate = 900;

// Curated lists of well-known dividend names. These appear on the home page
// as direct links to their detail pages, giving Google + AI crawlers a
// strong signal that those pages matter (high-authority internal linking).
const POPULAR_STOCKS = [
  "AAPL", "MSFT", "JNJ", "KO", "PG", "JPM", "XOM", "CVX",
  "PFE", "ABBV", "MRK", "VZ", "T", "WMT", "HD", "MCD",
  "PEP", "MO", "LMT", "IBM", "O", "NEE", "DUK", "SO",
  "BAC", "CSCO", "GIS", "TXN", "AVGO", "MMM",
];

const POPULAR_ETFS = [
  "SCHD", "VYM", "DGRO", "VIG", "HDV", "DIVO", "JEPI", "JEPQ",
  "SPYD", "NOBL", "SDY", "DVY", "DGRW", "IDV", "DLN",
];

export default async function HomePage() {
  let topYielders: StockRow[] = [];
  let exDivCal: DividendEvent[] = [];
  let newsItems: NewsRow[] = [];
  try {
    [topYielders, exDivCal, newsItems] = await Promise.all([
      listStocks({ minDividend: 2, minMarketCap: 5_000_000_000, sortBy: "yield", limit: 8 }),
      dividendCalendar(isoToday(), isoDaysFromNow(14), 200),
      latestNews(8),
    ]);
  } catch (e) {
    console.error(e);
  }

  const premium = await getPremiumStatus();
  const ratings = await getStockRatings(topYielders.map((r) => r.symbol));

  // Resolve company names so the calendar shows "AAPL — Apple Inc." instead of
  // just bare tickers.
  const calSymbols = Array.from(new Set(exDivCal.slice(0, 10).map((d) => d.symbol)));
  const nameMap = new Map<string, string>();
  if (calSymbols.length > 0) {
    try {
      const { getBackendClient } = await import("@/lib/supabase/admin");
      const sb = getBackendClient();
      const { data } = await sb
        .from("tickers")
        .select("symbol,name")
        .in("symbol", calSymbols);
      for (const r of (data as { symbol: string; name: string | null }[]) ?? []) {
        if (r.name) nameMap.set(r.symbol, r.name);
      }
    } catch {
      // Best-effort: still show the table without names if the lookup fails.
    }
  }

  const upcoming = exDivCal.slice(0, 10).map((d) => ({
    symbol: d.symbol,
    name: nameMap.get(d.symbol) ?? null,
    exDate: d.date,
    paymentDate: d.payment_date ?? undefined,
    declarationDate: d.declaration_date ?? undefined,
    recordDate: d.record_date ?? undefined,
    dividend: d.dividend,
    frequency: d.frequency ?? undefined,
  }));

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 50%, #1e40af 100%)" }}
        >
          <p className="dv-eyebrow">Dividend Research Platform</p>
          <h1>The best dividend stock platform in {new Date().getFullYear()}.</h1>
          <p>
            Honing in on the right dividend stock, ETF, or fund is paramount. uncoverd lets you find and compare
            dividend picks against ratings, fundamentals, payout history, and growth — with model portfolios curated for
            every investor profile.
          </p>
          <div className="hero__actions" style={{ marginTop: "1.25rem" }}>
            <Link href="/screener" className="btn">
              Open Screener
            </Link>
            <Link href="/picks/best-dividend-stocks" className="btn btn--ghost">
              See Best Dividend Stocks
            </Link>
          </div>
        </section>

        {/*
          Popular tickers block: high-authority internal links from the home
          page to the most-searched stock + ETF detail pages. Boosts crawl
          priority for these targets and helps users jump to recognizable
          names instead of the obscure foreign yielders that often top the
          "Top dividend stocks right now" block.
        */}
        <section className="dv-popular">
          <div className="dv-popular__group">
            <h3 className="dv-popular__title">Popular dividend stocks</h3>
            <ul className="dv-popular__list" aria-label="Popular dividend stocks">
              {POPULAR_STOCKS.map((sym) => (
                <li key={sym}>
                  <Link href={`/stocks/${sym}`} className="dv-popular__chip">
                    {sym}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="dv-popular__group">
            <h3 className="dv-popular__title">Popular dividend ETFs</h3>
            <ul className="dv-popular__list" aria-label="Popular dividend ETFs">
              {POPULAR_ETFS.map((sym) => (
                <li key={sym}>
                  <Link href={`/etfs/symbol/${sym}`} className="dv-popular__chip">
                    {sym}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <h2 className="dv-section-title">Explore dividend tools</h2>
        <div className="dv-home-grid">
          <Link href="/screener" className="dv-feature-card">
            <h3>Stock Screener</h3>
            <p>Filter thousands of dividend stocks by yield, market cap, sector, and payout ratio.</p>
          </Link>
          <Link href="/calendar/ex-dividend" className="dv-feature-card">
            <h3>Ex-Dividend Calendar</h3>
            <p>Upcoming ex-dividend dates so you can capture every payout.</p>
          </Link>
          <Link href="/monthly" className="dv-feature-card">
            <h3>Monthly Dividends</h3>
            <p>Schedule monthly income with stocks that pay every month.</p>
          </Link>
          <Link href="/growers/aristocrats" className="dv-feature-card">
            <h3>Dividend Aristocrats</h3>
            <p>Companies that have raised dividends for 25+ consecutive years.</p>
          </Link>
          <Link href="/picks/best-dividend-stocks" className="dv-feature-card">
            <h3>Model Portfolios</h3>
            <p>High Yield, Growth, Protection and more — built and rebalanced for you.</p>
          </Link>
          <Link href="/news" className="dv-feature-card">
            <h3>Dividend News</h3>
            <p>Dividend declarations, increases, special payouts and market commentary.</p>
          </Link>
        </div>

        <h2 className="dv-section-title">Top dividend stocks right now</h2>
        <DividendTable rows={topYielders} ratings={ratings} isPremium={premium.isPremium} />
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/screener" className="dv-action-link dv-action-link--accent">
            See the full screener →
          </Link>
        </p>

        <h2 className="dv-section-title">Upcoming ex-dividend dates</h2>
        <CalendarTable rows={upcoming} />
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/calendar/ex-dividend" className="dv-action-link dv-action-link--accent">
            View full ex-dividend calendar →
          </Link>
        </p>

        <h2 className="dv-section-title">Latest dividend news</h2>
        {newsItems.length === 0 ? (
          <div className="dv-empty">No news available right now.</div>
        ) : (
          <div className="dv-news-grid">
            {newsItems.slice(0, 6).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="dv-news-card">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt="" className="dv-news-card__image" />
                )}
                <div className="dv-news-card__body">
                  <h3 className="dv-news-card__title">{n.title}</h3>
                  <p className="dv-news-card__meta">
                    {n.publisher ?? n.site ?? "—"} · {formatDate(n.published_date)}
                  </p>
                  {n.text && <p className="dv-news-card__excerpt">{n.text.slice(0, 140)}…</p>}
                </div>
              </a>
            ))}
          </div>
        )}
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/news" className="dv-action-link dv-action-link--accent">
            See all news →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

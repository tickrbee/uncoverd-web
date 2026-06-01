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
  redactRowsForFree,
  gatedMap,
  formatDate,
  type StockRow,
  type DividendEvent,
  type NewsRow,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";
import { HTML_LANG, localePrefix, type Locale } from "@/lib/i18n";
import { HtmlLang } from "@/components/html-lang";

// Shared homepage rendered in-place for every locale (root = en, /fr, /de, …).
// Same structure and live data as the English home; only the copy is localized
// via HOME_STRINGS, and the internal links point to each language's pages.
type Feature = { title: string; desc: string; href: string };
type HomeStrings = {
  eyebrow: string;
  h1: (year: number) => string;
  intro: string;
  ctaScreener: { label: string; href: string };
  ctaBest: { label: string; href: string };
  toolsTitle: string;
  features: Feature[];
  topStocksTitle: string;
  seeScreener: { label: string; href: string };
  calTitle: string;
  viewCalendar: { label: string; href: string };
  newsTitle: string;
  seeNews: { label: string; href: string };
  noNews: string;
};

export const HOME_STRINGS: Record<Locale, HomeStrings> = {
  en: {
    eyebrow: "Dividend Research Platform",
    h1: (y) => `The best dividend stock platform in ${y}.`,
    intro:
      "Find and compare dividend stocks, ETFs and funds against ratings, fundamentals, payout history and growth — with model portfolios for every investor profile.",
    ctaScreener: { label: "Open Screener", href: "/screener" },
    ctaBest: { label: "See Best Dividend Stocks", href: "/picks/best-dividend-stocks" },
    toolsTitle: "Explore dividend tools",
    features: [
      { title: "Stock Screener", desc: "Filter thousands of dividend stocks by yield, market cap, sector and payout ratio.", href: "/screener" },
      { title: "Ex-Dividend Calendar", desc: "Upcoming ex-dividend dates so you can capture every payout.", href: "/calendar/ex-dividend" },
      { title: "Monthly Dividends", desc: "Schedule monthly income with stocks that pay every month.", href: "/monthly" },
      { title: "Dividend Aristocrats", desc: "Companies that have raised dividends for 25+ consecutive years.", href: "/growers/aristocrats" },
      { title: "Sector Dividends", desc: "Best dividend stocks by sector, ranked by yield.", href: "/sectors/energy" },
      { title: "Dividend Blog", desc: "Guides on finding, valuing and tracking dividend stocks.", href: "/blog" },
    ],
    topStocksTitle: "Top dividend stocks right now",
    seeScreener: { label: "See the full screener →", href: "/screener" },
    calTitle: "Upcoming ex-dividend dates",
    viewCalendar: { label: "View full ex-dividend calendar →", href: "/calendar/ex-dividend" },
    newsTitle: "Latest dividend news",
    seeNews: { label: "See all news →", href: "/news" },
    noNews: "No news available right now.",
  },
  fr: {
    eyebrow: "Plateforme de recherche sur les dividendes",
    h1: (y) => `La meilleure plateforme d'actions à dividende en ${y}.`,
    intro:
      "Trouvez et comparez les actions, ETF et fonds à dividende selon les notes, les fondamentaux, l'historique de versement et la croissance — avec des portefeuilles modèles pour chaque profil.",
    ctaScreener: { label: "Ouvrir le screener", href: "/screener" },
    ctaBest: { label: "Meilleures actions à dividende", href: "/fr/meilleures-actions-dividende" },
    toolsTitle: "Explorer les outils dividendes",
    features: [
      { title: "Meilleures actions à dividende", desc: "Palmarès des actions du CAC 40 et internationales, classées par rendement.", href: "/fr/meilleures-actions-dividende" },
      { title: "Calendrier des dividendes", desc: "Prochaines dates de détachement pour ne manquer aucun versement.", href: "/fr/calendrier-dividendes" },
      { title: "Actions à dividende mensuel", desc: "Construisez un revenu mensuel avec des actions qui paient chaque mois.", href: "/fr/actions-dividende-mensuel" },
      { title: "Dividendes par secteur", desc: "Meilleures actions à dividende par secteur, classées par rendement.", href: "/fr/secteurs/energie" },
      { title: "Screener de dividendes", desc: "Filtrez des milliers d'actions par rendement, capitalisation et secteur.", href: "/screener" },
      { title: "Blog Dividendes", desc: "Guides pour trouver, évaluer et suivre les actions à dividende.", href: "/fr/blog" },
    ],
    topStocksTitle: "Top des actions à dividende",
    seeScreener: { label: "Voir le screener complet →", href: "/screener" },
    calTitle: "Prochaines dates de détachement",
    viewCalendar: { label: "Voir le calendrier complet →", href: "/fr/calendrier-dividendes" },
    newsTitle: "Actualités dividendes",
    seeNews: { label: "Voir toutes les actualités →", href: "/news" },
    noNews: "Aucune actualité pour le moment.",
  },
  de: {
    eyebrow: "Plattform für Dividenden-Recherche",
    h1: (y) => `Die beste Dividenden-Aktien-Plattform ${y}.`,
    intro:
      "Finden und vergleichen Sie Dividenden-Aktien, ETFs und Fonds nach Bewertung, Fundamentaldaten, Zahlungshistorie und Wachstum — mit Musterportfolios für jedes Anlegerprofil.",
    ctaScreener: { label: "Screener öffnen", href: "/screener" },
    ctaBest: { label: "Beste Dividenden-Aktien", href: "/de/beste-dividenden-aktien" },
    toolsTitle: "Dividenden-Tools entdecken",
    features: [
      { title: "Beste Dividenden-Aktien", desc: "Rangliste der DAX- und internationalen Aktien nach Rendite.", href: "/de/beste-dividenden-aktien" },
      { title: "Dividendenkalender", desc: "Nächste Ex-Dividenden-Termine, damit Sie keine Zahlung verpassen.", href: "/de/dividendenkalender" },
      { title: "Aktien mit monatlicher Dividende", desc: "Monatliches Einkommen mit Aktien, die jeden Monat zahlen.", href: "/de/monatliche-dividenden-aktien" },
      { title: "Dividenden nach Sektor", desc: "Beste Dividenden-Aktien je Sektor, nach Rendite sortiert.", href: "/de/sektoren/energie" },
      { title: "Dividenden-Screener", desc: "Filtern Sie Tausende Aktien nach Rendite, Größe und Sektor.", href: "/screener" },
      { title: "Dividenden-Blog", desc: "Ratgeber zum Finden, Bewerten und Verfolgen von Dividenden-Aktien.", href: "/de/blog" },
    ],
    topStocksTitle: "Top-Dividenden-Aktien jetzt",
    seeScreener: { label: "Zum vollständigen Screener →", href: "/screener" },
    calTitle: "Nächste Ex-Dividenden-Termine",
    viewCalendar: { label: "Vollständigen Dividendenkalender ansehen →", href: "/de/dividendenkalender" },
    newsTitle: "Aktuelle Dividenden-News",
    seeNews: { label: "Alle News ansehen →", href: "/news" },
    noNews: "Derzeit keine News verfügbar.",
  },
  it: {
    eyebrow: "Piattaforma di ricerca sui dividendi",
    h1: (y) => `La migliore piattaforma di azioni con dividendo nel ${y}.`,
    intro:
      "Trova e confronta azioni, ETF e fondi a dividendo per valutazione, fondamentali, storico dei pagamenti e crescita — con portafogli modello per ogni profilo.",
    ctaScreener: { label: "Apri lo screener", href: "/screener" },
    ctaBest: { label: "Migliori azioni con dividendo", href: "/it/migliori-azioni-dividendi" },
    toolsTitle: "Esplora gli strumenti dividendi",
    features: [
      { title: "Migliori azioni con dividendo", desc: "Classifica dei titoli del FTSE MIB e internazionali per rendimento.", href: "/it/migliori-azioni-dividendi" },
      { title: "Calendario dividendi", desc: "Prossime date di stacco per non perdere alcun pagamento.", href: "/it/calendario-dividendi" },
      { title: "Azioni con dividendo mensile", desc: "Costruisci un reddito mensile con azioni che pagano ogni mese.", href: "/it/azioni-dividendo-mensile" },
      { title: "Dividendi per settore", desc: "Migliori azioni con dividendo per settore, ordinate per rendimento.", href: "/it/settori/energia" },
      { title: "Screener dividendi", desc: "Filtra migliaia di azioni per rendimento, dimensione e settore.", href: "/screener" },
      { title: "Blog Dividendi", desc: "Guide per trovare, valutare e monitorare le azioni a dividendo.", href: "/it/blog" },
    ],
    topStocksTitle: "Migliori azioni con dividendo ora",
    seeScreener: { label: "Vai allo screener completo →", href: "/screener" },
    calTitle: "Prossime date di stacco",
    viewCalendar: { label: "Vedi il calendario completo →", href: "/it/calendario-dividendi" },
    newsTitle: "Ultime notizie sui dividendi",
    seeNews: { label: "Vedi tutte le notizie →", href: "/news" },
    noNews: "Nessuna notizia al momento.",
  },
  es: {
    eyebrow: "Plataforma de análisis de dividendos",
    h1: (y) => `La mejor plataforma de acciones por dividendo en ${y}.`,
    intro:
      "Encuentra y compara acciones, ETF y fondos de dividendos por valoración, fundamentales, historial de pagos y crecimiento — con carteras modelo para cada perfil.",
    ctaScreener: { label: "Abrir el screener", href: "/screener" },
    ctaBest: { label: "Mejores acciones por dividendo", href: "/es/mejores-acciones-dividendos" },
    toolsTitle: "Explora las herramientas de dividendos",
    features: [
      { title: "Mejores acciones por dividendo", desc: "Ranking de valores del IBEX 35 e internacionales por rentabilidad.", href: "/es/mejores-acciones-dividendos" },
      { title: "Próximos dividendos", desc: "Próximas fechas ex-dividendo para no perder ningún pago.", href: "/es/proximos-dividendos" },
      { title: "Acciones con dividendo mensual", desc: "Construye ingresos mensuales con acciones que pagan cada mes.", href: "/es/acciones-dividendo-mensual" },
      { title: "Dividendos por sector", desc: "Mejores acciones por dividendo por sector, ordenadas por rentabilidad.", href: "/es/sectores/energia" },
      { title: "Screener de dividendos", desc: "Filtra miles de acciones por rentabilidad, tamaño y sector.", href: "/screener" },
      { title: "Blog de Dividendos", desc: "Guías para encontrar, valorar y seguir acciones de dividendos.", href: "/es/blog" },
    ],
    topStocksTitle: "Mejores acciones por dividendo ahora",
    seeScreener: { label: "Ver el screener completo →", href: "/screener" },
    calTitle: "Próximas fechas ex-dividendo",
    viewCalendar: { label: "Ver el calendario completo →", href: "/es/proximos-dividendos" },
    newsTitle: "Últimas noticias de dividendos",
    seeNews: { label: "Ver todas las noticias →", href: "/news" },
    noNews: "No hay noticias por el momento.",
  },
};

export async function HomeView({ locale }: { locale: Locale }) {
  const t = HOME_STRINGS[locale];
  void localePrefix; // (kept for future locale-aware helpers)

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
  const ratings = gatedMap(await getStockRatings(topYielders.map((r) => r.symbol)), premium.isPremium);
  const safeTopYielders = redactRowsForFree(topYielders, premium.isPremium);

  const calSymbols = Array.from(new Set(exDivCal.slice(0, 10).map((d) => d.symbol)));
  const nameMap = new Map<string, string>();
  if (calSymbols.length > 0) {
    try {
      const { getBackendClient } = await import("@/lib/supabase/admin");
      const sb = getBackendClient();
      const { data } = await sb.from("tickers").select("symbol,name").in("symbol", calSymbols);
      for (const r of (data as { symbol: string; name: string | null }[]) ?? []) {
        if (r.name) nameMap.set(r.symbol, r.name);
      }
    } catch {
      /* best-effort */
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
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <section
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 50%, #1e40af 100%)" }}
        >
          <p className="dv-eyebrow">{t.eyebrow}</p>
          <h1>{t.h1(new Date().getFullYear())}</h1>
          <p>{t.intro}</p>
          <div className="hero__actions" style={{ marginTop: "1.25rem" }}>
            <Link href={t.ctaScreener.href} className="btn">{t.ctaScreener.label}</Link>
            <Link href={t.ctaBest.href} className="btn btn--ghost">{t.ctaBest.label}</Link>
          </div>
        </section>

        <h2 className="dv-section-title">{t.toolsTitle}</h2>
        <div className="dv-home-grid">
          {t.features.map((f) => (
            <Link key={f.href} href={f.href} className="dv-feature-card">
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>

        <h2 className="dv-section-title">{t.topStocksTitle}</h2>
        <DividendTable rows={safeTopYielders} ratings={ratings} isPremium={premium.isPremium} />
        <p style={{ marginTop: "0.75rem" }}>
          <Link href={t.seeScreener.href} className="dv-action-link dv-action-link--accent">{t.seeScreener.label}</Link>
        </p>

        <h2 className="dv-section-title">{t.calTitle}</h2>
        <CalendarTable rows={upcoming} />
        <p style={{ marginTop: "0.75rem" }}>
          <Link href={t.viewCalendar.href} className="dv-action-link dv-action-link--accent">{t.viewCalendar.label}</Link>
        </p>

        <h2 className="dv-section-title">{t.newsTitle}</h2>
        {newsItems.length === 0 ? (
          <div className="dv-empty">{t.noNews}</div>
        ) : (
          <div className="dv-news-grid">
            {newsItems.slice(0, 6).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="dv-news-card">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt={n.title} className="dv-news-card__image" />
                )}
                <div className="dv-news-card__body">
                  <h3 className="dv-news-card__title">{n.title}</h3>
                  <p className="dv-news-card__meta">{n.publisher ?? n.site ?? "—"} · {formatDate(n.published_date)}</p>
                  {n.text && <p className="dv-news-card__excerpt">{n.text.slice(0, 140)}…</p>}
                </div>
              </a>
            ))}
          </div>
        )}
        <p style={{ marginTop: "0.75rem" }}>
          <Link href={t.seeNews.href} className="dv-action-link dv-action-link--accent">{t.seeNews.label}</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

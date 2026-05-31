import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { latestNews, formatDate, SECTOR_LABEL_MAP, SECTOR_SLUG_MAP, type NewsRow } from "@/lib/data";

export const metadata: Metadata = {
  title: "Dividend & Market News",
  description:
    "Latest dividend declarations, increases, cuts and market commentary for income investors — updated hourly and tracked against uncoverd ratings.",
  alternates: { canonical: "/news" },
};

export const dynamic = "force-dynamic";
export const revalidate = 600;

const FILTERS = [
  { slug: "all", label: "All News", filter: null as string | null },
  { slug: "dividend", label: "Dividends", filter: "dividend" },
  { slug: "reit", label: "REITs", filter: "REIT" },
  { slug: "energy", label: "Energy", filter: "energy" },
  { slug: "tech", label: "Tech", filter: "tech" },
  { slug: "earnings", label: "Earnings", filter: "earnings" },
  { slug: "buyback", label: "Buybacks", filter: "buyback" },
  { slug: "fed", label: "Fed & Rates", filter: "Fed" },
];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filterSlug = sp.filter || "all";
  const filterItem = FILTERS.find((i) => i.slug === filterSlug) || FILTERS[0];

  let items: NewsRow[] = [];
  try {
    items = await latestNews(100);
  } catch (e) {
    console.error(e);
  }

  const filtered = filterItem.filter
    ? items.filter(
        (n) =>
          (n.title ?? "").toLowerCase().includes(filterItem.filter!.toLowerCase()) ||
          (n.text ?? "").toLowerCase().includes(filterItem.filter!.toLowerCase()),
      )
    : items;

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="News"
          title="Dividend & Market News"
          description="Stay up to date with dividend declarations, payouts, and market commentary."
        />

        <div className="dv-filters">
          {FILTERS.map((ind) => (
            <Link
              key={ind.slug}
              href={`/news?filter=${ind.slug}`}
              className={`dv-chip ${filterSlug === ind.slug ? "dv-chip--active" : ""}`}
            >
              {ind.label}
            </Link>
          ))}
        </div>

        <h3 className="dv-section-title" style={{ marginTop: "1rem", fontSize: "1.05rem" }}>
          Or browse by sector:
        </h3>
        <div className="dv-filters">
          {Object.entries(SECTOR_SLUG_MAP).map(([slug, name]) => (
            <Link key={slug} href={`/sectors/${slug}`} className="dv-chip">
              {SECTOR_LABEL_MAP[name] || name}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="dv-empty">No news matches this filter right now.</div>
        ) : (
          <div className="dv-news-grid" style={{ marginTop: "1.5rem" }}>
            {filtered.slice(0, 30).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="dv-news-card">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt={n.title} className="dv-news-card__image" />
                )}
                <div className="dv-news-card__body">
                  <h3 className="dv-news-card__title">{n.title}</h3>
                  <p className="dv-news-card__meta">
                    {n.publisher ?? n.site ?? "—"} · {formatDate(n.published_date)}
                  </p>
                  {n.text && <p className="dv-news-card__excerpt">{n.text.slice(0, 150)}…</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

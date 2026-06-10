import type { ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import {
  articleJsonLd,
  breadcrumbList,
  faqJsonLd,
  jsonLdScript,
} from "@/lib/structured-data";
import { HTML_LANG, localePrefix, localizedUrl, type Locale } from "@/lib/i18n";
import { BLOG_STRINGS, formatPostDate } from "@/components/blog/blog-strings";
import { ReadingProgress } from "@/components/blog/progress-bar";
import { pexelsImage } from "@/lib/seo";
import { getStock } from "@/lib/data";
import { SECTORS } from "@/lib/i18n-taxonomy";
import { cachedGetStockRatings } from "@/lib/cached-data";
import type { StockRating, StockRow } from "@/lib/types";
import type { Post } from "@/lib/content";

// Long-form helpers (card 15): heading anchors + table of contents + lazy imgs.
// All server-rendered — jump links are native #anchors, no client JS.
function slugify(text: string): string {
  return text
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return nodeText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

// Pull H2 headings out of the markdown for the table of contents.
function extractH2s(md: string): { text: string; slug: string }[] {
  const out: { text: string; slug: string }[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^##\s+(.+?)\s*#*$/.exec(line);
    if (m) {
      const text = m[1].replace(/[*_`]/g, "").trim();
      if (text) out.push({ text, slug: slugify(text) });
    }
  }
  return out;
}

const TOC_LABEL: Record<Locale, string> = { en: "On this page", fr: "Sur cette page", de: "Auf dieser Seite", it: "In questa pagina", es: "En esta página" };
const BACK_TOP_LABEL: Record<Locale, string> = { en: "↑ Back to top", fr: "↑ Haut de page", de: "↑ Nach oben", it: "↑ Torna su", es: "↑ Volver arriba" };
// The rail card is LIVE (today's rating) while article text is frozen at
// publication — label it so the difference reads as a feature, not a bug.
const LIVE_LABEL: Record<Locale, string> = { en: "Live rating", fr: "Note en direct", de: "Live-Bewertung", it: "Valutazione live", es: "Calificación en vivo" };

const MD_COMPONENTS: Components = {
  h2: ({ children }) => <h2 id={slugify(nodeText(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(nodeText(children))}>{children}</h3>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />
  ),
  // External links open in a new tab with rel="noopener noreferrer" (SEO/security);
  // internal links (/path) render normally so they stay same-tab + crawlable.
  a: ({ href, children }) => {
    const url = typeof href === "string" ? href : "";
    return /^https?:\/\//.test(url) ? (
      <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>
    ) : (
      <a href={url}>{children}</a>
    );
  },
};

// Split the markdown at H2 boundaries so promo banners can be injected
// BETWEEN sections (each chunk renders through its own ReactMarkdown).
function splitAtH2(md: string): string[] {
  const lines = md.split("\n");
  const chunks: string[] = [];
  let cur: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (!inFence && /^##\s+/.test(line) && cur.length) {
      chunks.push(cur.join("\n"));
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) chunks.push(cur.join("\n"));
  return chunks;
}

// Which tools this article should market, in order — aligned with the story.
// Posts about a stock going DOWN sell risk control (Healthcheck); posts about
// a stock going UP sell the top-rated list; everything else gets the mix.
type ToolKey = "healthcheck" | "alternatives" | "compare" | "best";
function toolsForPost(slug: string, hasTicker: boolean): ToolKey[] {
  const s = slug.toLowerCase();
  const down = /(drop|selloff|sell-off|plunge|crash|fall|kurssturz|absturz|chute|caida|caída|calo|crollo)/.test(s);
  const up = /(surge|jump|buyout|rebound|rally|kurssprung|erholung|hausse|envolee|envolée|rebond|subida|rebote|balzo|rialzo|rimbalzo)/.test(s);
  if (down) return hasTicker ? ["healthcheck", "alternatives", "compare"] : ["healthcheck", "best", "alternatives"];
  if (up) return hasTicker ? ["best", "compare", "healthcheck"] : ["best", "healthcheck", "alternatives"];
  return ["best", "healthcheck", "alternatives"];
}

const PILLARS: { key: keyof Pick<StockRating, "value_score" | "growth_score" | "profit_score" | "momentum_score" | "health_score">; label: Record<Locale, string> }[] = [
  { key: "value_score", label: { en: "Value", fr: "Valorisation", de: "Bewertung", it: "Valutazione", es: "Valoración" } },
  { key: "growth_score", label: { en: "Growth", fr: "Croissance", de: "Wachstum", it: "Crescita", es: "Crecimiento" } },
  { key: "profit_score", label: { en: "Profitability", fr: "Rentabilité", de: "Profitabilität", it: "Redditività", es: "Rentabilidad" } },
  { key: "health_score", label: { en: "Health", fr: "Santé financière", de: "Finanzkraft", it: "Salute finanziaria", es: "Salud financiera" } },
  { key: "momentum_score", label: { en: "Momentum", fr: "Momentum", de: "Momentum", it: "Momentum", es: "Momentum" } },
];

export async function BlogPostView({ post, locale }: { post: Post; locale: Locale }) {
  const t = BLOG_STRINGS[locale];
  const prefix = localePrefix(locale);
  const url = localizedUrl(locale, `/blog/${post.meta.slug}`);

  // Live rating + quote for the conversion rail (ticker-tagged posts only).
  const ticker = post.meta.ticker;
  let rating: StockRating | null = null;
  let quote: StockRow | null = null;
  if (ticker) {
    try {
      const [ratings, stock] = await Promise.all([
        cachedGetStockRatings([ticker]),
        getStock(ticker),
      ]);
      rating = ratings.get(ticker) ?? null;
      quote = stock;
    } catch { /* rail degrades gracefully */ }
  }

  const article = articleJsonLd({
    url,
    title: post.meta.title,
    description: post.meta.description,
    datePublished: post.meta.date,
    dateModified: post.meta.updated,
    inLanguage: HTML_LANG[locale],
  });
  const faq = post.meta.faqs && post.meta.faqs.length > 0 ? faqJsonLd(post.meta.faqs) : null;
  const crumbs = breadcrumbList([
    { name: t.home, url: localizedUrl(locale, "/") },
    { name: t.blogTitle, url: `${url.replace(`/blog/${post.meta.slug}`, "/blog")}` },
    { name: post.meta.title, url },
  ]);
  const dateLine = post.meta.updated
    ? `${t.updated} ${formatPostDate(post.meta.updated, locale)}`
    : `${t.published} ${formatPostDate(post.meta.date, locale)}`;
  const h2s = extractH2s(post.body);
  const showToc = h2s.length >= 3;

  const tools = toolsForPost(post.meta.slug, !!ticker);
  const TOOL_LINKS: Record<ToolKey, { href: string; label: string; note: string }> = {
    healthcheck: { href: "/tools/portfolio-healthcheck", label: t.toolHealthcheck, note: t.toolHealthcheckNote },
    alternatives: { href: "/alternatives", label: t.toolAlternatives, note: t.toolAlternativesNote },
    compare: { href: ticker ? `/compare?a=${ticker}` : "/compare", label: t.toolCompare, note: t.toolCompareNote },
    best: { href: "/best-stocks", label: t.toolBest, note: t.toolBestNote },
  };

  const grade = rating?.composite_grade ?? null;
  const price = quote?.price ?? null;
  const change = quote?.change_percent ?? null;

  // Mid-article promo banners: premium LISTS, matched to the stock's sector
  // ("next NVIDIA"-style tech list on a tech post, industrials list on CECO…).
  // Tools only appear on DROP posts (Healthcheck = risk control); everything
  // else markets the rated lists, which are the premium content.
  const slugLower = post.meta.slug.toLowerCase();
  const isDown = /(drop|selloff|sell-off|plunge|crash|fall|kurssturz|absturz|chute|caida|caída|calo|crollo)/.test(slugLower);
  const chunks = splitAtH2(post.body);
  const sectorEntry = quote?.sector ? SECTORS.find((s) => s.db === quote.sector) ?? null : null;
  const sectorLabel = sectorEntry ? sectorEntry.label[locale] : null;
  type Banner = { title: string; bodyTxt: string; cta: string; href: string; badge?: string };
  const sectorBanner: Banner | null = sectorEntry && sectorLabel
    ? {
        title: t.bannerSectorTitle.replace("{sector}", sectorLabel),
        bodyTxt: t.bannerSectorBody.replace("{sector}", sectorLabel),
        cta: t.bannerBestCta,
        href: `/picks/best/${sectorEntry.key}`,
        badge: t.bannerBadge,
      }
    : null;
  const top10Banner: Banner = { title: t.bannerBestTitle, bodyTxt: t.bannerBestBody, cta: t.bannerBestCta, href: "/best-stocks", badge: t.bannerBadge };
  const healthBanner: Banner = { title: t.bannerHealthTitle, bodyTxt: t.bannerHealthBody, cta: t.bannerHealthCta, href: "/tools/portfolio-healthcheck" };
  const banners: Banner[] = isDown
    ? [sectorBanner ?? top10Banner, healthBanner]
    : sectorBanner
      ? [sectorBanner, top10Banner]
      : [top10Banner];
  // Positions: roughly 1/3 and 2/3 through the sections (needs 3+ chunks).
  const bannerAt = new Map<number, number>();
  if (chunks.length >= 3) {
    const p1 = Math.max(1, Math.floor(chunks.length / 3));
    let p2 = Math.max(p1 + 1, Math.floor((2 * chunks.length) / 3));
    if (p2 >= chunks.length) p2 = chunks.length - 1;
    bannerAt.set(p1, 0);
    if (p2 !== p1 && banners.length > 1) bannerAt.set(p2, 1);
  } else if (chunks.length === 2) {
    bannerAt.set(1, 0);
  }

  const ratingCard = ticker && rating && grade ? (
    <div className="dv-ratecard">
      <div className="dv-ratecard__head">
        <span className="dv-ratecard__grade">{grade}</span>
        <div>
          <div className="dv-ratecard__label">
            {t.ratingCardLabel}
            {rating.computed_date && <span className="dv-ratecard__live"> · {LIVE_LABEL[locale]} {formatPostDate(rating.computed_date, locale)}</span>}
          </div>
          <div className="dv-ratecard__tk">
            {ticker}
            {price != null && <span className="dv-ratecard__px">${price.toFixed(2)}</span>}
            {change != null && <span className={change >= 0 ? "dv-up" : "dv-down"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>}
          </div>
        </div>
      </div>
      <div className="dv-ratecard__pillars">
        {PILLARS.map((p) => {
          const v = rating![p.key] ?? 0;
          return (
            <div key={p.key} className="dv-pillar">
              <div className="dv-pillar__row">
                <span>{p.label[locale]}</span>
                <span className={v >= 4 ? "dv-up" : undefined}>{v}/5</span>
              </div>
              <div className="dv-pillar__bars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`dv-pillar__seg ${n <= (v ?? 0) ? (v! >= 4 ? "is-good" : "is-mid") : ""}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="dv-ratecard__locked" aria-hidden="true">
        <span>{t.fairValueLabel}</span>
      </div>
      <Link href="/pricing" className="dv-ratecard__cta">{t.unlockRating}</Link>
    </div>
  ) : (
    // Ticker-less posts (guides, IPO pieces…) still get a premium rail card:
    // the email-gated top-stocks list teaser.
    <div className="dv-ratecard">
      <div className="dv-ratecard__head">
        <span className="dv-ratecard__grade">10</span>
        <div>
          <div className="dv-ratecard__label">{t.putToWork}</div>
          <div className="dv-ratecard__tk">{t.toolBest}</div>
        </div>
      </div>
      <div className="dv-ratecard__ghosts" aria-hidden="true">
        {[92, 90, 87].map((s, i) => (
          <div key={i} className="dv-ratecard__ghost">
            <span className="dv-ratecard__ghostname">████████</span>
            <span className="dv-up">{s}</span>
          </div>
        ))}
      </div>
      <div className="dv-ratecard__locked" aria-hidden="true">
        <span>{t.bannerBestBody}</span>
      </div>
      <Link href="/best-stocks" className="dv-ratecard__cta">{t.bannerBestCta}</Link>
    </div>
  );

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs) }} />
      {faq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} />
      )}
      <ReadingProgress />
      <SiteHeader />
      <main className="dv-page">
        <article id="top">
          <header className="dv-page-header" style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 100%)" }}>
            <p className="dv-eyebrow">
              <Link href={`${prefix}/blog`} className="dv-action-link">
                {t.blogTitle}
              </Link>
            </p>
            <h1>{post.meta.title}</h1>
            <p className="dv-byline">
              {dateLine}
              {ticker && (
                <span className="dv-hero-ticker">
                  {post.meta.exchange ? `${post.meta.exchange}: ` : ""}{ticker}
                  {price != null && ` · $${price.toFixed(2)}`}
                  {change != null && (
                    <span className={change >= 0 ? "dv-up" : "dv-down"}> {change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
                  )}
                </span>
              )}
            </p>
          </header>

          {post.meta.cover && (
            <section className="dv-section">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pexelsImage(post.meta.cover, 1280)}
                alt={post.meta.coverAlt ?? post.meta.title}
                width={1280}
                height={720}
                className="dv-blog-hero"
                fetchPriority="high"
              />
            </section>
          )}

          <div className="dv-blog-grid">
            <div className="dv-blog-main">
              {post.meta.definition && (
                <div className="dv-definition">
                  <span className="dv-definition__label">{t.definitionLabel}</span>
                  <p>{post.meta.definition}</p>
                </div>
              )}

              {post.meta.keyTakeaways && post.meta.keyTakeaways.length > 0 && (
                <div className="dv-takeaways">
                  <h2 className="dv-takeaways__title">{t.keyTakeawaysHeading}</h2>
                  <ul>
                    {post.meta.keyTakeaways.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                  <a href="/best-stocks" className="dv-takeaways__cta">
                    {t.topPickCta}
                  </a>
                </div>
              )}

              {chunks.map((chunk, i) => (
                <div key={i} className="dv-blog-chunk">
                  {bannerAt.has(i) && (() => {
                    const b = banners[bannerAt.get(i)!];
                    if (!b) return null;
                    return (
                      <Link href={b.href} className={`dv-inline-promo${b.badge ? " dv-inline-promo--list" : ""}`}>
                        <span className="dv-inline-promo__text">
                          {b.badge && <span className="dv-inline-promo__badge">{b.badge}</span>}
                          <span className="dv-inline-promo__title">{b.title}</span>
                          <span className="dv-inline-promo__body">{b.bodyTxt}</span>
                        </span>
                        <span className="dv-inline-promo__cta">{b.cta}</span>
                      </Link>
                    );
                  })()}
                  <div className="dv-prose dv-blog-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{chunk}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {/* Inline conversion gate: the deeper rating report is members-only. */}
              {ticker && grade && (
                <div className="dv-locked">
                  <div className="dv-locked__teaser" aria-hidden="true">
                    <h3>{t.lockedTitle} — {ticker}</h3>
                    <p>{t.lockedBody}</p>
                    <p>{t.lockedBody}</p>
                  </div>
                  <div className="dv-locked__overlay">
                    <h3>{t.lockedTitle}</h3>
                    <p>{t.lockedBody}</p>
                    <Link href="/pricing" className="dv-locked__cta">{t.lockedCta}</Link>
                  </div>
                </div>
              )}

              {/* End-of-article conversion block. */}
              <div className="dv-endcta">
                <div className="dv-endcta__kicker">{t.endCtaKicker}</div>
                <h2>{t.endCtaTitle}</h2>
                <p>{t.endCtaBody}</p>
                <div className="dv-endcta__actions">
                  <Link href="/pricing" className="dv-endcta__primary">{t.endCtaBtn}</Link>
                  <Link href="/pricing" className="dv-endcta__secondary">{t.endCtaSecondary}</Link>
                </div>
              </div>

              {post.meta.faqs && post.meta.faqs.length > 0 && (
                <section>
                  <h2 className="dv-section__title">{t.faqHeading}</h2>
                  <div className="dv-faq-list">
                    {post.meta.faqs.map((qa, i) => (
                      <details key={i} className="dv-faq-item">
                        <summary>{qa.q}</summary>
                        <p>{qa.a}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              <p style={{ marginTop: "1.5rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                <Link href={`${prefix}/blog`} className="dv-action-link">
                  {t.backToBlog}
                </Link>
                {showToc && <a href="#top" className="dv-action-link">{BACK_TOP_LABEL[locale]}</a>}
              </p>
            </div>

            {/* Sticky conversion rail */}
            <aside className="dv-blog-rail">
              {ratingCard}
              {showToc && (
                <nav className="dv-rail-card" aria-label={TOC_LABEL[locale]}>
                  <p className="dv-rail-card__title">{TOC_LABEL[locale]}</p>
                  <ul className="dv-rail-toc">
                    {h2s.map((h) => (
                      <li key={h.slug}>
                        <a href={`#${h.slug}`}>{h.text}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <div className="dv-rail-card">
                <p className="dv-rail-card__title">{t.putToWork}</p>
                <div className="dv-rail-tools">
                  {tools.map((k) => (
                    <Link key={k} href={TOOL_LINKS[k].href} className="dv-rail-tool">
                      <span className="dv-rail-tool__label">{TOOL_LINKS[k].label}</span>
                      <span className="dv-rail-tool__note">{TOOL_LINKS[k].note}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </article>
      </main>
      {/* Sticky mobile CTA */}
      <Link href="/pricing" className="dv-mobilecta">{t.mobileCta}</Link>
      <SiteFooter />
    </>
  );
}

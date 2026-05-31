import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { HtmlLang } from "@/components/html-lang";
import { HTML_LANG, localePrefix, type Locale } from "@/lib/i18n";
import { BLOG_STRINGS, formatPostDate } from "@/components/blog/blog-strings";
import { pexelsImage } from "@/lib/seo";
import type { PostMeta } from "@/lib/content";

export function BlogIndexView({ posts, locale }: { posts: PostMeta[]; locale: Locale }) {
  const t = BLOG_STRINGS[locale];
  const prefix = localePrefix(locale);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={t.blogTagline} title={t.blogTitle} description={t.blogDescription} />
        <section className="dv-section">
          {posts.length === 0 ? (
            <div className="dv-empty">—</div>
          ) : (
            <ul className="dv-blog-list">
              {posts.map((p) => (
                <li key={p.slug} className="dv-blog-card">
                  <Link href={`${prefix}/blog/${p.slug}`} className="dv-blog-card__link">
                    {p.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pexelsImage(p.cover, 640)}
                        alt={p.coverAlt ?? p.title}
                        width={640}
                        height={360}
                        loading="lazy"
                        className="dv-blog-card__image"
                      />
                    )}
                    <div className="dv-blog-card__body">
                      <h2 className="dv-blog-card__title">{p.title}</h2>
                      <p className="dv-blog-card__desc">{p.description}</p>
                      <p className="dv-blog-card__date">{formatPostDate(p.updated ?? p.date, locale)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

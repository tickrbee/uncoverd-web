import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { HtmlLang } from "@/components/html-lang";
import { getAllPosts } from "@/lib/content";
import { HTML_LANG, localePrefix, type Locale } from "@/lib/i18n";
import { formatPostDate } from "@/components/blog/blog-strings";

export type LandingLink = { href: string; label: string; desc: string };

// The "homepage" for a localized section (/fr, /de, /it, /es). Gives each
// language a real entry point linking its service pages + blog, so users and
// crawlers can reach the localized content (and a language switcher can land
// somewhere meaningful).
export function LocaleLanding({
  locale,
  title,
  tagline,
  intro,
  links,
  blogLabel,
}: {
  locale: Locale;
  title: string;
  tagline: string;
  intro: string;
  links: LandingLink[];
  blogLabel: string;
}) {
  const prefix = localePrefix(locale);
  const posts = getAllPosts(locale).slice(0, 6);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={tagline} title={title} description={intro} />

        <section className="dv-section">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="dv-blog-card"
                style={{ display: "block", padding: "1.1rem 1.2rem" }}
              >
                <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem" }}>{l.label}</h2>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {l.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {posts.length > 0 && (
          <section className="dv-section">
            <h2 className="dv-section__title">{blogLabel}</h2>
            <ul className="dv-blog-list">
              {posts.map((p) => (
                <li key={p.slug} className="dv-blog-card">
                  <Link href={`${prefix}/blog/${p.slug}`} className="dv-blog-card__link">
                    <div className="dv-blog-card__body">
                      <h3 className="dv-blog-card__title">{p.title}</h3>
                      <p className="dv-blog-card__desc">{p.description}</p>
                      <p className="dv-blog-card__date">{formatPostDate(p.updated ?? p.date, locale)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

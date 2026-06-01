import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { getAllPosts } from "@/lib/content";
import { HTML_LANG, localePrefix, type Locale } from "@/lib/i18n";
import { formatPostDate } from "@/components/blog/blog-strings";

export type LandingLink = { href: string; label: string; desc: string };

// Localized homepage for /fr, /de, /it, /es. Built to read like a home page
// (hero + feature grid + a small latest-articles strip), not a blog index —
// it's the destination when a user switches the site language from the root.
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
  const posts = getAllPosts(locale).slice(0, 3);
  const ctas = links.slice(0, 2);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <section
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 35%, #0a0a0a 100%)" }}
        >
          <p className="dv-eyebrow">{tagline}</p>
          <h1>{title}</h1>
          <p style={{ color: "rgba(255,255,255,0.85)", marginTop: "0.6rem", maxWidth: 640, lineHeight: 1.5 }}>
            {intro}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
            {ctas.map((c, i) => (
              <Link key={c.href} href={c.href} className={i === 0 ? "btn" : "btn btn--ghost"}>
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="dv-section">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="dv-feature-card">
                <h2 className="dv-feature-card__title">
                  {l.label} <span className="dv-feature-card__arrow">→</span>
                </h2>
                <p className="dv-feature-card__desc">{l.desc}</p>
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

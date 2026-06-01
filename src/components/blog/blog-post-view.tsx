import Link from "next/link";
import ReactMarkdown from "react-markdown";
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
import { pexelsImage } from "@/lib/seo";
import type { Post } from "@/lib/content";

export function BlogPostView({ post, locale }: { post: Post; locale: Locale }) {
  const t = BLOG_STRINGS[locale];
  const prefix = localePrefix(locale);
  const url = localizedUrl(locale, `/blog/${post.meta.slug}`);

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

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs) }} />
      {faq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} />
      )}
      <SiteHeader />
      <main className="dv-page">
        <article>
          <header className="dv-page-header" style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 100%)" }}>
            <p className="dv-eyebrow">
              <Link href={`${prefix}/blog`} className="dv-action-link">
                {t.blogTitle}
              </Link>
            </p>
            <h1>{post.meta.title}</h1>
            <p className="dv-byline">{dateLine}</p>
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

          {post.meta.definition && (
            <section className="dv-section">
              <div className="dv-definition">
                <span className="dv-definition__label">{t.definitionLabel}</span>
                <p>{post.meta.definition}</p>
              </div>
            </section>
          )}

          {post.meta.keyTakeaways && post.meta.keyTakeaways.length > 0 && (
            <section className="dv-section">
              <div className="dv-takeaways">
                <h2 className="dv-takeaways__title">{t.keyTakeawaysHeading}</h2>
                <ul>
                  {post.meta.keyTakeaways.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="dv-section">
            <div className="dv-prose dv-blog-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
            </div>
          </section>

          {post.meta.faqs && post.meta.faqs.length > 0 && (
            <section className="dv-section">
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

          <p style={{ marginTop: "1.5rem" }}>
            <Link href={`${prefix}/blog`} className="dv-action-link">
              {t.backToBlog}
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

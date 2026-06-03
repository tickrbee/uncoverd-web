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
import { pexelsImage } from "@/lib/seo";
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
  const h2s = extractH2s(post.body);
  const showToc = h2s.length >= 3;

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
        <article id="top">
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

          {showToc && (
            <section className="dv-section">
              <nav className="dv-toc" aria-label={TOC_LABEL[locale]}>
                <p className="dv-toc__title">{TOC_LABEL[locale]}</p>
                <ul>
                  {h2s.map((h) => (
                    <li key={h.slug}>
                      <a href={`#${h.slug}`}>{h.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            </section>
          )}

          <section className="dv-section">
            <div className="dv-prose dv-blog-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{post.body}</ReactMarkdown>
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

          <p style={{ marginTop: "1.5rem", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <Link href={`${prefix}/blog`} className="dv-action-link">
              {t.backToBlog}
            </Link>
            {showToc && <a href="#top" className="dv-action-link">{BACK_TOP_LABEL[locale]}</a>}
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

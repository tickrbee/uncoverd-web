import type { Metadata } from "next";
import { getAllPosts, getPost, translationsFor } from "@/lib/content";
import { BLOG_STRINGS } from "@/components/blog/blog-strings";
import {
  OG_LOCALE,
  hreflangAlternates,
  localePrefix,
  localizedUrl,
  type Locale,
} from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export function blogIndexMetadata(locale: Locale): Metadata {
  const t = BLOG_STRINGS[locale];
  const path = `${localePrefix(locale)}/blog`;
  // Don't let an empty localized blog index get indexed as a thin page until it
  // has posts.
  const hasPosts = getAllPosts(locale).length > 0;
  return {
    title: t.blogTitle,
    description: metaDescription(t.blogDescription),
    alternates: { canonical: path },
    robots: hasPosts ? undefined : { index: false, follow: true },
    openGraph: {
      title: t.blogTitle,
      description: t.blogDescription,
      type: "website",
      url: localizedUrl(locale, "/blog"),
      locale: OG_LOCALE[locale],
    },
  };
}

export function blogPostMetadata(locale: Locale, slug: string): Metadata {
  const post = getPost(locale, slug);
  if (!post) return {};
  const translations = translationsFor(post.meta);
  const langEntries = Object.fromEntries(
    Object.entries(translations).map(([loc, s]) => [loc, `/blog/${s}`]),
  ) as Partial<Record<Locale, string>>;

  return {
    title: post.meta.title,
    description: metaDescription(post.meta.description),
    keywords: post.meta.keywords,
    alternates: {
      canonical: `${localePrefix(locale)}/blog/${slug}`,
      // Only emit hreflang when the post actually has translations.
      languages:
        Object.keys(langEntries).length > 1 ? hreflangAlternates(langEntries) : undefined,
    },
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      type: "article",
      url: localizedUrl(locale, `/blog/${slug}`),
      locale: OG_LOCALE[locale],
      publishedTime: post.meta.date,
      modifiedTime: post.meta.updated ?? post.meta.date,
      images: post.meta.cover ? [pexelsImage(post.meta.cover, 1200)] : undefined,
    },
  };
}

import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ALL_LOCALES, type Locale } from "@/lib/i18n";

// File-based blog content. Posts live in content/blog/<locale>/<slug>.md with
// YAML frontmatter. Markdown (not MDX) keeps authoring simple and dependency
// light while still rendering rich prose, tables and links server-side.

export type Faq = { q: string; a: string };

export type PostMeta = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  date: string; // ISO
  updated?: string; // ISO
  keywords?: string[];
  // Groups the same article across languages so we can emit hreflang links.
  translationKey?: string;
  faqs?: Faq[];
  // Hero/cover image (Pexels). `cover` is the base image URL; the view appends
  // Pexels' compression/size params so we don't ship a multi-MB original.
  cover?: string;
  coverAlt?: string;
  // Editorial (Investopedia-style) elements rendered as styled boxes/byline.
  author?: string;
  reviewedBy?: string;
  factCheckedBy?: string;
  definition?: string; // short "Definition" callout near the top
  keyTakeaways?: string[]; // "Key takeaways" box
};

export type Post = { meta: PostMeta; body: string };

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function localeDir(locale: Locale): string {
  return path.join(BLOG_DIR, locale);
}

export function getPostSlugs(locale: Locale): string[] {
  const dir = localeDir(locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getPost(locale: Locale, slug: string): Post | null {
  const file = path.join(localeDir(locale), `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const meta: PostMeta = {
    slug,
    locale,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? "1970-01-01"),
    updated: data.updated ? String(data.updated) : undefined,
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : undefined,
    translationKey: data.translationKey ? String(data.translationKey) : undefined,
    faqs: Array.isArray(data.faqs)
      ? (data.faqs as { q: unknown; a: unknown }[]).map((f) => ({
          q: String(f.q),
          a: String(f.a),
        }))
      : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    coverAlt: data.coverAlt ? String(data.coverAlt) : undefined,
    author: data.author ? String(data.author) : undefined,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
    factCheckedBy: data.factCheckedBy ? String(data.factCheckedBy) : undefined,
    definition: data.definition ? String(data.definition) : undefined,
    keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways.map(String) : undefined,
  };
  return { meta, body: content };
}

export function getAllPosts(locale: Locale): PostMeta[] {
  return getPostSlugs(locale)
    .map((slug) => getPost(locale, slug)?.meta)
    .filter((m): m is PostMeta => m != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Every post across every locale — used by the sitemap. */
export function getAllPostsEverywhere(): PostMeta[] {
  return ALL_LOCALES.flatMap((loc) => getAllPosts(loc));
}

/**
 * For a given post, find its translations in other locales (same
 * translationKey) so the page can emit hreflang alternates.
 * Returns a locale→slug map including the post's own locale.
 */
export function translationsFor(meta: PostMeta): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = { [meta.locale]: meta.slug };
  if (!meta.translationKey) return out;
  for (const loc of ALL_LOCALES) {
    if (loc === meta.locale) continue;
    for (const slug of getPostSlugs(loc)) {
      const p = getPost(loc, slug);
      if (p?.meta.translationKey === meta.translationKey) {
        out[loc] = slug;
        break;
      }
    }
  }
  return out;
}

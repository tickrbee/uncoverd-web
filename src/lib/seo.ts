// Centralised SEO helpers. Keeps title/description lengths inside the ranges
// Google (and the Ahrefs audit) expect, and gives every page a self-referential
// canonical + a default Open Graph image.
//
// Why this exists: the audit flagged ~3.8k titles >60 chars, ~7.8k meta
// descriptions >155 chars, and ~67k pages with an incomplete Open Graph card
// (missing og:image). Almost all of those are the two ticker templates, so the
// fix is to route every generated title/description through these clamps.

export const SITE_URL = "https://uncoverd.org";

// Google truncates titles around 60 chars and descriptions around 155–160.
// We aim slightly under so the "…" we append doesn't push us over.
const TITLE_MAX = 60;
const DESC_MAX = 155;
const DESC_MIN = 70;

/**
 * Truncate at a word boundary and append an ellipsis. Never returns a string
 * longer than `max` (the ellipsis is counted).
 */
export function clamp(text: string, max: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  // Only break on a space if it leaves a reasonable amount of text, otherwise
  // hard-cut (handles single very long tokens).
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.trimEnd() + "…";
}

/**
 * Pick the first candidate title that fits inside `TITLE_MAX`; if none fit,
 * clamp the last (shortest) candidate. Order candidates richest → shortest.
 */
export function pickTitle(candidates: string[]): string {
  for (const c of candidates) {
    const t = c.replace(/\s+/g, " ").trim();
    if (t.length > 0 && t.length <= TITLE_MAX) return t;
  }
  return clamp(candidates[candidates.length - 1] ?? "", TITLE_MAX);
}

/** Clamp a meta description to the recommended max length. */
export function metaDescription(text: string): string {
  return clamp(text, DESC_MAX);
}

/** Whether a description is in the healthy 70–155 char window (for warnings). */
export function isDescriptionHealthy(text: string): boolean {
  const n = text.trim().length;
  return n >= DESC_MIN && n <= DESC_MAX;
}

/**
 * Append Pexels' on-the-fly compression + resize params to a base image URL so
 * we serve a right-sized, compressed JPEG instead of the multi-MB original
 * (addresses the "compressed / width-height / responsive image" SEO checks).
 */
export function pexelsImage(base: string, width = 1200): string {
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}auto=compress&cs=tinysrgb&fit=crop&w=${width}`;
}

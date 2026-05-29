// Reddit post -> "is this a leverage point for @uncoverd?" classifier.
//
// Three match reasons, in priority order — the strongest wins:
//   1. brand-mention       — title or body mentions uncoverd / uncoverd.org
//   2. competitor-mention  — names a known competitor (Dividend.com,
//                            Seeking Alpha, Simply Safe Dividends, etc.)
//   3. high-engagement-question — dividend-topic post with real traction
//                            we could plausibly answer with data
//
// Each lever is different:
//   - brand-mention: highest priority. Reply directly, thank for the
//     mention, offer to help if there's a question.
//   - competitor-mention: positioning opportunity. Comment with a data
//     point or comparison we can support. Do NOT trash competitors.
//   - high-engagement-question: leverage by being useful. Pull data from
//     uncoverd, cite the source.

import type { RedditListingItem } from "./client";

export type MatchResult = {
  reason: "brand-mention" | "competitor-mention" | "high-engagement-question";
  terms: string[];
};

const BRAND_PATTERNS = [
  /\buncoverd\b/i,
  /\buncoverd\.org\b/i,
];

const COMPETITOR_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "dividend.com", pattern: /\bdividend\.com\b/i },
  { name: "Seeking Alpha", pattern: /\bseeking\s*alpha\b/i },
  { name: "Simply Safe Dividends", pattern: /\bsimply\s*safe\s*dividends\b/i },
  { name: "Suredividend", pattern: /\bsure\s*dividend\b/i },
  { name: "Dividend Kings", pattern: /\bdividend\s*kings\b/i },
  { name: "Wisesheets", pattern: /\bwisesheets\b/i },
];

// Topic terms that signal a dividend-research question we could plausibly
// answer with data. Used in conjunction with engagement thresholds.
const TOPIC_TERMS = [
  /\bdividend\b/i,
  /\bex-?div(idend)?\b/i,
  /\bpayout\s*ratio\b/i,
  /\baristocrat/i,
  /\bdividend\s*king/i,
  /\bdividend\s*growth\b/i,
  /\b(SCHD|VYM|DGRO|VIG|HDV|DIVO|JEPI|JEPQ|SPYD|NOBL|SDY)\b/,
  /\b(reit|REIT|bdc|BDC|mlp|MLP)\b/,
  /\byield(?:\s*on\s*cost)?\b/i,
  /\bcovered\s*call\b/i,
];

// "High-engagement" thresholds. New posts (< 12h old) need lower scores
// because they haven't had time to accumulate; older posts with low
// engagement aren't worth chasing.
function isHighEngagement(post: RedditListingItem): boolean {
  const ageHours = (Date.now() / 1000 - post.created_utc) / 3600;
  if (ageHours < 0 || ageHours > 96) return false; // too old → reply will be buried
  // Fresh: low bar. The point is to get in early.
  if (ageHours <= 12) return post.score >= 5 || post.num_comments >= 3;
  // Day-old: needs proven traction.
  if (ageHours <= 36) return post.score >= 25 || post.num_comments >= 10;
  // Couple days old: only strongly upvoted threads.
  return post.score >= 75 || post.num_comments >= 30;
}

export function classifyPost(post: RedditListingItem): MatchResult | null {
  // Skip noise.
  if (post.stickied) return null;
  if (post.over_18) return null;
  if (post.author === "[deleted]") return null;

  const hay = `${post.title}\n${post.selftext ?? ""}`;

  // 1) Brand mention
  const brandHits: string[] = [];
  for (const p of BRAND_PATTERNS) {
    const m = hay.match(p);
    if (m) brandHits.push(m[0]);
  }
  if (brandHits.length > 0) {
    return { reason: "brand-mention", terms: Array.from(new Set(brandHits)) };
  }

  // 2) Competitor mention
  const compHits: string[] = [];
  for (const c of COMPETITOR_PATTERNS) {
    if (c.pattern.test(hay)) compHits.push(c.name);
  }
  if (compHits.length > 0) {
    return { reason: "competitor-mention", terms: compHits };
  }

  // 3) High-engagement dividend question
  const topicHits: string[] = [];
  for (const t of TOPIC_TERMS) {
    const m = hay.match(t);
    if (m) topicHits.push(m[0]);
  }
  if (topicHits.length > 0 && isHighEngagement(post)) {
    return {
      reason: "high-engagement-question",
      terms: Array.from(new Set(topicHits)),
    };
  }

  return null;
}

// Truncate body for inbox preview (Reddit selftext can be very long).
export function selftextPreview(text: string, max = 500): string {
  if (!text) return "";
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, max)).trim() + "…";
}

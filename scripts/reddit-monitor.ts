#!/usr/bin/env tsx
// Standalone Reddit monitor — runs directly in GitHub Actions (no Vercel
// endpoint involved). Polls the curated subreddits, classifies posts,
// upserts hits into public.reddit_opportunities, and emails a digest of
// what's new via Resend.
//
// All credentials come from the process environment, set as GitHub
// repo secrets in the calling workflow:
//
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY            (omit -> email send skipped, polling still runs)
//   DIGEST_EMAIL_TO           (omit -> email send skipped)
//   DIGEST_EMAIL_FROM         (optional, defaults to onboarding@resend.dev)
//   INBOX_URL                 (optional, defaults to https://uncoverd.org/admin/inbox)
//
// Exit code 0 on success even if no new rows; non-zero only on hard
// errors so the GitHub Actions tab shows a green check on quiet days.

import { createClient } from "@supabase/supabase-js";
import { fetchSubredditListing } from "../src/lib/reddit/client";
import { classifyPost, selftextPreview } from "../src/lib/reddit/filter";
import { sendRedditDigest, type DigestRow } from "../src/lib/email/reddit-digest";

const SUBREDDITS = [
  "dividends",
  "DividendInvesting",
  "investing",
  "stocks",
  "SecurityAnalysis",
  "StockMarket",
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in environment`);
  return v;
}

async function main(): Promise<void> {
  const sb = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" } as { schema: "public" },
    },
  );

  const summary: Record<string, { fetched: number; matched: number; inserted: number; error?: string }> = {};
  let totalInserted = 0;

  for (const subreddit of SUBREDDITS) {
    try {
      const posts = await fetchSubredditListing(subreddit, "new", 50);
      const matched = posts
        .map((p) => ({ post: p, match: classifyPost(p) }))
        .filter((x): x is { post: typeof posts[0]; match: NonNullable<ReturnType<typeof classifyPost>> } => x.match !== null);

      if (matched.length === 0) {
        summary[subreddit] = { fetched: posts.length, matched: 0, inserted: 0 };
        continue;
      }

      const rows = matched.map(({ post, match }) => ({
        subreddit: post.subreddit,
        reddit_post_id: post.id,
        title: post.title,
        author: post.author,
        permalink: post.permalink,
        score: post.score,
        num_comments: post.num_comments,
        selftext_preview: selftextPreview(post.selftext),
        match_reason: match.reason,
        match_terms: match.terms,
      }));

      const { error, count } = await sb
        .from("reddit_opportunities")
        .upsert(rows, { onConflict: "reddit_post_id", ignoreDuplicates: true, count: "exact" });

      if (error) {
        summary[subreddit] = { fetched: posts.length, matched: matched.length, inserted: 0, error: error.message };
        continue;
      }
      const inserted = count ?? 0;
      totalInserted += inserted;
      summary[subreddit] = { fetched: posts.length, matched: matched.length, inserted };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      summary[subreddit] = { fetched: 0, matched: 0, inserted: 0, error: msg };
    }
  }

  // Pull fresh rows for the digest (only when we actually inserted any).
  let digestResult:
    | { skipped: true; reason: string }
    | { skipped: false; messageId: string | null }
    | { error: string } = { skipped: true, reason: "no inserts" };
  if (totalInserted > 0) {
    try {
      const { data: newRows } = await sb
        .from("reddit_opportunities")
        .select("id,detected_at,subreddit,title,author,permalink,score,num_comments,selftext_preview,match_reason,match_terms")
        .gte("detected_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order("detected_at", { ascending: false })
        .limit(totalInserted * 2);
      const digest = (newRows as DigestRow[] | null) ?? [];
      const inboxUrl = process.env.INBOX_URL ?? "https://uncoverd.org/admin/inbox";
      digestResult = await sendRedditDigest(digest, { inboxUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      digestResult = { error: msg };
    }
  }

  // One-line JSON summary so the GitHub Actions log is easy to scan.
  console.log(JSON.stringify({ ok: true, total_inserted: totalInserted, subreddits: summary, digest: digestResult }, null, 2));
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`reddit-monitor error: ${msg}`);
  process.exit(1);
});

import { NextRequest, NextResponse } from "next/server";
import { fetchSubredditListing } from "@/lib/reddit/client";
import { classifyPost, selftextPreview } from "@/lib/reddit/filter";
import { getBackendClient } from "@/lib/supabase/admin";

// Reddit monitor cron. Polls a curated list of dividend-adjacent
// subreddits, classifies each new post against the brand/competitor/
// engagement filters, and writes hits to reddit_opportunities for the
// operator to review at /admin/inbox.
//
// Read-only on Reddit's side; we never reply automatically. The point
// is to surface leverage, not to spam.
//
// Auth: Authorization: Bearer ${CRON_SECRET}. Vercel cron sends this
// header automatically when CRON_SECRET is set as an env var.

export const runtime = "nodejs";
// Allow up to 60s — polling 5–10 subreddits sequentially with a 15s
// per-call timeout fits with margin.
export const maxDuration = 60;

const SUBREDDITS = [
  "dividends",
  "DividendInvesting",
  "investing",
  "stocks",
  "SecurityAnalysis",
  "StockMarket",
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Cron auth. Vercel cron passes the secret in Authorization; manual
  // triggers can pass ?secret=... for convenience while testing.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const header = req.headers.get("authorization");
    const fromHeader = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const fromQuery = new URL(req.url).searchParams.get("secret");
    if (fromHeader !== expected && fromQuery !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const sb = getBackendClient();
  // Track per-subreddit counts so the response gives the operator a
  // quick summary they can scan in the Vercel logs.
  const summary: Record<string, { fetched: number; matched: number; inserted: number; errors?: string }> = {};
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

      // Bulk insert with ON CONFLICT (reddit_post_id) DO NOTHING via
      // upsert. We use upsert with ignoreDuplicates=true so re-polls
      // don't churn the table.
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

      // Supabase JS returns inserted rows only when we use returning='*';
      // for count of newly-inserted (vs ignored-as-duplicate) we issue
      // the upsert and then check status via the table.
      const { error, count } = await sb
        .schema("public")
        .from("reddit_opportunities")
        .upsert(rows, { onConflict: "reddit_post_id", ignoreDuplicates: true, count: "exact" });

      if (error) {
        summary[subreddit] = { fetched: posts.length, matched: matched.length, inserted: 0, errors: error.message };
        continue;
      }
      const inserted = count ?? 0;
      totalInserted += inserted;
      summary[subreddit] = { fetched: posts.length, matched: matched.length, inserted };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      summary[subreddit] = { fetched: 0, matched: 0, inserted: 0, errors: msg };
    }
  }

  return NextResponse.json(
    { ok: true, total_inserted: totalInserted, subreddits: summary },
    { status: 200 },
  );
}

// Reddit fetcher with OAuth support. Reddit blocks datacenter IPs
// (GitHub Actions, AWS, Vercel runtimes) on the anonymous JSON endpoint
// with 403, so any cloud cron MUST use OAuth.
//
// Two modes:
//   - Authenticated (REDDIT_CLIENT_ID set): goes through oauth.reddit.com
//     using the script-app password grant. 100 req/min quota.
//   - Anonymous (no creds): hits www.reddit.com/r/X/new.json. Works from
//     residential IPs (local dev); fails 403 from datacenter IPs.
//
// User-Agent matters either way. Reddit aggressively 429s generic agents.

const USER_AGENT =
  "uncoverd-monitor/1.0 (https://uncoverd.org; +ops@uncoverd.org)";

// In-memory token cache. The script is a one-shot in CI so this only
// matters when the same process polls multiple subreddits in sequence.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getOAuthToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  if (!clientId || !clientSecret || !username || !password) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Reddit OAuth token fetch -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export type RedditListingItem = {
  id: string;            // id36, e.g. "1abcdef"
  subreddit: string;
  title: string;
  author: string;
  permalink: string;     // "/r/dividends/comments/1abcdef/some_slug/"
  url: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  link_flair_text: string | null;
  over_18: boolean;
  stickied: boolean;
};

type RedditApiChild = {
  kind: "t3";
  data: {
    id: string;
    subreddit: string;
    title: string;
    author: string;
    permalink: string;
    url: string;
    selftext: string;
    score: number;
    num_comments: number;
    created_utc: number;
    link_flair_text: string | null;
    over_18: boolean;
    stickied: boolean;
  };
};

type RedditApiResponse = {
  data: {
    children: RedditApiChild[];
  };
};

// Fetch the newest posts in a subreddit. `sort` can be "new" (chronological)
// or "hot" (Reddit's engagement-weighted feed). For monitoring we want "new"
// — we surface things as they appear, not after they've already peaked.
export async function fetchSubredditListing(
  subreddit: string,
  sort: "new" | "hot" | "rising" = "new",
  limit = 25,
): Promise<RedditListingItem[]> {
  const safeSub = encodeURIComponent(subreddit);
  const token = await getOAuthToken();

  // Authenticated path uses oauth.reddit.com — this is the only path that
  // works from datacenter IPs (GitHub Actions etc).
  const base = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const url = `${base}/r/${safeSub}/${sort}.json?limit=${limit}&raw_json=1`;
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Reddit /r/${subreddit}/${sort}.json -> HTTP ${res.status}`);
  }
  const body = (await res.json()) as RedditApiResponse;
  return (body.data?.children ?? []).map((c) => ({
    id: c.data.id,
    subreddit: c.data.subreddit,
    title: c.data.title,
    author: c.data.author,
    permalink: `https://www.reddit.com${c.data.permalink}`,
    url: c.data.url,
    selftext: c.data.selftext ?? "",
    score: c.data.score,
    num_comments: c.data.num_comments,
    created_utc: c.data.created_utc,
    link_flair_text: c.data.link_flair_text,
    over_18: c.data.over_18,
    stickied: c.data.stickied,
  }));
}

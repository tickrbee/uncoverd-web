// Reddit public JSON fetcher. No OAuth — appending `.json` to any
// subreddit URL returns the post listing as JSON, which is what their
// public web UI uses internally. Rate-limited at ~60 req/min for
// anonymous clients; we stay well under by polling once per cron tick.
//
// The user-agent matters: Reddit aggressively 429s generic agents like
// "node-fetch/1.0". Always send a descriptive UA naming the operator.

const USER_AGENT =
  "uncoverd-monitor/1.0 (https://uncoverd.org; +ops@uncoverd.org)";

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
// or "hot" (Reddit's engagement-weighted feed). For monitoring we mostly
// want "new" — we surface things as they appear, not after they've already
// peaked.
export async function fetchSubredditListing(
  subreddit: string,
  sort: "new" | "hot" | "rising" = "new",
  limit = 25,
): Promise<RedditListingItem[]> {
  const safeSub = encodeURIComponent(subreddit);
  const url = `https://www.reddit.com/r/${safeSub}/${sort}.json?limit=${limit}&raw_json=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    // Reddit will sometimes 503 on edge nodes; the monitor cron retries
    // tomorrow rather than hammering, so a single failure is fine.
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

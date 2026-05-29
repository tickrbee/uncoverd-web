-- posted_tweets: append-only log of every tweet the X publishing routines
-- produce. Routines query this for dedup ("don't feature AAPL again within
-- 30 days") and the analytics aggregator reads from it weekly.
--
-- Inserted by routines via the service-role key. Never updated.

create table if not exists public.posted_tweets (
  id              bigserial primary key,
  posted_at       timestamptz not null default now(),
  -- Flow that produced the tweet: featured-stock, featured-etf,
  -- ex-div-watch, payout-change, weekly-hikes, weekly-cuts,
  -- company-dive, potential-payers, etf-dive, reply-to-mention.
  flow            text not null,
  -- Primary subject (when applicable): a ticker symbol for stock/ETF flows,
  -- null for mixed-content threads.
  symbol          text,
  -- For reply-to-mentions: the source tweet we replied to. Used to ensure we
  -- never reply twice to the same root tweet.
  source_tweet_id text,
  -- X's returned tweet id (or the first tweet id of a thread).
  tweet_id        text not null,
  -- Full posted text. For threads, comma-separated tweet ids appear in
  -- thread_tweet_ids; this column holds the head tweet's body.
  body            text not null,
  -- For threads: ordered list of tweet ids (head first).
  thread_tweet_ids text[],
  -- Engagement snapshot, populated by the analytics aggregator routine on a
  -- weekly cadence. NULL until first read.
  impressions     integer,
  likes           integer,
  replies         integer,
  reposts         integer,
  bookmarks       integer,
  metrics_synced_at timestamptz
);

-- Most routine queries are "has this symbol been featured in flow X within
-- the last N days?" — a (flow, symbol, posted_at desc) index serves that.
create index if not exists posted_tweets_flow_symbol_posted_at_idx
  on public.posted_tweets (flow, symbol, posted_at desc)
  where symbol is not null;

-- Reply-to-mention dedup lookup by source tweet id.
create index if not exists posted_tweets_source_tweet_id_idx
  on public.posted_tweets (source_tweet_id)
  where source_tweet_id is not null;

-- Analytics aggregator scans rows that haven't been synced yet, or are due
-- for re-sync (older rows still get updates as engagement accrues).
create index if not exists posted_tweets_metrics_sync_idx
  on public.posted_tweets (metrics_synced_at nulls first, posted_at desc);

-- RLS off — this table is only ever written by routines using the service
-- role key, and only ever read by the analytics aggregator (also service
-- role). No public access required.
alter table public.posted_tweets enable row level security;

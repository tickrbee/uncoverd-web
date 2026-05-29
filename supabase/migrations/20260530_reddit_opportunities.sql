-- reddit_opportunities: posts surfaced from r/dividends-and-friends that
-- look like leverage points — a question we can answer (citing uncoverd
-- as the source), a competitor mention, or a brand mention. The cron
-- writer fills this; the operator (/admin/inbox) marks rows actioned/
-- dismissed.
--
-- Never auto-replies. Reddit's per-subreddit self-promo rules (often
-- 1:10 organic-to-self-promo ratio) make automated posting a fast ban
-- path. We just point the operator at the lever.

create table if not exists public.reddit_opportunities (
  id              bigserial primary key,
  detected_at     timestamptz not null default now(),
  -- Subreddit without the r/ prefix ("dividends", not "r/dividends").
  subreddit       text not null,
  -- Reddit's id36 — primary dedup key. Cron uses ON CONFLICT DO NOTHING
  -- to keep re-polls cheap.
  reddit_post_id  text not null unique,
  title           text not null,
  author          text,
  permalink       text not null,
  -- Engagement at detection time (these grow after we see the post; we
  -- snapshot once and don't update).
  score           integer,
  num_comments    integer,
  selftext_preview text,
  -- Why we surfaced it: 'brand-mention', 'competitor-mention',
  -- 'high-engagement-question', 'rising-thread'.
  match_reason    text not null,
  match_terms     text[],
  -- Operator workflow state.
  status          text not null default 'new'
                  check (status in ('new', 'seen', 'actioned', 'dismissed')),
  notes           text,
  actioned_at     timestamptz,
  -- Optional AI-drafted reply we surface to the operator. They review
  -- and send (or not). Never auto-posted to Reddit.
  ai_draft_reply  text
);

create index if not exists reddit_opp_status_detected_idx
  on public.reddit_opportunities (status, detected_at desc);

create index if not exists reddit_opp_subreddit_detected_idx
  on public.reddit_opportunities (subreddit, detected_at desc);

-- Service-role only. The /admin/inbox page reads/writes through the
-- service client. No anon access required.
alter table public.reddit_opportunities enable row level security;

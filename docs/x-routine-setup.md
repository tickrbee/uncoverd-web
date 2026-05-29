# @uncoverd X Routine — Operator Setup

One-time setup steps to wire the X publishing routines to the live
`@uncoverd` account. Do these in order.

---

## 1. X Developer Account + API credentials

1. Sign in to [developer.x.com](https://developer.x.com) with the
   `@uncoverd` X account (not a personal one — keys are scoped to the
   signed-in account).
2. Apply for Free tier developer access. Auto-approves in minutes.
3. Create a Project, then create an App inside it.
4. In the App's **"User authentication settings"**:
   - App permissions: **Read and write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URI: `https://uncoverd.org/api/x/oauth-callback`
     (placeholder — not actually used since we use OAuth 1.0a with
     access tokens generated in the console)
   - Website URL: `https://uncoverd.org`
5. Go to **"Keys and tokens"** tab. Generate and save:
   - **API Key** (Consumer Key)
   - **API Secret** (Consumer Secret)
   - **Access Token** (acts as `@uncoverd`)
   - **Access Token Secret**

These four values are the routines' authentication. Treat as secrets.

**Free tier note:** 1,500 posts/month write limit. The full publishing
schedule produces ~250–300 posts/month, comfortably under. **No read
access on Free tier** — the `reply-to-mention` flow needs Basic tier
($200/mo) and is deferred to Phase 2.

---

## 2. Apply the Supabase migration

```bash
# From the repo root, with Supabase CLI installed and linked:
supabase db push
```

Or apply manually in Supabase Studio → SQL Editor by pasting
`supabase/migrations/20260529_posted_tweets.sql`.

Verify the table exists:
```sql
select count(*) from posted_tweets;
-- should return 0 rows, no error
```

---

## 3. Create the routines

Go to [claude.ai/code/routines](https://claude.ai/code/routines).

For each routine below, create a new routine with the listed settings.

### Repo

All routines: connect repo `tickrbee/uncoverd-web`. The routine needs
read access to `docs/x-style-guide.md`, `docs/x-post-types.md`, and
`src/lib/data.ts` (for understanding the data shape).

### Allowed network domains

Add to each routine's allowlist:
- `api.x.com` (X API v2)
- `upload.twitter.com` (media uploads — not used now, but harmless)
- `<your-supabase-project>.supabase.co` (data queries)

### Secrets

Set as routine secrets (NOT in repo):

| Secret name             | Value                                     |
|-------------------------|-------------------------------------------|
| `X_API_KEY`             | from step 1                               |
| `X_API_SECRET`          | from step 1                               |
| `X_ACCESS_TOKEN`        | from step 1                               |
| `X_ACCESS_SECRET`       | from step 1                               |
| `SUPABASE_URL`          | your project URL                          |
| `SUPABASE_SERVICE_KEY`  | service role key (Supabase → Settings → API) |

---

### Routine A — Morning Post

- **Name:** `@uncoverd Morning Post`
- **Schedule:** `0 8 * * *` (08:00 UTC daily)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. Today is
the morning slot.

1. Read docs/x-style-guide.md and docs/x-post-types.md in full.
2. Execute the `ex-div-watch` flow per the spec.
3. If any `payout_changes` rows have detected_at within the last 14 hours
   and have NOT been posted yet (check `posted_tweets`), execute the
   `payout-change` flow on up to 1 of them, prioritizing by mkt_cap.
4. For each tweet you post: insert a row into `posted_tweets` with the
   correct `flow`, `symbol`, `tweet_id`, and `body`.

NEVER fabricate numbers. Every number in a tweet must come from a
Supabase query you ran in this session. If data is missing, skip the
post and log why.
```

### Routine B — Midday Post

- **Name:** `@uncoverd Midday Post`
- **Schedule:** `0 12 * * *` (12:00 UTC daily)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. Today is
the midday slot.

1. Read docs/x-style-guide.md and docs/x-post-types.md in full.
2. Execute the `featured-stock` flow per the spec.
3. If any new `payout_changes` since the morning slot, execute the
   `payout-change` flow on 1 of them (subject to the 3/day cap).
4. Write to `posted_tweets` for every posted tweet.

NEVER fabricate numbers. Every number must come from a query.
```

### Routine C — Evening Post

- **Name:** `@uncoverd Evening Post`
- **Schedule:** `0 16 * * *` (16:00 UTC daily)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. Today is
the evening slot.

1. Read docs/x-style-guide.md and docs/x-post-types.md in full.
2. Execute the `featured-etf` flow per the spec.
3. If today is Friday, ALSO execute `weekly-hikes` (16:00) AND
   `weekly-cuts` (will be posted 30 min later — note: this routine has
   one slot, so post both threads back-to-back).
4. If any new `payout_changes` since midday, execute the `payout-change`
   flow on 1 of them (subject to 3/day cap).
5. Write to `posted_tweets` for every posted tweet.

NEVER fabricate numbers. Every number must come from a query.
```

### Routine D — Weekly Heavy Threads

- **Name:** `@uncoverd Weekly Heavy`
- **Schedule:** four crons in one routine config:
  - `0 10 * * 1` (Mon 10:00 — company-dive)
  - `0 14 * * 2` (Tue 14:00 — potential-payers)
  - `0 14 * * 3` (Wed 14:00 — etf-dive)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. You are
handling the weekly heavy threads.

1. Read docs/x-style-guide.md and docs/x-post-types.md in full.
2. Determine which flow this slot is for, by day-of-week:
   - Monday → `company-dive`
   - Tuesday → `potential-payers`
   - Wednesday → `etf-dive`
3. Execute that flow per spec. These are threads; post each tweet in
   sequence as a reply to the previous one.
4. Write to `posted_tweets` for the head tweet, storing the full
   thread_tweet_ids array.

NEVER fabricate numbers. Every number must come from a query.
```

---

## 4. Dry-run before going live

Before flipping any routine to scheduled, run each one ONCE on demand
via the routine's "Run now" button. It will:

1. Compose what it would tweet.
2. Try to post (it will actually post — there's no dry-run flag in
   routines).

**To preview without actually posting:** temporarily set the X access
token to an invalid value before the first manual run, watch the
routine's logs to see the composed body, then restore the real token
once you're satisfied.

After 2–3 successful manual runs, enable the schedule.

---

## 5. Monitoring

The `posted_tweets` table IS the audit log. Useful queries:

```sql
-- All posts in the last 7 days
select posted_at, flow, symbol, left(body, 80) as preview
from posted_tweets
where posted_at > now() - interval '7 days'
order by posted_at desc;

-- Today's post count by flow
select flow, count(*)
from posted_tweets
where posted_at::date = current_date
group by flow;

-- Symbols featured in the last 30 days (dedup check)
select symbol, flow, posted_at
from posted_tweets
where posted_at > now() - interval '30 days'
  and symbol is not null
order by symbol, posted_at desc;
```

Set up a weekly check-in: read the last 7 days of posts, look for
patterns — formulaic phrasing, dead links, weird tone — and edit
`x-style-guide.md` accordingly. The next routine run picks up the
updated guide automatically.

---

## 6. Kill switch

If a routine starts misbehaving:

1. Go to [claude.ai/code/routines](https://claude.ai/code/routines)
2. Find the routine → toggle off the schedule (does not delete it)
3. Investigate via the routine's run logs
4. Fix the prompt or docs, re-enable

For an immediate stop *during* a run: revoke the X access token in
the X Developer Portal. Next post attempt will fail; routine logs
will show the error and stop.

---

## Phase 2 (when ready)

- Upgrade to X API Basic tier ($200/mo)
- Create **Routine E — Mentions Reply** (cron `*/5 * * * *`)
- Implement `reply-to-mention` flow per spec
- Add `analytics-aggregator` routine that pulls engagement metrics
  weekly and proposes style-guide edits

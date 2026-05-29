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
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (Supabase → Settings → API) |

---

## Architecture: hybrid CLI + thin routine prompts

The routines do NOT compose tweets from scratch. They orchestrate three CLI
commands shipped in the repo:

- `npm run x:candidates -- --slot=<slot>` → JSON list of viable flows for the
  current slot, with previews + skip reasons. Use this to decide what to post.
- `npm run x:compose -- --flow=<flow>` → returns the tweet body / thread for
  a flow without posting (useful for preview).
- `npm run x:post -- --flow=<flow>` → composes, posts to X, logs to
  `posted_tweets`. Add `--dry` to skip the network call.

All number-bearing text is generated deterministically by TypeScript code
that reads from Supabase — the routine never writes a yield, streak, or
payout ratio itself, so factual drift is impossible. The routine's job is
the editorial layer: pick which flows to run this slot, skip ones with
thin data, handle errors.

---

### Routine A — Morning Post

- **Name:** `@uncoverd Morning Post`
- **Schedule:** `0 8 * * *` (08:00 UTC daily)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. The morning slot.

Run this exactly:

  npm run x:candidates -- --slot=morning

You will get a JSON array of flows for this slot. Each item has:
  - flow: name (e.g. "ex-div-watch")
  - available: true|false
  - preview: the tweet body that would be posted
  - skip_reason: why if unavailable

For every flow where `available` is true, run:

  npm run x:post -- --flow=<flow>

That command composes the tweet from live Supabase data, posts via the X API,
and inserts the row into the `posted_tweets` table.

After each post, report the JSON output the command printed (which includes
the X tweet_id and the symbol if any).

If a flow returns `available: false`, do NOT try to recover or post anything
alternative. The skip_reason is the answer. Just log it and move on.

At the end, output a summary: how many tweets posted, how many skipped, and
the skip reasons.

Hard rules:
- Never edit the tweet body returned by the compose command. It has already
  been validated against the style guide and character budget.
- Never run `npm run x:compose` and then post the result yourself via the
  X API directly. Always use `npm run x:post`, which keeps the posted_tweets
  log in sync.
- If `npm run x:post` errors, report the full error and STOP. Do not retry
  unless the error is clearly transient (network).
```

### Routine B — Midday Post

- **Name:** `@uncoverd Midday Post`
- **Schedule:** `0 12 * * *` (12:00 UTC daily)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. The midday slot.

Run:

  npm run x:candidates -- --slot=midday

Then `npm run x:post -- --flow=<flow>` for each flow with `available: true`.

Same hard rules as the morning routine: never edit the body, never bypass the
post command, never retry on non-transient errors. Report a summary at the end.
```

### Routine C — Evening Post

- **Name:** `@uncoverd Evening Post`
- **Schedule:** `0 16 * * *` (16:00 UTC daily)
- **Prompt:**

```
You are the autonomous publishing routine for @uncoverd on X. The evening slot.

Run:

  npm run x:candidates -- --slot=evening

Then `npm run x:post -- --flow=<flow>` for each flow with `available: true`.

If today is Friday (UTC), ALSO run:

  npm run x:candidates -- --slot=friday

and post any `available: true` flows from that response too (weekly-hikes and
weekly-cuts threads).

Same hard rules. Summary at the end.
```

### Routine D — Weekly Heavy Threads

- **Name:** `@uncoverd Weekly Heavy`
- **Schedule:** three crons in one routine config:
  - `0 10 * * 1` (Mon 10:00 — company-dive — NOT YET IMPLEMENTED)
  - `0 14 * * 2` (Tue 14:00 — potential-payers — NOT YET IMPLEMENTED)
  - `0 14 * * 3` (Wed 14:00 — etf-dive — NOT YET IMPLEMENTED)
- **Status:** placeholder. The CLI does not yet expose `company-dive`,
  `potential-payers`, or `etf-dive` flows. Do not create this routine until
  those composers ship.

---

## 4. Dry-run before going live

**Local preview (recommended first):**

From your dev machine with `.env` populated:

```bash
npm run x:candidates -- --slot=morning
npm run x:compose -- --flow=featured-stock
npm run x:post -- --flow=featured-stock --dry
```

`--dry` composes and prints what would be tweeted, but skips the X API call
and the `posted_tweets` insert. Zero network side effects. Use this to verify
voice + facts before flipping the routine live.

**Cloud dry-run (in the routine UI):**

1. Save the routine but DO NOT enable the schedule.
2. Edit Routine A's prompt: change `npm run x:post` to `npm run x:post -- --dry`.
3. Click "Run now". Inspect the output in the logs — you'll see the composed
   bodies without anything actually posted.
4. When satisfied, remove `--dry` from the prompt, save, then enable the
   schedule.

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

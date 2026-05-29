# @uncoverd X Post Types

Each flow below is a self-contained spec. The routine that handles a flow
needs to: (1) read this section, (2) read `x-style-guide.md` for tone,
(3) query Supabase for the data, (4) compose, (5) post via the X API, (6)
write a row to `posted_tweets`.

**Common pre-flight check (run before any flow):** verify the subject
ticker(s) have not been featured in this same flow within the last 30
days by querying `posted_tweets where flow = $flow and symbol = $symbol
and posted_at > now() - interval '30 days'`. Skip and pick the next
candidate if found.

---

## 1. `featured-stock` — Daily stock snapshot

**Schedule:** every day at 12:00 UTC.

**What it posts:** one tweet using the `composeReply` shapes in
`x-style-guide.md`.

**Subject selection:**
1. From `stock_ratings_daily`, get stocks with `overall_rating >= 4` AND
   `is_actively_trading = true` AND `mkt_cap > 1_000_000_000`.
2. Exclude any symbol that appears in `posted_tweets` from the last 30
   days for ANY flow (don't post the same name across flows).
3. Order by `overall_rating desc, last_dividend_date desc`.
4. Pick the first candidate that also has a non-null `next_ex_div_date`
   within the next 60 days.

**Data to fetch for the chosen symbol:**
- `tickers`: name, is_etf, is_fund, sector, industry
- Current yield (computed: last 12 months of dividends / current price)
- Streak years from `dividend_streaks` (or derived from
  `dividends` history)
- Payout ratio from `ratios_annual` (most recent)
- Next ex-div date from `dividends` (next future row)
- Recovery days from `avgRecoveryDays(symbol, 8)`
- `is_reit`: industry contains "REIT"

**Output:** single tweet via Shape A/B/C (hash-picked).

**`posted_tweets` row:**
```
flow:   'featured-stock'
symbol: <picked symbol>
body:   <tweet text>
```

---

## 2. `featured-etf` — Daily ETF snapshot

**Schedule:** every day at 16:00 UTC.

**Subject selection:**
1. From `tickers` where `is_etf = true` AND `is_actively_trading = true`
   AND `aum_usd > 500_000_000`.
2. Exclude any ETF featured in any flow in the last 30 days.
3. Prefer ETFs with an ETF rating ≥ 4 (use `computeEtfRating`).
4. Pick the first candidate with a next ex-div date within 60 days.

**Data to fetch:**
- `tickers`: name, expense_ratio, aum_usd, sec_yield_30d
- Top holding from `etf_holdings` (highest weight)
- Next ex-div date from `dividends`

**Output:** single tweet, ETF Shape A from `x-style-guide.md`.

---

## 3. `ex-div-watch` — Morning ex-div preview

**Schedule:** every weekday at 08:00 UTC.

**What it posts:** one tweet listing the next 3 notable upcoming ex-div
dates in the next 5 trading days.

**Subject selection:**
1. From `dividendCalendar(today, today+5days)`, take stocks with
   `mkt_cap > 5_000_000_000` (notable enough to interest readers).
2. Order by ex-date ascending, then yield descending.
3. Take top 3 unique symbols.

**Template:**
```
Ex-dividend dates this week worth watching:
· ${SYM1} {date1} · {yield1}%
· ${SYM2} {date2} · {yield2}%
· ${SYM3} {date3} · {yield3}%
uncoverd.org/calendar/ex-dividend
```

**`posted_tweets` row:**
```
flow:   'ex-div-watch'
symbol: null  (multiple subjects)
body:   <tweet text>
```

---

## 4. `payout-change` — Reactive announcement

**Schedule:** every 60 minutes, weekdays only.

**Trigger:** new rows in the `payout_changes` table where `kind` in
(`'increasing'`, `'decreasing'`, `'initiating'`, `'suspending'`,
`'special'`) and `detected_at > posted_tweets.most_recent_posted_at for
this flow`.

**Cap:** max 3 posts per UTC day. If 3 already posted today, queue
remaining and skip.

**Subject selection:**
- Prefer `kind in ('increasing', 'initiating', 'special')` for positive
  news.
- For `kind = 'decreasing'` or `'suspending'`, only post if `mkt_cap >
  10_000_000_000` (big cuts are news; small caps cuts are noise).
- Order by `mkt_cap desc`, take the most notable.

**Templates by kind:**

`increasing`:
> $SYM just announced a {pct}% dividend hike — new ${amount}
> quarterly, ex-div {date}. That's their {streak}th raise in a row.
> uncoverd.org/stocks/SYM

`initiating`:
> $SYM is initiating a dividend: ${amount} per share, ex-div {date}.
> First payout in the company's history.
> uncoverd.org/stocks/SYM

`special`:
> $SYM declared a special dividend of ${amount} per share, ex-div
> {date}. Regular dividend stays at ${regular_amount}.
> uncoverd.org/stocks/SYM

`decreasing`:
> $SYM is cutting its dividend by {pct}% — new ${amount} quarterly,
> down from ${prev_amount}. Ex-div {date}.
> uncoverd.org/stocks/SYM

`suspending`:
> $SYM is suspending its dividend, effective with the {date} payment.
> Prior quarterly was ${prev_amount}.
> uncoverd.org/stocks/SYM

---

## 5. `weekly-hikes` — Friday recap thread

**Schedule:** every Friday at 16:00 UTC.

**Subject selection:**
- Top 5 dividend hikes (`kind = 'increasing'`) from
  `payout_changes` in the last 7 days, ordered by `mkt_cap desc`.
- Skip if fewer than 3 hikes — wait until next week.

**Thread structure:**
```
1/ This week's biggest dividend hikes:

2/ $SYM1 raised {pct1}% — new ${amt1} quarterly. {streak1} consecutive
   years of raises.

3/ $SYM2 raised {pct2}% — new ${amt2} quarterly. {streak2} consecutive
   years of raises.

4/ $SYM3 raised {pct3}% — new ${amt3} quarterly. {streak3} consecutive
   years of raises.

5/ $SYM4 raised {pct4}% — new ${amt4} quarterly. {streak4} consecutive
   years of raises.

6/ $SYM5 raised {pct5}% — new ${amt5} quarterly. {streak5} consecutive
   years of raises.

7/ Full payout-change tracker:
   uncoverd.org/payout-changes/increasing
```

---

## 6. `weekly-cuts` — Friday recap thread

**Schedule:** every Friday at 16:30 UTC.

**Subject selection:**
- Top 5 cuts/suspensions from `payout_changes` in the last 7 days,
  `mkt_cap > 1_000_000_000`, ordered by `mkt_cap desc`.
- Skip if fewer than 2 — silence is fine.

**Thread structure:** mirror of weekly-hikes but with `cut`/`suspended`
language. End with `uncoverd.org/payout-changes/decreasing`.

---

## 7. `company-dive` — Monday deep thread

**Schedule:** every Monday at 10:00 UTC.

**Subject selection:**
- Highest-rated stock (`stock_ratings_daily.overall_rating`) not
  featured by any flow in the last 60 days (longer window — this is the
  "main event" post).
- Must have ≥ 5 years of dividend history.

**Data to fetch (deeper than featured-stock):**
- Standard fields (yield, streak, payout, ex-div, recovery)
- Last raise pct + new amount
- TTM free cash flow + dividend obligation (from `cash_flow_annual`)
- Peer comparison: median yield of `getPeerStocksInSector(symbol, sector, 10)`

**Thread structure:**

```
1/ ${symbol} — {streak} consecutive years of dividend raises.
   Yielding {yield}% today. {one-sentence hook about why it's interesting}.

2/ Last raise was {pct}%, lifting the quarterly to ${amt}. Payout sits
   at {payout}% of earnings — {payout adjective from style guide}.

3/ Free cash flow last year: ${fcf}B. Dividend obligation: ${div}B.
   That's {coverage}x coverage from cash.

4/ Recoveries after ex-div: median ~{days} days. {one-sentence on price
   behavior based on data}.

5/ Sector peers ({sector}) median yield: {peer_yield}%. ${symbol} sits
   {above/below} the median.

6/ Full dividend history, rating breakdown, peers:
   uncoverd.org/stocks/${symbol}
```

---

## 8. `potential-payers` — Tuesday thread

**Schedule:** every Tuesday at 14:00 UTC.

**Subject selection:** top 5 from `getPotentialDividendPayers(20)`
filtered to those NOT featured in this flow in the last 90 days.

**Thread structure:**

```
1/ 5 companies sitting on the cash and earnings to start paying a
   dividend, but haven't yet:

2/ $SYM1 — {cash position} in net cash, {fcf margin}% FCF margin,
   {payout history}.

3/ $SYM2 — ...

4/ $SYM3 — ...

5/ $SYM4 — ...

6/ $SYM5 — ...

7/ Full screen of potential payers:
   uncoverd.org/lists/potential-payers
```

---

## 9. `etf-dive` — Wednesday thread

**Schedule:** every Wednesday at 14:00 UTC.

**Subject selection:** top-rated ETF (`computeEtfRating`) not featured in
the last 60 days, with `aum_usd > 1_000_000_000`.

**Data:** standard ETF fields + top 5 holdings + sector weights.

**Thread structure:** 5–6 tweets covering yield/expense/AUM, top holdings,
sector concentration, dividend history. End with
`uncoverd.org/etfs/symbol/${symbol}`.

---

## 10. `reply-to-mention` — Reactive (Phase 2)

**NOT in initial build.** Requires X API Basic tier ($200/mo) for read
access. Spec'd here for later.

**Schedule:** every 5 minutes.

**Trigger:** new mentions of `@uncoverd` containing a recognizable
ticker or company name. Match against `tickers` table.

**Hard rules:**
1. **Only reply to root mentions.** If `in_reply_to_status_id` is not
   null on the mention, ignore. This prevents conversation recursion.
2. **Skip if no dividend payer.** If the mentioned ticker doesn't pay a
   dividend, silence is the answer.
3. **Dedup via `posted_tweets.source_tweet_id`.** Never reply twice to
   the same tweet.
4. **Max 2 replies per user per day.**

**Output:** single tweet via Shape A/B/C, prefixed with the user
handle so it threads correctly.

---

## Routine batching

Routines have a daily run cap per account, so flows are batched into
**three scheduled routines** rather than ten:

- **Morning Routine** (08:00 UTC daily) — `ex-div-watch` + queued
  `payout-change` from overnight
- **Midday Routine** (12:00 UTC daily) — `featured-stock` +
  `payout-change` reactions from morning
- **Evening Routine** (16:00 UTC daily) — `featured-etf` +
  `payout-change` reactions from afternoon
- **Weekly Heavy Routine** (Mon 10:00 / Tue 14:00 / Wed 14:00 /
  Fri 16:00) — handles `company-dive`, `potential-payers`,
  `etf-dive`, `weekly-hikes`/`weekly-cuts`

Each routine reads this doc, identifies what's scheduled for its slot,
runs each applicable flow in sequence, and writes a `posted_tweets` row
per output.

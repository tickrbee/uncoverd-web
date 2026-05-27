# refresh-fmp-data — Supabase Edge Function

Pulls fresh data from FinancialModelingPrep (FMP) into the `backend` schema:

- **`backend.tickers`** — ALL active stocks worldwide (~49K): refreshes `price`, `changes`, `change_percentage`, `volume`, `mkt_cap`
- **`backend.tickers`** — ALL ETFs worldwide (~13K) via FMP's `/etf-list`: adds new ETFs and refreshes prices
- **`backend.dividends`** — upcoming dividend events for the next 60 days
- **`backend.company_news`** — latest news for top US dividend payers

## Sharding

Because the Edge Function has a 150-second timeout on the free tier, very large refreshes (~63K symbols) won't all fit in a single invocation. The function supports `?shard=N&shards=M` to split the workload:

- `?shard=0&shards=1` → run everything (default)
- `?shard=0&shards=4` → first quarter of symbols
- `?shard=1&shards=4` → second quarter
- ...etc.

You can also limit a single invocation to one stage:

- `?stage=stocks` → only refresh stock quotes
- `?stage=etfs` → only refresh ETFs
- `?stage=dividends` → only refresh dividend calendar (no sharding needed)
- `?stage=news` → only refresh news

Dividends and news are only run when `shard=0` to avoid duplicate work across shards.

## Prerequisites

```bash
npm install -g supabase
supabase login
supabase link --project-ref llbatqfycdppdcqrocqx
supabase secrets set FMP_API_KEY=your_fmp_key_here  # only if not already set
```

## Deploy

```bash
cd uncoverd-web
supabase functions deploy refresh-fmp-data --no-verify-jwt
```

## Manual test (everything, single shard)

```bash
curl -X POST "https://llbatqfycdppdcqrocqx.supabase.co/functions/v1/refresh-fmp-data?shards=4&shard=0" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected response:

```json
{
  "ok": true,
  "ms": 120000,
  "shard": 0,
  "shards": 4,
  "stage": "all",
  "quotes": { "quotesUpdated": 12000, "quotesAttempted": 12300, "totalSymbols": 49305 },
  "etfs": { "etfsUpserted": 3000, "etfsAttempted": 3500, "totalEtfs": 13889 },
  "dividends": { "dividendsUpserted": 3999 },
  "news": { "newsUpserted": 50, "skippedDuplicates": 50 }
}
```

## Schedule (cron) — sharded daily

In Supabase dashboard → **Database** → **Cron**. We schedule 4 sharded calls spaced 5 minutes apart so we cover all ~63K symbols without hitting the timeout. Dividends + news only run in shard 0.

```sql
-- First, unschedule the existing single-shot job if it exists
select cron.unschedule(18);  -- or whatever ID you got; check with: select * from cron.job;

-- 4-shard daily schedule, 5 min apart starting at 04:00 UTC
select cron.schedule(
  'refresh-fmp-data-shard-0',
  '0 4 * * *',
  $$ select net.http_post(
       url := 'https://llbatqfycdppdcqrocqx.supabase.co/functions/v1/refresh-fmp-data?shards=4&shard=0',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       )
     ); $$
);
select cron.schedule(
  'refresh-fmp-data-shard-1',
  '5 4 * * *',
  $$ select net.http_post(
       url := 'https://llbatqfycdppdcqrocqx.supabase.co/functions/v1/refresh-fmp-data?shards=4&shard=1',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       )
     ); $$
);
select cron.schedule(
  'refresh-fmp-data-shard-2',
  '10 4 * * *',
  $$ select net.http_post(
       url := 'https://llbatqfycdppdcqrocqx.supabase.co/functions/v1/refresh-fmp-data?shards=4&shard=2',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       )
     ); $$
);
select cron.schedule(
  'refresh-fmp-data-shard-3',
  '15 4 * * *',
  $$ select net.http_post(
       url := 'https://llbatqfycdppdcqrocqx.supabase.co/functions/v1/refresh-fmp-data?shards=4&shard=3',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       )
     ); $$
);
```

Check cron status: `select * from cron.job;` and `select * from cron.job_run_details order by start_time desc limit 20;`

## Why not larger shards?

If you upgrade to Supabase Pro, Edge Functions get a longer timeout (400s) — you can drop to 2 shards or even 1. The function code itself supports any shard count.

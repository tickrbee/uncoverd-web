-- dividend_streaks: per-symbol consecutive-year dividend-increase streaks
-- computed from backend.dividends. Replaces the unreliable static columns in
-- public.dividend_kings / _aristocrats / _achievers / _contenders /
-- _challengers (kings all show "2 yrs", aristocrats include 0-year entries,
-- achievers and contenders have identical membership).
--
-- Refreshed nightly via backend.refresh_dividend_streaks().

create table if not exists backend.dividend_streaks (
  symbol             text primary key,
  -- Consecutive completed years where the annual total dividend strictly
  -- increased over the prior year. Uses adj_dividend so splits don't
  -- terminate the streak.
  streak_years       integer not null default 0,
  -- Most recent completed calendar year that contributed to the streak.
  latest_year        integer,
  latest_year_total  numeric,
  -- Total years of any dividend history (for the "since" badge).
  total_years        integer not null default 0,
  computed_at        timestamptz not null default now()
);

create index if not exists dividend_streaks_streak_idx
  on backend.dividend_streaks (streak_years desc);

-- Compute all streaks from scratch and replace the table contents.
-- Cheap enough to run nightly: bounded by the distinct symbols in dividends
-- (~6k payers globally) × ~25 years of buckets.
create or replace function backend.refresh_dividend_streaks()
returns integer
language plpgsql
security definer
as $$
declare
  inserted integer;
begin
  -- One transaction so /growers/* never sees a partial table.
  delete from backend.dividend_streaks;

  with annual as (
    -- Sum dividends per (symbol, calendar year), preferring adj_dividend
    -- over the raw column so a stock split doesn't show as a year-over-year
    -- drop. Drop the current year (incomplete) and years older than 70.
    select
      symbol,
      extract(year from date)::int as yr,
      sum(coalesce(adj_dividend, dividend))::numeric as total
    from backend.dividends
    where dividend is not null
      and date is not null
      and extract(year from date) < extract(year from current_date)
      and extract(year from date) >= extract(year from current_date) - 70
    group by symbol, extract(year from date)
    having sum(coalesce(adj_dividend, dividend)) > 0
  ),
  ranked as (
    select
      symbol,
      yr,
      total,
      lag(total) over (partition by symbol order by yr) as prev_total,
      lag(yr) over (partition by symbol order by yr) as prev_yr
    from annual
  ),
  -- Group consecutive years where total > prev_total AND prev_yr = yr - 1
  -- into "increase runs", then take the most recent run that touches the
  -- latest completed year.
  marked as (
    select
      symbol,
      yr,
      total,
      case
        when prev_total is null then 0
        when total > prev_total and prev_yr = yr - 1 then 1
        else 0
      end as is_increase
    from ranked
  ),
  grouped as (
    -- Tag each row with a group id that increments on every break (is_increase=0).
    -- The latest group with is_increase=1 contains the current streak.
    select
      symbol,
      yr,
      total,
      is_increase,
      sum(case when is_increase = 0 then 1 else 0 end)
        over (partition by symbol order by yr) as grp
    from marked
  ),
  streak_groups as (
    select
      symbol,
      grp,
      count(*) as years_in_group,
      max(yr) as last_yr_in_group,
      max(total) as latest_total
    from grouped
    where is_increase = 1
    group by symbol, grp
  ),
  latest_completed as (
    select symbol, max(yr) as max_yr from annual group by symbol
  ),
  current_streak as (
    select
      sg.symbol,
      sg.years_in_group as streak_years,
      sg.last_yr_in_group as latest_year,
      sg.latest_total as latest_year_total
    from streak_groups sg
    join latest_completed lc on lc.symbol = sg.symbol
    where sg.last_yr_in_group = lc.max_yr
  ),
  totals as (
    select symbol, count(distinct yr) as total_years from annual group by symbol
  )
  insert into backend.dividend_streaks
    (symbol, streak_years, latest_year, latest_year_total, total_years, computed_at)
  select
    t.symbol,
    coalesce(cs.streak_years, 0),
    cs.latest_year,
    cs.latest_year_total,
    t.total_years,
    now()
  from totals t
  left join current_streak cs on cs.symbol = t.symbol;

  get diagnostics inserted = row_count;
  return inserted;
end
$$;

-- Convenience read function the app uses for /growers/*. Mirrors the slug
-- criteria 1:1 so there's only one source of truth.
create or replace function backend.dividend_growers_by_slug(slug text)
returns table (symbol text, streak_years int, latest_year int, total_years int)
language sql
stable
as $$
  select symbol, streak_years, latest_year, total_years
  from backend.dividend_streaks
  where
    case slug
      when 'kings'       then streak_years >= 50
      when 'aristocrats' then streak_years >= 25
      when 'champions'   then streak_years >= 25
      when 'achievers'   then streak_years >= 10
      when 'contenders'  then streak_years between 10 and 24
      when 'challengers' then streak_years between 5 and 9
      else false
    end
  order by streak_years desc, symbol asc
  limit 500;
$$;

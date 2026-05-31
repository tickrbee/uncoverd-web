-- etf_country_weightings: country-level allocation of an ETF, sourced from
-- FMP's /etf/country-weightings endpoint. Used on /etfs/symbol/[ticker] to
-- show geographic exposure alongside the existing sector breakdown.
--
-- Refreshed by the refresh-fmp-data edge function on the same shard schedule
-- as etf_holdings and etf_sector_weightings.

create table if not exists backend.etf_country_weightings (
  etf_symbol        text not null,
  country           text not null,
  weight_percentage numeric,
  updated_at        timestamptz not null default now(),
  primary key (etf_symbol, country)
);

create index if not exists etf_country_weightings_symbol_idx
  on backend.etf_country_weightings (etf_symbol);

alter table backend.etf_country_weightings enable row level security;

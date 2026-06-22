-- get_stock_detail / get_etf_detail: collapse the ~15–17 separate Supabase
-- round-trips that the /stocks/[ticker] and /etfs/symbol/[ticker] pages make on
-- every (mostly crawler-driven) cold render into ONE RPC that returns the whole
-- page payload as a single JSON object. This is the headline Vercel-cost fix:
-- it removes ~16 auto-instrumented spans/render (Observability Events) and the
-- per-call function/transfer overhead. The column lists below mirror, 1:1, the
-- explicit selects in src/lib/data.ts so the TypeScript row types and every
-- downstream component keep working unchanged.
--
-- Both functions live in the `backend` schema (the app's getBackendClient sets
-- db.schema = "backend", so supabase.rpc("get_stock_detail") resolves here,
-- exactly like the existing potential_dividend_payers / etf_top_held RPCs).

-- ============================================================
-- backend.get_stock_detail(symbol) -> json
-- ============================================================
create or replace function backend.get_stock_detail(p_symbol text)
returns json
language sql
stable
security definer
set search_path = backend, public
as $$
  with t as (
    select * from backend.tickers where symbol = p_symbol limit 1
  )
  select case
    when not exists (select 1 from t) then null
    else json_build_object(
      'stock', (
        select to_jsonb(x) from (
          select symbol,name,exchange,exchange_short,price,type,beta,vol_avg,mkt_cap,
                 last_div,range,changes,currency,industry,website,description,ceo,sector,
                 country,full_time_employees,ipo_date,is_etf,is_actively_trading,is_fund,
                 change_percentage,volume,average_volume,image,isin,city,state,zip,phone,
                 address,next_ex_dividend_date,next_ex_dividend_amount,expense_ratio,aum,
                 holdings_count,etf_category,asset_class,nav,etf_company,avg_recovery_days
          from backend.tickers where symbol = p_symbol limit 1
        ) x
      ),
      'dividends', coalesce((select json_agg(d) from (
        select symbol,date,record_date,payment_date,declaration_date,adj_dividend,dividend,yield,frequency
        from backend.dividends where symbol = p_symbol
        order by date desc limit 40) d), '[]'::json),
      'news', coalesce((select json_agg(n) from (
        select id,symbol,published_date,publisher,title,image,site,text,url
        from backend.company_news where symbol = p_symbol
        order by published_date desc limit 12) n), '[]'::json),
      'prices', coalesce((select json_agg(p) from (
        select symbol,date,open,high,low,close,volume,dividends,change_percent
        from backend.historical_prices_stocks
        where symbol = p_symbol and date >= current_date - interval '10 years'
        order by date asc limit 5000) p), '[]'::json),
      'incomeAnnual', coalesce((select json_agg(x) from (
        select symbol,fiscal_year,period,date,revenue,gross_profit,operating_income,ebitda,net_income,eps,eps_diluted,reported_currency
        from backend.income_statement_annual where symbol = p_symbol
        order by date desc limit 5) x), '[]'::json),
      'incomeQuarterly', coalesce((select json_agg(x) from (
        select symbol,fiscal_year,period,date,revenue,gross_profit,operating_income,ebitda,net_income,eps,eps_diluted,reported_currency
        from backend.income_statement_quarterly where symbol = p_symbol
        order by date desc limit 8) x), '[]'::json),
      'balanceAnnual', coalesce((select json_agg(x) from (
        select symbol,fiscal_year,period,date,total_debt,short_term_debt,long_term_debt,net_debt,cash_and_cash_equivalents,cash_and_short_term_investments,total_assets,total_liabilities,total_current_assets,total_current_liabilities,total_stockholders_equity,reported_currency
        from backend.balance_sheet_annual where symbol = p_symbol
        order by date desc limit 5) x), '[]'::json),
      'balanceQuarterly', coalesce((select json_agg(x) from (
        select symbol,fiscal_year,period,date,total_debt,short_term_debt,long_term_debt,net_debt,cash_and_cash_equivalents,cash_and_short_term_investments,total_assets,total_liabilities,total_current_assets,total_current_liabilities,total_stockholders_equity,reported_currency
        from backend.balance_sheet_quarterly where symbol = p_symbol
        order by date desc limit 8) x), '[]'::json),
      'cashFlowAnnual', coalesce((select json_agg(x) from (
        select symbol,fiscal_year,period,date,free_cash_flow,operating_cash_flow,capital_expenditure,common_dividends_paid,net_dividends_paid,net_cash_provided_by_operating_activities,net_cash_provided_by_investing_activities,net_cash_provided_by_financing_activities,reported_currency
        from backend.cash_flow_annual where symbol = p_symbol
        order by date desc limit 5) x), '[]'::json),
      'cashFlowQuarterly', coalesce((select json_agg(x) from (
        select symbol,fiscal_year,period,date,free_cash_flow,operating_cash_flow,capital_expenditure,common_dividends_paid,net_dividends_paid,net_cash_provided_by_operating_activities,net_cash_provided_by_investing_activities,net_cash_provided_by_financing_activities,reported_currency
        from backend.cash_flow_quarterly where symbol = p_symbol
        order by date desc limit 8) x), '[]'::json),
      'ratios', (select to_jsonb(r) from (
        select symbol,fiscal_year,date,price_to_earnings_ratio,price_to_book_ratio,dividend_payout_ratio,dividend_yield_percentage,dividend_per_share,debt_to_equity_ratio,gross_profit_margin,net_profit_margin
        from backend.ratios_annual where symbol = p_symbol
        order by date desc limit 1) r),
      'listings', coalesce((select json_agg(l) from (
        select symbol, coalesce(exchange_short, exchange) as exchange, currency, country, volume, price
        from backend.tickers
        where name = (select name from t) and is_actively_trading = true
          and is_etf = false and is_fund = false
        order by volume desc nulls last limit 25) l), '[]'::json),
      'peers', coalesce((select json_agg(pp) from (
        select symbol, name, price, last_div
        from backend.tickers
        where is_actively_trading = true and is_etf = false
          and sector = (select sector from t) and symbol <> p_symbol
          and last_div > 0 and price > 0 and mkt_cap >= 1000000000
        order by mkt_cap desc nulls last limit 6) pp), '[]'::json),
      'etfHolders', coalesce((select json_agg(h) from (
        select eh.etf_symbol, tk.name as etf_name, eh.weight_percentage
        from backend.etf_holdings eh
        left join backend.tickers tk on tk.symbol = eh.etf_symbol
        where eh.asset = upper(p_symbol)
        order by eh.weight_percentage desc nulls last limit 6) h), '[]'::json)
    )
  end;
$$;

-- ============================================================
-- backend.get_etf_detail(symbol) -> json
-- ============================================================
create or replace function backend.get_etf_detail(p_symbol text)
returns json
language sql
stable
security definer
set search_path = backend, public
as $$
  with t as (
    select * from backend.tickers where symbol = p_symbol limit 1
  )
  select case
    when not exists (select 1 from t) then null
    else json_build_object(
      -- ETF_DETAIL_COLUMNS = TICKER_COLUMNS + is_adr (the other ETF columns are
      -- already part of TICKER_COLUMNS).
      'etf', (
        select to_jsonb(x) from (
          select symbol,name,exchange,exchange_short,price,type,beta,vol_avg,mkt_cap,
                 last_div,range,changes,currency,industry,website,description,ceo,sector,
                 country,full_time_employees,ipo_date,is_etf,is_actively_trading,is_fund,
                 change_percentage,volume,average_volume,image,isin,city,state,zip,phone,
                 address,next_ex_dividend_date,next_ex_dividend_amount,expense_ratio,aum,
                 holdings_count,etf_category,asset_class,nav,etf_company,avg_recovery_days,is_adr
          from backend.tickers where symbol = p_symbol limit 1
        ) x
      ),
      'dividends', coalesce((select json_agg(d) from (
        select symbol,date,record_date,payment_date,declaration_date,adj_dividend,dividend,yield,frequency
        from backend.dividends where symbol = p_symbol
        order by date desc limit 60) d), '[]'::json),
      'news', coalesce((select json_agg(n) from (
        select id,symbol,published_date,publisher,title,image,site,text,url
        from backend.company_news where symbol = p_symbol
        order by published_date desc limit 12) n), '[]'::json),
      'prices', coalesce((select json_agg(p) from (
        select symbol,date,open,high,low,close,volume,dividends,change_percent
        from backend.historical_prices_stocks
        where symbol = p_symbol and date >= current_date - interval '5 years'
        order by date asc limit 5000) p), '[]'::json),
      'holdings', coalesce((select json_agg(h) from (
        select asset,name,weight_percentage,shares_number,market_value
        from backend.etf_holdings where etf_symbol = p_symbol
        order by weight_percentage desc nulls last limit 50) h), '[]'::json),
      'sectorWeights', coalesce((select json_agg(s) from (
        select sector, weight_percentage
        from backend.etf_sector_weightings where etf_symbol = p_symbol
        order by weight_percentage desc nulls last) s), '[]'::json),
      -- etf_country_weightings may not exist on every environment (additive
      -- migration). Guard with to_regclass so a missing table yields [].
      'countryWeights', case
        when to_regclass('backend.etf_country_weightings') is null then '[]'::json
        else coalesce((select json_agg(c) from (
          select country, weight_percentage
          from backend.etf_country_weightings where etf_symbol = p_symbol
          order by weight_percentage desc nulls last) c), '[]'::json)
      end,
      'listings', coalesce((select json_agg(l) from (
        select symbol, coalesce(exchange_short, exchange) as exchange, currency, country, volume, price
        from backend.tickers
        where name = (select name from t) and is_actively_trading = true
          and (is_etf = true or is_fund = true)
        order by volume desc nulls last limit 25) l), '[]'::json)
    )
  end;
$$;

grant execute on function backend.get_stock_detail(text) to service_role;
grant execute on function backend.get_etf_detail(text) to service_role;

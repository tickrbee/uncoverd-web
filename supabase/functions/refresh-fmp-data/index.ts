//xx
// supabase edge function (deno runtime)
// @ts-nocheck
// Deno (Supabase Edge Runtime). The Next.js tsconfig excludes `supabase/` and
// this pragma silences the IDE's Node-mode language server. Deno understands
// URL imports and the global `Deno` natively.
//
// Supabase Edge Function: refresh-fmp-data
//
// Pulls the latest data from FinancialModelingPrep into the `backend` schema.
// Supports sharding via `?shard=N&shards=M` so multiple invocations can
// share the workload (Edge Functions have a 150s timeout on the free tier).
//
// What it refreshes:
//   - backend.tickers: prices/mkt_cap/change for ALL active tickers worldwide
//   - backend.tickers: ETF metadata for ALL ETFs in FMP's /etf-list
//   - backend.dividends: upcoming dividend events for the next 60 days
//   - backend.company_news: latest news for top US dividend payers
//
// Deploy:  supabase functions deploy refresh-fmp-data --no-verify-jwt
// Manual:  curl -X POST https://<ref>.supabase.co/functions/v1/refresh-fmp-data \
//             -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
// Sharded: append ?shard=0&shards=4 / ?shard=1&shards=4 / ... to split the
//          stocks + ETFs workload across multiple invocations.

// Supabase Edge Runtime now bans remote specifiers (`https://deno.land/...`,
// `https://esm.sh/...`). Use `npm:` for npm packages and the built-in
// `Deno.serve` instead of std/http/server.
import { createClient } from "npm:@supabase/supabase-js@2";

const FMP_STABLE = "https://financialmodelingprep.com/stable";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "backend" },
});

async function fmp<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${FMP_STABLE}${path}${sep}apikey=${FMP_API_KEY}`);
  if (!res.ok) throw new Error(`FMP ${res.status} ${path}: ${await res.text()}`);
  return (await res.json()) as T;
}

type BatchQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercentage?: number;
  volume?: number;
  marketCap?: number;
};

// Pull /batch-quote for a list of symbols, chunked + concurrent, then upsert
// the lot into backend.tickers. Returns counts + any error messages.
async function fetchQuotesAndUpsert(
  symbols: string[],
  baseRow: (sym: string) => Record<string, unknown> | null = () => null
): Promise<{ updated: number; errors: string[] }> {
  if (symbols.length === 0) return { updated: 0, errors: [] };
  const errors: string[] = [];
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 100) chunks.push(symbols.slice(i, i + 100));

  const CONCURRENCY = 10;
  let next = 0;
  let updated = 0;
  async function worker() {
    while (next < chunks.length) {
      const idx = next++;
      const chunk = chunks[idx];
      try {
        const quotes = await fmp<BatchQuote[]>(`/batch-quote?symbols=${chunk.join(",")}`);
        if (!quotes || quotes.length === 0) continue;
        // Build updates with: (a) numeric clamping (some FMP rows return absurd
        // values that overflow numeric(X,Y) columns), (b) in-batch dedupe
        // (FMP occasionally returns the same symbol twice in one response,
        // which breaks the ON CONFLICT upsert).
        const dedup = new Map<string, BatchQuote>();
        for (const q of quotes) dedup.set(q.symbol, q);
        const clamp = (v: number | null | undefined, max: number): number | null => {
          if (v == null || !isFinite(v)) return null;
          if (v > max) return max;
          if (v < -max) return -max;
          return v;
        };
        const updates = Array.from(dedup.values()).map((q) => ({
          ...(baseRow(q.symbol) ?? {}),
          symbol: q.symbol,
          price: clamp(q.price, 9_999_999),
          changes: clamp(q.change, 9_999_999),
          // change_percentage is numeric — keep it under ±9999.99
          change_percentage: clamp(q.changePercentage, 9999.99),
          // bigint columns — round and clamp under 64-bit signed max safety margin
          volume: q.volume != null ? Math.min(Math.round(q.volume), 9_000_000_000_000_000) : null,
          mkt_cap: q.marketCap != null ? Math.min(Math.round(q.marketCap), 9_000_000_000_000_000) : null,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await sb.from("tickers").upsert(updates, { onConflict: "symbol" });
        if (error) {
          console.error("[upsert chunk", idx, "]", error);
          errors.push(error.message);
        } else {
          updated += updates.length;
        }
      } catch (e) {
        console.error("[fetch chunk", idx, "]", e);
        errors.push(String(e));
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker());
  await Promise.all(workers);
  return { updated, errors };
}

// Slice an array of symbols into a single shard (for `?shard=N&shards=M`).
function shardSlice<T>(arr: T[], shard: number, shards: number): T[] {
  if (shards <= 1) return arr;
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i % shards === shard) out.push(arr[i]);
  }
  return out;
}

// Best-effort country/currency inference from FMP symbol suffix. Used for both
// new stocks (from /stock-list) and ETFs (from /etf-list).
function inferCountry(symbol: string): { country: string; currency: string } {
  if (!symbol.includes(".")) return { country: "US", currency: "USD" };
  const suffix = symbol.split(".").pop()!;
  const map: Record<string, [string, string]> = {
    L: ["GB", "GBP"],
    DE: ["DE", "EUR"],
    F: ["DE", "EUR"],
    PA: ["FR", "EUR"],
    AS: ["NL", "EUR"],
    MI: ["IT", "EUR"],
    SW: ["CH", "CHF"],
    TO: ["CA", "CAD"],
    V: ["CA", "CAD"],
    AX: ["AU", "AUD"],
    T: ["JP", "JPY"],
    HK: ["HK", "HKD"],
    SS: ["CN", "CNY"],
    SZ: ["CN", "CNY"],
    KS: ["KR", "KRW"],
    NS: ["IN", "INR"],
    BO: ["IN", "INR"],
    SA: ["BR", "BRL"],
    MX: ["MX", "MXN"],
    ST: ["SE", "SEK"],
    OL: ["NO", "NOK"],
    CO: ["DK", "DKK"],
    HE: ["FI", "EUR"],
    VI: ["AT", "EUR"],
    BR: ["BE", "EUR"],
    LS: ["PT", "EUR"],
    MC: ["ES", "EUR"],
    IR: ["IE", "EUR"],
    WA: ["PL", "PLN"],
    JK: ["ID", "IDR"],
    BK: ["TH", "THB"],
    KL: ["MY", "MYR"],
    SI: ["SG", "SGD"],
    TW: ["TW", "TWD"],
    NE: ["CA", "CAD"],
  };
  const m = map[suffix];
  return m ? { country: m[0], currency: m[1] } : { country: "US", currency: "USD" };
}

// 0) Sync FMP's master /stock-list into backend.tickers. Adds new symbols we
//    don't yet have (FMP currently lists ~90K worldwide). This runs once per
//    full cron pass (only on shard 0) to avoid duplicate inserts.
async function syncStockList() {
  type StockListItem = { symbol: string; companyName?: string };
  const list = await fmp<StockListItem[]>(`/stock-list`).catch(() => [] as StockListItem[]);
  if (list.length === 0) return { synced: 0, inserted: 0 };

  // Pull all existing symbols (chunked) so we only insert the missing ones.
  const existing = new Set<string>();
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from("tickers").select("symbol").range(offset, offset + 999);
    if (error) {
      console.error("[syncStockList existing]", error);
      break;
    }
    const rows = (data as { symbol: string }[]) ?? [];
    for (const r of rows) existing.add(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }

  const newRows = list
    .filter((s) => s.symbol && !existing.has(s.symbol))
    .map((s) => {
      const meta = inferCountry(s.symbol);
      return {
        symbol: s.symbol,
        name: s.companyName ?? null,
        country: meta.country,
        currency: meta.currency,
        is_actively_trading: true,
        is_etf: false,
        // Explicitly set is_fund=false on insert. Without it, NULL slips in
        // and the financials/dividends/prices refresh functions (which use
        // .eq("is_fund", false)) silently skip the symbol — that's what
        // caused GOOGL/NFLX to have no financials or rating.
        is_fund: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

  let inserted = 0;
  for (let i = 0; i < newRows.length; i += 500) {
    const batch = newRows.slice(i, i + 500);
    const { error } = await sb.from("tickers").upsert(batch, { onConflict: "symbol", ignoreDuplicates: true });
    if (error) {
      console.error("[syncStockList insert batch]", error);
    } else {
      inserted += batch.length;
    }
  }

  return { synced: list.length, inserted };
}

// 1) Refresh quotes for ALL active tickers worldwide (~90K).
async function refreshQuotes(shard: number, shards: number) {
  const all: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .eq("is_etf", false)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error) {
      return { quotesUpdated: 0, errors: [error.message] };
    }
    const rows = (data as { symbol: string }[]) ?? [];
    for (const r of rows) all.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(all, shard, shards);
  const { updated, errors } = await fetchQuotesAndUpsert(subset);
  return { quotesUpdated: updated, quotesAttempted: subset.length, totalSymbols: all.length, errors };
}

// 2) Refresh upcoming dividend calendar — extended to 365 days. FMP can return
//    duplicates for the same (symbol, date); we dedupe before upserting.
async function refreshDividends() {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + 365);
  const futureIso = future.toISOString().slice(0, 10);

  type DividendItem = {
    symbol: string;
    date: string;
    recordDate?: string;
    paymentDate?: string;
    declarationDate?: string;
    dividend: number;
    adjDividend?: number;
    yield?: number;
    frequency?: string;
  };

  const items = await fmp<DividendItem[]>(`/dividends-calendar?from=${today}&to=${futureIso}`);
  if (!items || items.length === 0) return { dividendsUpserted: 0 };

  const dedup = new Map<string, DividendItem>();
  for (const d of items) {
    if (!d.symbol || !d.date) continue;
    dedup.set(`${d.symbol}|${d.date}`, d);
  }

  const rows = Array.from(dedup.values()).map((d) => ({
    symbol: d.symbol,
    date: d.date,
    record_date: d.recordDate || null,
    payment_date: d.paymentDate || null,
    declaration_date: d.declarationDate || null,
    dividend: d.dividend,
    adj_dividend: d.adjDividend ?? d.dividend,
    yield: d.yield ?? null,
    frequency: d.frequency ?? null,
    timestamp: new Date().toISOString(),
  }));

  const { error } = await sb.from("dividends").upsert(rows, { onConflict: "symbol,date" });
  if (error) {
    console.error("[refreshDividends upsert]", error);
    return { dividendsUpserted: 0, error: error.message };
  }

  // Materialize "next ex-dividend" onto backend.tickers so listing queries
  // can filter to upcoming-only with a single indexed predicate rather than
  // a cross-table join. Cheaper than a view at read time, refreshed once
  // per dividend pull.
  let nextDivUpdated = 0;
  try {
    const restRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/refresh_next_ex_dividend`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Content-Profile": "backend",
      },
      body: "{}",
    });
    if (restRes.ok) {
      const text = await restRes.text();
      nextDivUpdated = parseInt(text, 10) || 0;
    } else {
      console.error("[refreshDividends next-ex rpc]", restRes.status, await restRes.text());
    }
  } catch (e) {
    console.error("[refreshDividends next-ex rpc]", e);
  }

  return { dividendsUpserted: rows.length, nextExUpdated: nextDivUpdated };
}

// 3) Refresh ALL ETFs worldwide from FMP's /etf-list.
async function refreshEtfs(shard: number, shards: number) {
  type EtfListItem = { symbol: string; name: string };
  const etfList = await fmp<EtfListItem[]>(`/etf-list`).catch(() => [] as EtfListItem[]);
  if (!etfList || etfList.length === 0) return { etfsUpserted: 0 };

  const subset = shardSlice(etfList.filter((e) => e.symbol), shard, shards);
  const nameBySymbol = new Map<string, string>();
  for (const e of subset) nameBySymbol.set(e.symbol, e.name);

  const symbols = subset.map((e) => e.symbol);
  const { updated, errors } = await fetchQuotesAndUpsert(symbols, (sym) => {
    const meta = inferCountry(sym);
    return {
      name: nameBySymbol.get(sym) ?? null,
      is_etf: true,
      is_actively_trading: true,
      country: meta.country,
      currency: meta.currency,
      type: "ETF",
    };
  });

  return { etfsUpserted: updated, etfsAttempted: symbols.length, totalEtfs: etfList.length, errors };
}

// 3a) Refresh recent (last ~7 days) historical prices for ALL active tickers.
//     Uses /historical-price-eod/light?symbol=X. Sharded for the 150s timeout.
async function refreshHistoricalPrices(shard: number, shards: number) {
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  type EodRow = { symbol: string; date: string; price: number; volume?: number };
  const CONCURRENCY = 6;
  let next = 0;
  let inserted = 0;
  const errors: string[] = [];

  const from = new Date();
  from.setDate(from.getDate() - 7);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = new Date().toISOString().slice(0, 10);

  async function worker() {
    const buffer: Array<Record<string, unknown>> = [];
    const flush = async () => {
      if (buffer.length === 0) return;
      const batch = buffer.splice(0);
      const { error } = await sb
        .from("historical_prices_stocks")
        .upsert(batch, { onConflict: "symbol,date" });
      if (error) errors.push(error.message);
      else inserted += batch.length;
    };
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const res = await fetch(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${encodeURIComponent(sym)}&from=${fromIso}&to=${toIso}&apikey=${FMP_API_KEY}`
        );
        if (!res.ok) continue;
        const rows = (await res.json()) as EodRow[];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const r of rows) {
          if (!r.date || r.price == null) continue;
          buffer.push({
            symbol: sym,
            date: r.date,
            close: r.price,
            volume: r.volume != null ? Math.round(r.volume) : null,
          });
        }
        if (buffer.length >= 500) await flush();
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
    await flush();
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return { pricesInserted: inserted, attempted: subset.length, totalSymbols: candidates.length, errors: errors.slice(0, 3) };
}

// 3a-bis) Full historical price backfill — pulls multi-year EOD per symbol.
// Used to seed brand-new ETFs/stocks that have no rows yet. The daily
// `refreshHistoricalPrices` only patches the last 7 days, so symbols added
// after the original seed never accumulate history without this stage.
// `?scope=etfs` restricts to ETFs/funds, `stocks` to non-ETF tickers, default = all.
async function refreshHistoricalPricesFull(shard: number, shards: number, scope = "all", years = 5) {
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    let q = sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .gt("price", 0)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (scope === "etfs") {
      q = q.or("is_etf.eq.true,is_fund.eq.true");
    } else if (scope === "stocks") {
      q = q.eq("is_etf", false).eq("is_fund", false);
    }
    const { data, error } = await q;
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  type EodRow = { symbol?: string; date: string; price: number; volume?: number };
  // Free-tier worker memory caps out around 256MB, and multi-year EOD per ETF
  // can be 1,500 rows × ~80 bytes each. Keep CONCURRENCY=2 and flush often.
  const CONCURRENCY = 2;
  let next = 0;
  let inserted = 0;
  let symbolsProcessed = 0;
  const errors: string[] = [];

  const from = new Date();
  from.setFullYear(from.getFullYear() - years);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = new Date().toISOString().slice(0, 10);

  async function worker() {
    let buffer: Array<Record<string, unknown>> = [];
    const flush = async () => {
      if (buffer.length === 0) return;
      // De-dupe in-batch on (symbol,date)
      const seen = new Set<string>();
      const dedup = [];
      for (const r of buffer) {
        const k = `${r.symbol}|${r.date}`;
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(r);
      }
      buffer = [];
      const { error } = await sb
        .from("historical_prices_stocks")
        .upsert(dedup, { onConflict: "symbol,date" });
      if (error) errors.push(error.message);
      else inserted += dedup.length;
    };
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const res = await fetch(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${encodeURIComponent(sym)}&from=${fromIso}&to=${toIso}&apikey=${FMP_API_KEY}`
        );
        if (!res.ok) { symbolsProcessed++; continue; }
        const rows = (await res.json()) as EodRow[];
        symbolsProcessed++;
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const r of rows) {
          if (!r.date || r.price == null) continue;
          buffer.push({
            symbol: sym,
            date: r.date,
            close: r.price,
            volume: r.volume != null ? Math.round(r.volume) : null,
          });
        }
        // Aggressive flush keeps memory low.
        if (buffer.length >= 500) await flush();
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
    await flush();
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return {
    pricesInserted: inserted,
    symbolsProcessed,
    shardSize: subset.length,
    totalSymbols: candidates.length,
    scope,
    years,
    errors: errors.slice(0, 3),
  };
}

// 3a-c) Refresh income / balance-sheet / cash-flow statements per symbol.
// FMP returns the full reported history; we only keep the most recent 12
// annuals + 24 quarterlies to stay under upsert size limits. The daily cron
// only touches a subset of tickers — this stage walks the long tail so
// every active stock ends up with fresh statements eventually.
async function refreshFinancials(shard: number, shards: number) {
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    // No market-cap floor: include the long tail. FMP returns an empty array
    // for symbols without data (filings, financials), so this is safe — we
    // just skip those at insert time. Lets us cover micro-caps like GMEX
    // (where FMP actually does have income / cash flow statements).
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .eq("is_etf", false)
      .eq("is_fund", false)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  // Maps from FMP camelCase → our snake_case schema columns. We list every
  // column we care about so unknown fields are silently dropped on upsert.
  const INCOME_COLS = [
    "revenue", "cost_of_revenue", "gross_profit", "operating_income", "ebitda",
    "ebit", "net_income", "eps", "eps_diluted", "weighted_average_shs_out",
    "weighted_average_shs_out_dil",
  ];
  const BALANCE_COLS = [
    "cash_and_cash_equivalents", "cash_and_short_term_investments",
    "total_current_assets", "total_non_current_assets", "total_assets",
    "total_current_liabilities", "total_non_current_liabilities", "total_liabilities",
    "short_term_debt", "long_term_debt", "total_debt", "net_debt",
    "total_stockholders_equity", "total_equity",
  ];
  const CASH_FLOW_COLS = [
    "net_cash_provided_by_operating_activities", "net_cash_provided_by_investing_activities",
    "net_cash_provided_by_financing_activities", "operating_cash_flow",
    "capital_expenditure", "free_cash_flow", "common_dividends_paid",
    "net_dividends_paid", "depreciation_and_amortization",
  ];

  // Convert a single FMP statement row into an upsertable record. FMP returns
  // camelCase; we snake_case the field names. Numeric columns get clamped so
  // outliers don't overflow our bigint columns.
  function camelToSnake(s: string): string {
    return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
  }
  function mapStatement(
    row: Record<string, unknown>,
    sym: string,
    period: "FY" | "Q1" | "Q2" | "Q3" | "Q4",
    cols: string[],
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {
      symbol: sym,
      date: row.date,
      reported_currency: row.reportedCurrency ?? null,
      cik: row.cik ?? null,
      filing_date: row.filingDate ?? null,
      accepted_date: row.acceptedDate ?? null,
      fiscal_year: row.fiscalYear ?? row.calendarYear ?? null,
      period,
    };
    for (const col of cols) {
      const camel = col.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
      const v = row[camel];
      if (v !== undefined) out[col] = v;
    }
    return out;
  }

  const CONCURRENCY = 2;
  let next = 0;
  let symbolsProcessed = 0;
  let incomeUpserted = 0;
  let balanceUpserted = 0;
  let cashFlowUpserted = 0;
  const errors: string[] = [];

  async function fetchAndUpsert(sym: string, kind: "income-statement" | "balance-sheet-statement" | "cash-flow-statement") {
    const table =
      kind === "income-statement"
        ? "income_statement"
        : kind === "balance-sheet-statement"
        ? "balance_sheet"
        : "cash_flow";
    const cols =
      kind === "income-statement"
        ? INCOME_COLS
        : kind === "balance-sheet-statement"
        ? BALANCE_COLS
        : CASH_FLOW_COLS;

    let inserted = 0;
    for (const period of ["annual", "quarter"] as const) {
      try {
        const res = await fetch(
          `${FMP_STABLE}/${kind}?symbol=${encodeURIComponent(sym)}&period=${period}&limit=12&apikey=${FMP_API_KEY}`,
        );
        if (!res.ok) continue;
        const rows = (await res.json()) as Record<string, unknown>[];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const tableName = `${table}_${period === "annual" ? "annual" : "quarterly"}`;
        const records = rows.map((r) =>
          mapStatement(
            r,
            sym,
            (period === "annual" ? "FY" : ((r.period as string) ?? "Q1")) as "FY" | "Q1" | "Q2" | "Q3" | "Q4",
            cols,
          ),
        );
        // De-dupe on (symbol,date,period) which is our unique constraint.
        const seen = new Set<string>();
        const dedup = records.filter((r) => {
          const k = `${r.symbol}|${r.date}|${r.period}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        const { error } = await sb
          .from(tableName)
          .upsert(dedup, { onConflict: "symbol,date,period" });
        if (error) errors.push(`${sym}/${tableName}: ${error.message}`);
        else inserted += dedup.length;
      } catch (e) {
        errors.push(`${sym}/${kind}/${period}: ${String(e)}`);
      }
    }
    return inserted;
  }

  async function worker() {
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const [inc, bal, cf] = await Promise.all([
          fetchAndUpsert(sym, "income-statement"),
          fetchAndUpsert(sym, "balance-sheet-statement"),
          fetchAndUpsert(sym, "cash-flow-statement"),
        ]);
        incomeUpserted += inc;
        balanceUpserted += bal;
        cashFlowUpserted += cf;
        symbolsProcessed++;
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return {
    symbolsProcessed,
    incomeUpserted,
    balanceUpserted,
    cashFlowUpserted,
    shardSize: subset.length,
    totalSymbols: candidates.length,
    errors: errors.slice(0, 3),
  };
}

// 3a-b) Backfill historical dividends per symbol via /dividends?symbol=X. The
// daily /dividends-calendar refresh covers everything up to 365 days forward
// but cannot reach years of prior payments. This stage walks candidate symbols
// and upserts the complete history into backend.dividends. FMP simply returns
// an empty array for non-payers so it's safe to include ETFs too.
// `?scope=etfs` restricts to ETFs/funds; default = active stocks with last_div>0.
async function refreshHistoricalDividends(shard: number, shards: number, scope = "stocks") {
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    let q = sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (scope === "etfs") {
      q = q.or("is_etf.eq.true,is_fund.eq.true");
    } else if (scope === "all-stocks") {
      // No last_div filter: include the long tail. FMP returns empty for
      // non-payers so we don't waste upserts.
      q = q.eq("is_etf", false).eq("is_fund", false);
    } else {
      q = q.gt("last_div", 0);
    }
    const { data, error } = await q;
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  type DividendItem = {
    symbol?: string;
    date?: string;
    recordDate?: string;
    paymentDate?: string;
    declarationDate?: string;
    dividend?: number;
    adjDividend?: number;
    yield?: number;
    frequency?: string;
  };

  const CONCURRENCY = 8;
  let next = 0;
  let upserted = 0;
  let symbolsProcessed = 0;
  const errors: string[] = [];

  async function worker() {
    const buffer: Array<Record<string, unknown>> = [];
    const flush = async () => {
      if (buffer.length === 0) return;
      // De-dupe in-batch on (symbol,date) — FMP occasionally returns dupes.
      const seen = new Set<string>();
      const dedup = [];
      for (const r of buffer) {
        const k = `${r.symbol}|${r.date}`;
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(r);
      }
      buffer.length = 0;
      const { error } = await sb.from("dividends").upsert(dedup, { onConflict: "symbol,date" });
      if (error) errors.push(error.message);
      else upserted += dedup.length;
    };
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const res = await fetch(`${FMP_STABLE}/dividends?symbol=${encodeURIComponent(sym)}&apikey=${FMP_API_KEY}`);
        if (!res.ok) continue;
        const rows = (await res.json()) as DividendItem[];
        if (!Array.isArray(rows) || rows.length === 0) {
          symbolsProcessed++;
          continue;
        }
        for (const d of rows) {
          if (!d.date || d.dividend == null) continue;
          buffer.push({
            symbol: sym,
            date: d.date,
            record_date: d.recordDate || null,
            payment_date: d.paymentDate || null,
            declaration_date: d.declarationDate || null,
            dividend: d.dividend,
            adj_dividend: d.adjDividend ?? d.dividend,
            yield: d.yield ?? null,
            frequency: d.frequency ?? null,
            timestamp: new Date().toISOString(),
          });
        }
        symbolsProcessed++;
        if (buffer.length >= 500) await flush();
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
    await flush();
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return {
    dividendsUpserted: upserted,
    symbolsProcessed,
    shardSize: subset.length,
    totalPayers: candidates.length,
    errors: errors.slice(0, 3),
  };
}

// 3b) Enrich ETF metadata: expense ratio, AUM, holdings count, asset class, NAV,
//     inception date, etf company, description. One FMP call per ETF, so sharded
//     to stay under the function timeout.
async function enrichEtfs(shard: number, shards: number) {
  // Candidates = flagged ETFs/funds PLUS unflagged US mutual-fund symbols
  // (5-letter …X like VITSX/VSMPX). Mutual funds are often mis-flagged as plain
  // stocks in the data, so they never got enriched; we pull them in here, fetch
  // FMP /etf/info (which DOES cover mutual funds — expense ratio, AUM, NAV,
  // asset class, sector weights) and reclassify them as is_fund.
  const flagged = new Set<string>();
  const mutualFunds = new Set<string>();
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .or("is_etf.eq.true,is_fund.eq.true")
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) flagged.add(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 50000) break;
  }
  // Unflagged mutual-fund-pattern symbols (…X) not yet classified.
  offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .like("symbol", "%X")
      .eq("is_etf", false)
      .eq("is_fund", false)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) if (/^[A-Z]{4}X$/.test(r.symbol)) mutualFunds.add(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 100000) break;
  }
  const all: string[] = [...flagged, ...mutualFunds];
  const subset = shardSlice(all, shard, shards);

  type EtfInfo = {
    symbol: string;
    name?: string;
    description?: string;
    isin?: string;
    assetClass?: string;
    domicile?: string;
    website?: string;
    etfCompany?: string;
    expenseRatio?: number;
    assetsUnderManagement?: number;
    avgVolume?: number;
    inceptionDate?: string;
    nav?: number;
    navCurrency?: string;
    holdingsCount?: number;
  };

  const CONCURRENCY = 5;
  let next = 0;
  let updated = 0;
  const errors: string[] = [];

  async function worker() {
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const res = await fetch(`${FMP_STABLE}/etf/info?symbol=${encodeURIComponent(sym)}&apikey=${FMP_API_KEY}`);
        if (!res.ok) continue;
        const data = (await res.json()) as EtfInfo[];
        if (!Array.isArray(data) || data.length === 0) continue;
        const info = data[0];
        // If this was an unflagged mutual-fund symbol and FMP returned fund
        // data, reclassify it as a fund so the rest of the app + pipeline treat
        // it correctly (and it stops rendering as a stock).
        const reclassifyAsFund = mutualFunds.has(sym);
        const { error } = await sb
          .from("tickers")
          .update({
            description: info.description ?? null,
            isin: info.isin ?? null,
            asset_class: info.assetClass ?? null,
            website: info.website ?? null,
            etf_company: info.etfCompany ?? null,
            expense_ratio: info.expenseRatio ?? null,
            aum: info.assetsUnderManagement != null ? Math.round(info.assetsUnderManagement) : null,
            average_volume: info.avgVolume != null ? Math.round(info.avgVolume) : null,
            ipo_date: info.inceptionDate ?? null,
            nav: info.nav ?? null,
            holdings_count: info.holdingsCount ?? null,
            ...(reclassifyAsFund ? { is_fund: true } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("symbol", sym);
        if (!error) updated++;
        else errors.push(`${sym}: ${error.message}`);
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return { etfsEnriched: updated, attempted: subset.length, totalEtfs: all.length, errors: errors.slice(0, 3) };
}

// 3c) Ingest ETF holdings + sector weightings.
// FMP returns up to a few thousand holdings per ETF (broad indexers like VTI),
// so we cap at the top 500 by weight. Sharded for the 150s timeout.
async function refreshEtfHoldings(shard: number, shards: number) {
  const all: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .or("is_etf.eq.true,is_fund.eq.true")
      .eq("is_actively_trading", true)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) all.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 50000) break;
  }
  const subset = shardSlice(all, shard, shards);

  type HoldingItem = {
    symbol?: string;
    asset?: string;
    name?: string;
    isin?: string;
    cusip?: string;
    sharesNumber?: number;
    weightPercentage?: number;
    marketValue?: number;
  };
  type SectorItem = { sector?: string; weightPercentage?: number };
  type CountryItem = { country?: string; weightPercentage?: number | string };

  const CONCURRENCY = 3;
  let next = 0;
  let holdingsInserted = 0;
  let sectorsInserted = 0;
  let countriesInserted = 0;
  let symbolsProcessed = 0;
  const errors: string[] = [];

  async function worker() {
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        // Holdings first, then sector weights — two cheap GETs.
        const hres = await fetch(
          `${FMP_STABLE}/etf/holdings?symbol=${encodeURIComponent(sym)}&apikey=${FMP_API_KEY}`
        );
        if (hres.ok) {
          const items = (await hres.json()) as HoldingItem[];
          if (Array.isArray(items) && items.length > 0) {
            // Sort by weight desc, take top 500 to keep payload sane.
            const top = items
              .filter((it) => (it.asset || it.symbol) && (it.weightPercentage ?? 0) > 0)
              .sort((a, b) => (b.weightPercentage ?? 0) - (a.weightPercentage ?? 0))
              .slice(0, 500);
            // Replace previous holdings for this ETF so renames + adds stay tidy.
            await sb.from("etf_holdings").delete().eq("etf_symbol", sym);
            const seen = new Set<string>();
            const rows = top
              .map((it) => ({
                etf_symbol: sym,
                asset: (it.asset || it.symbol || "").toUpperCase(),
                name: it.name ?? null,
                weight_percentage: it.weightPercentage ?? null,
                shares_number: it.sharesNumber != null ? Math.round(it.sharesNumber) : null,
                market_value: it.marketValue ?? null,
                updated_at: new Date().toISOString(),
              }))
              .filter((r) => {
                if (!r.asset || seen.has(r.asset)) return false;
                seen.add(r.asset);
                return true;
              });
            if (rows.length > 0) {
              const { error } = await sb.from("etf_holdings").insert(rows);
              if (!error) holdingsInserted += rows.length;
              else errors.push(`${sym} holdings: ${error.message}`);
            }
          }
        }

        const sres = await fetch(
          `${FMP_STABLE}/etf/sector-weightings?symbol=${encodeURIComponent(sym)}&apikey=${FMP_API_KEY}`
        );
        if (sres.ok) {
          const items = (await sres.json()) as SectorItem[];
          if (Array.isArray(items) && items.length > 0) {
            await sb.from("etf_sector_weightings").delete().eq("etf_symbol", sym);
            const rows = items
              .filter((it) => it.sector)
              .map((it) => ({
                etf_symbol: sym,
                sector: it.sector!,
                weight_percentage: it.weightPercentage ?? null,
                updated_at: new Date().toISOString(),
              }));
            if (rows.length > 0) {
              const { error } = await sb.from("etf_sector_weightings").insert(rows);
              if (!error) sectorsInserted += rows.length;
              else errors.push(`${sym} sectors: ${error.message}`);
            }
          }
        }

        // Country weights — geographic allocation. Same shape as sectors.
        // FMP sometimes returns weightPercentage as a string like "12.34%"
        // instead of a number; coerce defensively.
        const cres = await fetch(
          `${FMP_STABLE}/etf/country-weightings?symbol=${encodeURIComponent(sym)}&apikey=${FMP_API_KEY}`
        );
        if (cres.ok) {
          const items = (await cres.json()) as CountryItem[];
          if (Array.isArray(items) && items.length > 0) {
            await sb.from("etf_country_weightings").delete().eq("etf_symbol", sym);
            const seenCountries = new Set<string>();
            const rows = items
              .filter((it) => it.country)
              .map((it) => {
                const raw = it.weightPercentage;
                let w: number | null = null;
                if (typeof raw === "number") w = isFinite(raw) ? raw : null;
                else if (typeof raw === "string") {
                  const n = parseFloat(raw.replace(/[%,\s]/g, ""));
                  w = isFinite(n) ? n : null;
                }
                return {
                  etf_symbol: sym,
                  country: it.country!,
                  weight_percentage: w,
                  updated_at: new Date().toISOString(),
                };
              })
              .filter((r) => {
                if (seenCountries.has(r.country)) return false;
                seenCountries.add(r.country);
                return true;
              });
            if (rows.length > 0) {
              const { error } = await sb.from("etf_country_weightings").insert(rows);
              if (!error) countriesInserted += rows.length;
              else errors.push(`${sym} countries: ${error.message}`);
            }
          }
        }
        symbolsProcessed++;
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return {
    holdingsInserted,
    sectorsInserted,
    countriesInserted,
    symbolsProcessed,
    shardSize: subset.length,
    totalEtfs: all.length,
    errors: errors.slice(0, 3),
  };
}

// 4) Compute average post-ex-dividend price recovery days for each symbol with
//    dividend history, and cache it on backend.tickers.avg_recovery_days.
//    Heavy: pulls historical_prices_stocks + dividends per symbol. Sharded.
async function refreshRecoveryDays(shard: number, shards: number) {
  // Get all dividend-paying tickers (much faster than paginating dividends).
  // We assume any ticker with last_div > 0 has dividend history we can recover from.
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("tickers")
      .select("symbol")
      .gt("last_div", 0)
      .eq("is_actively_trading", true)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 100000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  // Low concurrency to stay under the Edge Function memory + CPU caps.
  const CONCURRENCY = 3;
  let next = 0;
  let computed = 0;
  const errors: string[] = [];

  async function worker() {
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        // Pull last 6 ex-dates + ~9 months of daily closes (enough to find a
        // recovery within ~90 trading days after each ex-date).
        const [divsRes, pxRes] = await Promise.all([
          sb
            .from("dividends")
            .select("date")
            .eq("symbol", sym)
            .lt("date", new Date().toISOString().slice(0, 10))
            .order("date", { ascending: false })
            .limit(6),
          sb
            .from("historical_prices_stocks")
            .select("date,close")
            .eq("symbol", sym)
            .gte("date", new Date(Date.now() - 1000 * 60 * 60 * 24 * 270).toISOString().slice(0, 10))
            .order("date", { ascending: true })
            .limit(300),
        ]);

        const divs = (divsRes.data as { date: string }[]) ?? [];
        const prices = (pxRes.data as { date: string; close: number }[]) ?? [];
        if (divs.length === 0 || prices.length === 0) continue;

        const recoveries: number[] = [];
        for (const d of divs) {
          const exIdx = prices.findIndex((p) => p.date >= d.date);
          if (exIdx <= 0) continue;
          const preClose = prices[exIdx - 1].close;
          for (let i = exIdx; i < Math.min(prices.length, exIdx + 90); i++) {
            if (prices[i].close >= preClose) {
              recoveries.push(i - exIdx + 1);
              break;
            }
          }
        }
        if (recoveries.length === 0) continue;
        const avg = recoveries.reduce((a, b) => a + b, 0) / recoveries.length;

        const { error } = await sb
          .from("tickers")
          .update({ avg_recovery_days: Math.round(avg * 10) / 10, updated_at: new Date().toISOString() })
          .eq("symbol", sym);
        if (error) {
          errors.push(`${sym}: ${error.message}`);
        } else {
          computed++;
        }
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return { recoveryComputed: computed, attempted: subset.length, totalCandidates: candidates.length, errors: errors.slice(0, 5) };
}

// 5) Refresh latest stock news across ALL companies via /news/stock pagination.
//    Each article already has a symbol attached. We page through until we've
//    pulled `maxPages` × 100 articles or hit an empty page, then de-dupe by URL.
//    500 pages = up to 50,000 articles per refresh, covering thousands of symbols.
async function refreshNews(maxPages = 500) {
  type NewsItem = {
    symbol: string | null;
    publishedDate: string;
    publisher?: string;
    title: string;
    image: string | null;
    site: string;
    text: string;
    url: string;
  };

  const all: NewsItem[] = [];
  for (let page = 0; page < maxPages; page++) {
    try {
      const items = await fmp<NewsItem[]>(`/news/stock?page=${page}&limit=100`);
      if (!Array.isArray(items) || items.length === 0) break;
      all.push(...items);
      if (items.length < 100) break;
    } catch (e) {
      console.error("[refreshNews page]", page, e);
      break;
    }
  }
  if (all.length === 0) return { newsUpserted: 0 };

  // company_news.symbol is NOT NULL — drop any null-symbol items.
  const valid = all.filter((n) => n.symbol && n.url);
  const urls = Array.from(new Set(valid.map((n) => n.url)));
  if (urls.length === 0) return { newsUpserted: 0 };

  // De-dupe against existing URLs (chunk lookup to stay under .in() limits)
  const existingSet = new Set<string>();
  for (let i = 0; i < urls.length; i += 200) {
    const slice = urls.slice(i, i + 200);
    const { data: existing, error: selErr } = await sb
      .from("company_news")
      .select("url")
      .in("url", slice);
    if (selErr) {
      console.error("[refreshNews select]", selErr);
      continue;
    }
    for (const r of (existing as { url: string }[]) ?? []) existingSet.add(r.url);
  }

  const seenUrl = new Set<string>();
  const rows = valid
    .filter((n) => !existingSet.has(n.url!) && !seenUrl.has(n.url!) && (seenUrl.add(n.url!), true))
    .map((n) => ({
      symbol: n.symbol!,
      published_date: n.publishedDate,
      publisher: n.publisher ?? null,
      title: n.title,
      image: n.image,
      site: n.site,
      text: n.text,
      url: n.url,
      source_type: "stock_news",
      created_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return { newsUpserted: 0, skippedDuplicates: valid.length, totalPulled: all.length };

  // Insert in batches of 500
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await sb.from("company_news").insert(batch);
    if (error) {
      console.error("[refreshNews insert batch]", error);
    } else {
      inserted += batch.length;
    }
  }
  return {
    newsUpserted: inserted,
    skippedDuplicates: valid.length - inserted,
    totalPulled: all.length,
  };
}

// 5b) Per-symbol news backfill. The global /news/stock endpoint above is
// chronological and biased toward big-cap US names — small-cap dividend payers
// and most ETFs never surface in it. This stage walks candidate symbols and
// pulls each one's own /news/stock?symbols=X feed.
// `?scope=stocks|etfs|all` (default stocks). Sharded for the 150s timeout.
async function refreshNewsPerSymbol(shard: number, shards: number, scope = "stocks") {
  const candidates: string[] = [];
  let offset = 0;
  while (true) {
    let q = sb
      .from("tickers")
      .select("symbol")
      .eq("is_actively_trading", true)
      .order("symbol", { ascending: true })
      .range(offset, offset + 999);
    if (scope === "stocks") {
      q = q.eq("is_etf", false).eq("is_fund", false);
    } else if (scope === "etfs") {
      q = q.or("is_etf.eq.true,is_fund.eq.true");
    }
    const { data, error } = await q;
    if (error || !data) break;
    const rows = data as { symbol: string }[];
    for (const r of rows) candidates.push(r.symbol);
    if (rows.length < 1000) break;
    offset += 1000;
    if (offset > 200000) break;
  }
  const subset = shardSlice(candidates, shard, shards);

  type NewsItem = {
    symbol?: string | null;
    publishedDate: string;
    publisher?: string;
    title: string;
    image: string | null;
    site: string;
    text: string;
    url: string;
  };

  const CONCURRENCY = 5;
  let next = 0;
  let inserted = 0;
  let symbolsProcessed = 0;
  const errors: string[] = [];

  async function worker() {
    while (next < subset.length) {
      const idx = next++;
      const sym = subset[idx];
      try {
        const res = await fetch(
          `${FMP_STABLE}/news/stock?symbols=${encodeURIComponent(sym)}&limit=20&apikey=${FMP_API_KEY}`
        );
        symbolsProcessed++;
        if (!res.ok) continue;
        const items = (await res.json()) as NewsItem[];
        if (!Array.isArray(items) || items.length === 0) continue;
        // De-dupe by URL within this batch + check the existing set.
        const urls = items.map((n) => n.url).filter(Boolean);
        if (urls.length === 0) continue;
        const { data: existing } = await sb
          .from("company_news")
          .select("url")
          .in("url", urls);
        const existingSet = new Set(((existing as { url: string }[]) ?? []).map((r) => r.url));
        const rows = items
          .filter((n) => n.url && !existingSet.has(n.url))
          .map((n) => ({
            symbol: n.symbol ?? sym,
            published_date: n.publishedDate,
            publisher: n.publisher ?? null,
            title: n.title,
            image: n.image,
            site: n.site,
            text: n.text,
            url: n.url,
            source_type: "stock_news",
            created_at: new Date().toISOString(),
          }));
        if (rows.length === 0) continue;
        const { error } = await sb.from("company_news").insert(rows);
        if (error) errors.push(`${sym}: ${error.message}`);
        else inserted += rows.length;
      } catch (e) {
        errors.push(`${sym}: ${String(e)}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, subset.length) }, () => worker());
  await Promise.all(workers);

  return { newsInserted: inserted, symbolsProcessed, shardSize: subset.length, totalSymbols: candidates.length, scope, errors: errors.slice(0, 3) };
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const url = new URL(req.url);
    const shard = Math.max(0, parseInt(url.searchParams.get("shard") ?? "0", 10) || 0);
    const shards = Math.max(1, parseInt(url.searchParams.get("shards") ?? "1", 10) || 1);
    const stage = url.searchParams.get("stage") ?? "all"; // all|stocks|etfs|dividends|news
    const scope = url.searchParams.get("scope") ?? "stocks"; // historical-dividends|prices-backfill: stocks|etfs|all
    const yearsParam = parseInt(url.searchParams.get("years") ?? "5", 10) || 5;

    const startedAt = Date.now();
    const result: Record<string, unknown> = { ok: true, shard, shards, stage };

    // Run syncStockList FIRST and wait for it before refreshQuotes, so the
    // newly-inserted symbols are visible to the quote refresh in the same run.
    if ((stage === "all" || stage === "stocks") && shard === 0) {
      try {
        result.syncStockList = await syncStockList();
      } catch (e) {
        result.syncStockList = { error: String(e) };
      }
    }

    // Remaining tasks can run in parallel.
    const tasks: Promise<unknown>[] = [];
    const labels: string[] = [];

    if (stage === "all" || stage === "stocks") {
      tasks.push(refreshQuotes(shard, shards));
      labels.push("quotes");
    }
    if (stage === "all" || stage === "etfs") {
      tasks.push(refreshEtfs(shard, shards));
      labels.push("etfs");
    }
    if ((stage === "all" || stage === "dividends") && shard === 0) {
      tasks.push(refreshDividends());
      labels.push("dividends");
    }
    if ((stage === "all" || stage === "news") && shard === 0) {
      tasks.push(refreshNews());
      labels.push("news");
    }
    if (stage === "recovery") {
      // Stand-alone heavy job; never run in `all` mode. Schedule via ?stage=recovery&shards=N.
      tasks.push(refreshRecoveryDays(shard, shards));
      labels.push("recovery");
    }
    if (stage === "etf-detail") {
      // Stand-alone: enriches ETF metadata (expense ratio, AUM, holdings count, etc).
      tasks.push(enrichEtfs(shard, shards));
      labels.push("etfDetail");
    }
    if (stage === "prices") {
      // Stand-alone: refreshes the last 7 days of historical prices for all tickers.
      tasks.push(refreshHistoricalPrices(shard, shards));
      labels.push("prices");
    }
    if (stage === "historical-dividends") {
      // Stand-alone: backfills every active dividend payer's full history.
      // `?scope=etfs` switches the candidate set to ETFs/funds.
      tasks.push(refreshHistoricalDividends(shard, shards, scope));
      labels.push("historicalDividends");
    }
    if (stage === "prices-backfill") {
      // Stand-alone: pulls multi-year EOD per symbol — heavier than `prices`.
      // `?scope=etfs` for ETFs only, `?scope=stocks` for non-ETF tickers,
      // `?years=N` to override the default 5-year window.
      tasks.push(refreshHistoricalPricesFull(shard, shards, scope, yearsParam));
      labels.push("pricesBackfill");
    }
    if (stage === "news-per-symbol") {
      // Stand-alone: pulls per-symbol news for the long tail that the global
      // /news/stock pagination misses. `?scope=stocks|etfs|all` (default stocks).
      tasks.push(refreshNewsPerSymbol(shard, shards, scope));
      labels.push("newsPerSymbol");
    }
    if (stage === "etf-holdings") {
      // Stand-alone: pulls top-500 holdings + sector weights per ETF.
      tasks.push(refreshEtfHoldings(shard, shards));
      labels.push("etfHoldings");
    }
    if (stage === "financials") {
      // Stand-alone: refreshes income / balance / cash-flow statements
      // (annual + quarterly) for every active stock with mkt_cap > $50M.
      tasks.push(refreshFinancials(shard, shards));
      labels.push("financials");
    }

    const settled = await Promise.allSettled(tasks);
    settled.forEach((s, i) => {
      result[labels[i]] = s.status === "fulfilled" ? s.value : { error: String(s.reason) };
    });
    result.ms = Date.now() - startedAt;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Candidate selection for each X publishing flow.
//
// Self-contained: creates its own Supabase admin client so the CLI works
// without Next-only `server-only` imports. The trade-off is some query
// duplication vs src/lib/data.ts, but it keeps the bot's surface area
// small and audit-friendly. Schemas referenced ("backend") and column
// names match data.ts so changes stay coherent.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  FeaturedStockInput,
  ExDivWatchRow,
  PayoutChangeInput,
  FeaturedEtfInput,
  WeeklyHikeRow,
} from "./compose";

type Schema = "backend" | "public";

function admin(schema: Schema = "backend"): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "X bot needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema } as { schema: "public" },
  });
}

// ---------------------------------------------------------------------------
// Dedup helper — every flow uses this to avoid re-featuring the same symbol.
// ---------------------------------------------------------------------------

async function recentlyPostedSymbols(
  flow: string,
  withinDays: number,
): Promise<Set<string>> {
  const sb = admin("public");
  const cutoff = new Date(Date.now() - withinDays * 86400 * 1000).toISOString();
  const { data } = await sb
    .from("posted_tweets")
    .select("symbol")
    .eq("flow", flow)
    .gte("posted_at", cutoff)
    .not("symbol", "is", null);
  const set = new Set<string>();
  for (const r of (data as { symbol: string | null }[] | null) ?? []) {
    if (r.symbol) set.add(r.symbol);
  }
  return set;
}

// ---------------------------------------------------------------------------
// Streak derivation (consecutive years of increasing annual dividend total).
// Mirrors the logic in data.ts:enrichDividendHistory so on-feed numbers
// match what the website shows on stock pages.
// ---------------------------------------------------------------------------

async function consecutiveIncreaseYears(symbol: string): Promise<number | null> {
  const sb = admin("backend");
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 60);
  const { data } = await sb
    .from("dividends")
    .select("date,dividend")
    .eq("symbol", symbol)
    .gte("date", cutoff.toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .limit(400);
  const rows = (data as { date: string; dividend: number }[]) ?? [];
  if (rows.length < 4) return null;
  const byYear = new Map<number, number>();
  for (const r of rows) {
    const y = parseInt(r.date.slice(0, 4), 10);
    if (!isFinite(y)) continue;
    byYear.set(y, (byYear.get(y) ?? 0) + Number(r.dividend));
  }
  const thisYear = new Date().getFullYear();
  const completed = Array.from(byYear.entries())
    .filter(([y]) => y < thisYear)
    .sort((a, b) => a[0] - b[0]);
  if (completed.length < 2) return null;
  let streak = 0;
  for (let i = completed.length - 1; i > 0; i--) {
    if (completed[i][1] > completed[i - 1][1]) streak++;
    else break;
  }
  return streak > 0 ? streak : null;
}

// ---------------------------------------------------------------------------
// Latest payout ratio (annual, percent). Pulled from ratios_annual; null if
// missing. Composer suppresses for REITs regardless.
// ---------------------------------------------------------------------------

async function latestPayoutRatioPct(symbol: string): Promise<number | null> {
  const sb = admin("backend");
  const { data } = await sb
    .from("ratios_annual")
    .select("payout_ratio,date")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { payout_ratio: number | null } | null;
  if (!row || row.payout_ratio == null) return null;
  // Supabase stores payout_ratio as a fraction (0.14) or a percent (14.0)
  // depending on the source. Heuristic: anything <= 5 we treat as fraction.
  const v = Number(row.payout_ratio);
  if (!isFinite(v) || v < 0) return null;
  return v <= 5 ? v * 100 : v;
}

// ---------------------------------------------------------------------------
// Build the full FeaturedStockInput for a single symbol.
// ---------------------------------------------------------------------------

type TickerSnapshot = {
  symbol: string;
  name: string | null;
  price: number | null;
  last_div: number | null;
  next_ex_dividend_date: string | null;
  avg_recovery_days: number | null;
  industry: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
  is_actively_trading: boolean | null;
  mkt_cap: number | null;
  expense_ratio: number | null;
  aum: number | null;
};

async function fetchTicker(symbol: string): Promise<TickerSnapshot | null> {
  const sb = admin("backend");
  const { data } = await sb
    .from("tickers")
    .select(
      "symbol,name,price,last_div,next_ex_dividend_date,avg_recovery_days,industry,is_etf,is_fund,is_actively_trading,mkt_cap,expense_ratio,aum",
    )
    .eq("symbol", symbol)
    .maybeSingle();
  return (data as TickerSnapshot | null) ?? null;
}

function computeYieldPct(t: TickerSnapshot): number | null {
  if (t.last_div == null || t.price == null || t.price <= 0) return null;
  return (Number(t.last_div) / Number(t.price)) * 100;
}

function isReit(t: TickerSnapshot): boolean {
  return !!t.industry && /reit/i.test(t.industry);
}

export async function buildFeaturedStockInput(
  symbol: string,
): Promise<FeaturedStockInput | null> {
  const t = await fetchTicker(symbol);
  if (!t) return null;
  const [streak, payout] = await Promise.all([
    consecutiveIncreaseYears(symbol),
    latestPayoutRatioPct(symbol),
  ]);
  return {
    symbol,
    name: t.name,
    yieldPct: computeYieldPct(t),
    streakYears: streak,
    payoutRatioPct: payout,
    nextExDate: t.next_ex_dividend_date,
    recoveryDays: t.avg_recovery_days != null ? Number(t.avg_recovery_days) : null,
    isReit: isReit(t),
  };
}

// ---------------------------------------------------------------------------
// Flow: featured-stock
// Pick the top-rated active stock not posted in the last 30 days, with a
// near-future ex-div date so the post is timely.
// ---------------------------------------------------------------------------

export async function pickFeaturedStock(): Promise<FeaturedStockInput | null> {
  const sb = admin("backend");
  const skip = await recentlyPostedSymbols("featured-stock", 30);

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 60 * 86400 * 1000).toISOString().slice(0, 10);

  // First pass: high-quality stocks with an upcoming ex-div.
  const { data: ratings } = await sb
    .from("stock_ratings_daily")
    .select("symbol,overall_rating,computed_date")
    .gte("overall_rating", 4)
    .order("computed_date", { ascending: false })
    .order("overall_rating", { ascending: false })
    .limit(200);

  const ratingRows = (ratings as { symbol: string; overall_rating: number }[]) ?? [];
  if (ratingRows.length === 0) return null;

  // Dedup by symbol keeping best rating
  const seen = new Map<string, number>();
  for (const r of ratingRows) {
    if (!seen.has(r.symbol)) seen.set(r.symbol, r.overall_rating);
  }
  const symbols = Array.from(seen.keys()).filter((s) => !skip.has(s));

  // Get tickers + filter by upcoming ex-div + mkt cap
  const { data: tk } = await sb
    .from("tickers")
    .select("symbol,mkt_cap,next_ex_dividend_date,is_actively_trading,is_etf,is_fund")
    .in("symbol", symbols.slice(0, 100))
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("is_fund", false)
    .gt("mkt_cap", 1_000_000_000)
    .gte("next_ex_dividend_date", today)
    .lte("next_ex_dividend_date", horizon)
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(20);

  const candidates = (tk as { symbol: string }[]) ?? [];
  if (candidates.length === 0) return null;

  return buildFeaturedStockInput(candidates[0].symbol);
}

// ---------------------------------------------------------------------------
// Flow: featured-etf
// ---------------------------------------------------------------------------

export async function pickFeaturedEtf(): Promise<FeaturedEtfInput | null> {
  const sb = admin("backend");
  const skip = await recentlyPostedSymbols("featured-etf", 30);
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 60 * 86400 * 1000).toISOString().slice(0, 10);

  const { data } = await sb
    .from("tickers")
    .select(
      "symbol,name,aum,expense_ratio,last_div,price,next_ex_dividend_date",
    )
    .eq("is_etf", true)
    .eq("is_actively_trading", true)
    .gt("aum", 500_000_000)
    .gte("next_ex_dividend_date", today)
    .lte("next_ex_dividend_date", horizon)
    .order("aum", { ascending: false, nullsFirst: false })
    .limit(50);

  type Row = {
    symbol: string;
    name: string | null;
    aum: number | null;
    expense_ratio: number | null;
    last_div: number | null;
    price: number | null;
    next_ex_dividend_date: string | null;
  };
  const rows = ((data as Row[]) ?? []).filter((r) => !skip.has(r.symbol));
  if (rows.length === 0) return null;
  const pick = rows[0];

  // Top holding (highest weight). etf_holdings rows live in backend schema.
  const { data: holdings } = await sb
    .from("etf_holdings")
    .select("asset,weight_percentage")
    .eq("etf_symbol", pick.symbol)
    .order("weight_percentage", { ascending: false, nullsFirst: false })
    .limit(1);
  const top = (holdings as { asset: string; weight_percentage: number | null }[]) ?? [];

  // 30-day SEC yield: approximate as trailing 12 months of distributions /
  // current price. SEC yield is a regulated calc; we surface a proxy and
  // call it that in the composer. If we ever add a sec_yield_30d column to
  // tickers, swap here.
  const yieldPct =
    pick.last_div != null && pick.price && pick.price > 0
      ? (Number(pick.last_div) / Number(pick.price)) * 100
      : null;

  return {
    symbol: pick.symbol,
    name: pick.name,
    secYield30dPct: yieldPct,
    expenseRatioPct: pick.expense_ratio != null ? Number(pick.expense_ratio) : null,
    aumUsd: pick.aum != null ? Number(pick.aum) : null,
    topHoldingSymbol: top[0]?.asset ?? null,
    nextExDate: pick.next_ex_dividend_date,
  };
}

// ---------------------------------------------------------------------------
// Flow: ex-div-watch
// Top 3 notable ex-div names in the next 5 days. Dedup by 7 days only —
// the calendar churns weekly, so longer windows starve the post.
// ---------------------------------------------------------------------------

export async function pickExDivWatchRows(): Promise<ExDivWatchRow[]> {
  const sb = admin("backend");
  const skip = await recentlyPostedSymbols("ex-div-watch", 7);
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 5 * 86400 * 1000).toISOString().slice(0, 10);

  const { data } = await sb
    .from("tickers")
    .select("symbol,price,last_div,next_ex_dividend_date,mkt_cap")
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("is_fund", false)
    .gt("mkt_cap", 5_000_000_000)
    .gte("next_ex_dividend_date", today)
    .lte("next_ex_dividend_date", horizon)
    .order("next_ex_dividend_date", { ascending: true })
    .limit(40);

  type Row = {
    symbol: string;
    price: number | null;
    last_div: number | null;
    next_ex_dividend_date: string;
    mkt_cap: number | null;
  };

  const rows = ((data as Row[]) ?? [])
    .filter((r) => !skip.has(r.symbol))
    .map((r) => ({
      symbol: r.symbol,
      exDate: r.next_ex_dividend_date,
      yieldPct:
        r.last_div != null && r.price && r.price > 0
          ? (Number(r.last_div) / Number(r.price)) * 100
          : null,
      mkt_cap: r.mkt_cap,
    }));

  // Take up to 3 unique symbols. Already sorted by ex-date asc, but break
  // ex-date ties by mkt_cap desc within each date group.
  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byDate.get(r.exDate) ?? [];
    arr.push(r);
    byDate.set(r.exDate, arr);
  }
  const picked: ExDivWatchRow[] = [];
  for (const date of Array.from(byDate.keys()).sort()) {
    const inDate = (byDate.get(date) ?? []).sort(
      (a, b) => (b.mkt_cap ?? 0) - (a.mkt_cap ?? 0),
    );
    for (const r of inDate) {
      picked.push({ symbol: r.symbol, exDate: r.exDate, yieldPct: r.yieldPct });
      if (picked.length === 3) return picked;
    }
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Flow: payout-change (reactive)
// Detects a fresh dividend declaration in the last `lookbackHours` and
// compares against the prior payment to classify increasing / decreasing /
// initiating / suspending / special.
// ---------------------------------------------------------------------------

export async function pickRecentPayoutChange(
  lookbackHours = 14,
): Promise<PayoutChangeInput | null> {
  const sb = admin("backend");
  const cutoff = new Date(Date.now() - lookbackHours * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  // Pull recent declarations.
  const { data: recent } = await sb
    .from("dividends")
    .select("symbol,date,declaration_date,dividend,frequency")
    .gte("declaration_date", cutoff)
    .order("declaration_date", { ascending: false })
    .limit(200);

  type Row = {
    symbol: string;
    date: string;
    declaration_date: string | null;
    dividend: number;
    frequency: string | null;
  };
  const rows = (recent as Row[]) ?? [];
  if (rows.length === 0) return null;

  const skip = await recentlyPostedSymbols("payout-change", 7);

  // For each candidate, pull mkt_cap and the previous (regular) dividend.
  const symbols = Array.from(new Set(rows.map((r) => r.symbol))).filter(
    (s) => !skip.has(s),
  );
  if (symbols.length === 0) return null;

  const { data: tickers } = await sb
    .from("tickers")
    .select("symbol,mkt_cap")
    .in("symbol", symbols);
  const mktCapBySymbol = new Map<string, number>();
  for (const t of (tickers as { symbol: string; mkt_cap: number | null }[]) ?? []) {
    if (t.mkt_cap != null) mktCapBySymbol.set(t.symbol, Number(t.mkt_cap));
  }

  // Pull last 6 dividends per symbol so we can find the previous regular.
  const { data: history } = await sb
    .from("dividends")
    .select("symbol,date,dividend,frequency")
    .in("symbol", symbols)
    .order("date", { ascending: false })
    .limit(symbols.length * 8);
  const historyBySymbol = new Map<string, Row[]>();
  for (const r of (history as Row[]) ?? []) {
    const arr = historyBySymbol.get(r.symbol) ?? [];
    arr.push(r);
    historyBySymbol.set(r.symbol, arr);
  }

  type Candidate = PayoutChangeInput & { mktCap: number; prio: number };
  const candidates: Candidate[] = [];

  for (const r of rows) {
    if (!symbols.includes(r.symbol)) continue;
    const mktCap = mktCapBySymbol.get(r.symbol) ?? 0;
    const hist = (historyBySymbol.get(r.symbol) ?? []).filter(
      (h) => (h.frequency ?? "").toLowerCase() !== "special",
    );
    const isSpecial = (r.frequency ?? "").toLowerCase() === "special";
    const newAmount = Number(r.dividend);

    if (isSpecial) {
      candidates.push({
        symbol: r.symbol,
        kind: "special",
        newAmount,
        prevAmount: null,
        exDate: r.date,
        streakYearsAfter: null,
        mktCap,
        prio: 3,
      });
      continue;
    }

    if (hist.length === 0 || newAmount <= 0) continue;

    // Most recent regular payment that's NOT the row itself.
    const prior = hist.find((h) => h.date !== r.date);
    const prevAmount = prior ? Number(prior.dividend) : null;

    if (!prior) {
      // No prior regular history => initiating.
      candidates.push({
        symbol: r.symbol,
        kind: "initiating",
        newAmount,
        prevAmount: null,
        exDate: r.date,
        streakYearsAfter: null,
        mktCap,
        prio: 2,
      });
      continue;
    }

    if (prevAmount! > 0 && newAmount > prevAmount! * 1.005) {
      candidates.push({
        symbol: r.symbol,
        kind: "increasing",
        newAmount,
        prevAmount,
        exDate: r.date,
        streakYearsAfter: null, // filled in below for the chosen winner
        mktCap,
        prio: 1,
      });
    } else if (prevAmount! > 0 && newAmount < prevAmount! * 0.995 && mktCap > 10_000_000_000) {
      candidates.push({
        symbol: r.symbol,
        kind: "decreasing",
        newAmount,
        prevAmount,
        exDate: r.date,
        streakYearsAfter: null,
        mktCap,
        prio: 5,
      });
    } else if (newAmount === 0 && prevAmount! > 0 && mktCap > 10_000_000_000) {
      candidates.push({
        symbol: r.symbol,
        kind: "suspending",
        newAmount: 0,
        prevAmount,
        exDate: r.date,
        streakYearsAfter: null,
        mktCap,
        prio: 4,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.prio - b.prio || b.mktCap - a.mktCap);
  const winner = candidates[0];

  // Streak only matters for increasing.
  if (winner.kind === "increasing") {
    winner.streakYearsAfter = await consecutiveIncreaseYears(winner.symbol);
  }

  const { mktCap: _m, prio: _p, ...payload } = winner;
  return payload;
}

// ---------------------------------------------------------------------------
// Flows: weekly-hikes / weekly-cuts
// Look back 7 days of declarations, classify, return top 5 by mkt_cap.
// ---------------------------------------------------------------------------

async function weeklyPayoutMoves(
  direction: "up" | "down",
): Promise<WeeklyHikeRow[]> {
  const sb = admin("backend");
  const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);

  const { data: recent } = await sb
    .from("dividends")
    .select("symbol,date,dividend,frequency")
    .gte("declaration_date", cutoff)
    .order("date", { ascending: false })
    .limit(2000);

  type Row = { symbol: string; date: string; dividend: number; frequency: string | null };
  const rows = (recent as Row[]) ?? [];
  if (rows.length === 0) return [];

  const symbols = Array.from(new Set(rows.map((r) => r.symbol)));
  const { data: tickers } = await sb
    .from("tickers")
    .select("symbol,mkt_cap")
    .in("symbol", symbols);
  const mktCap = new Map<string, number>();
  for (const t of (tickers as { symbol: string; mkt_cap: number | null }[]) ?? []) {
    if (t.mkt_cap != null) mktCap.set(t.symbol, Number(t.mkt_cap));
  }

  // Fetch history for change comparison
  const { data: history } = await sb
    .from("dividends")
    .select("symbol,date,dividend,frequency")
    .in("symbol", symbols)
    .order("date", { ascending: false })
    .limit(symbols.length * 6);
  const historyBy = new Map<string, Row[]>();
  for (const r of (history as Row[]) ?? []) {
    if ((r.frequency ?? "").toLowerCase() === "special") continue;
    const arr = historyBy.get(r.symbol) ?? [];
    arr.push(r);
    historyBy.set(r.symbol, arr);
  }

  const out: (WeeklyHikeRow & { mktCap: number })[] = [];
  const seenSym = new Set<string>();
  for (const r of rows) {
    if (seenSym.has(r.symbol)) continue;
    if ((r.frequency ?? "").toLowerCase() === "special") continue;
    const hist = historyBy.get(r.symbol) ?? [];
    const prior = hist.find((h) => h.date < r.date);
    if (!prior) continue;
    const newAmount = Number(r.dividend);
    const prevAmount = Number(prior.dividend);
    if (newAmount <= 0 || prevAmount <= 0) continue;
    if (direction === "up" && newAmount <= prevAmount * 1.005) continue;
    if (direction === "down" && newAmount >= prevAmount * 0.995) continue;
    out.push({
      symbol: r.symbol,
      newAmount,
      prevAmount,
      streakYearsAfter: null,
      mktCap: mktCap.get(r.symbol) ?? 0,
    });
    seenSym.add(r.symbol);
  }

  out.sort((a, b) => b.mktCap - a.mktCap);
  const top = out.slice(0, 5);

  if (direction === "up") {
    // Fill in streak for hikes (cuts don't need it in the template).
    await Promise.all(
      top.map(async (row) => {
        row.streakYearsAfter = await consecutiveIncreaseYears(row.symbol);
      }),
    );
  }

  return top.map(({ mktCap: _m, ...rest }) => rest);
}

export function pickWeeklyHikes(): Promise<WeeklyHikeRow[]> {
  return weeklyPayoutMoves("up");
}

export function pickWeeklyCuts(): Promise<WeeklyHikeRow[]> {
  return weeklyPayoutMoves("down");
}

// ---------------------------------------------------------------------------
// Logging — every successful post must call this so dedup works.
// ---------------------------------------------------------------------------

export type PostedTweetRow = {
  flow: string;
  symbol: string | null;
  source_tweet_id?: string | null;
  tweet_id: string;
  body: string;
  thread_tweet_ids?: string[] | null;
};

export async function logPostedTweet(row: PostedTweetRow): Promise<void> {
  const sb = admin("public");
  const { error } = await sb.from("posted_tweets").insert({
    flow: row.flow,
    symbol: row.symbol,
    source_tweet_id: row.source_tweet_id ?? null,
    tweet_id: row.tweet_id,
    body: row.body,
    thread_tweet_ids: row.thread_tweet_ids ?? null,
  });
  if (error) {
    throw new Error(`Failed to log posted_tweets row: ${error.message}`);
  }
}

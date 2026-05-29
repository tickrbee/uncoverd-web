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

// US + EU coverage. The bot's audience is dividend investors in those
// markets; Asian and other foreign listings get filtered out because
// they look spammy on the feed (.JK, .HK, .L etc tickers nobody clicks).
// EU list mirrors EU_COUNTRY_CODES in src/lib/data.ts.
const TARGET_COUNTRIES = [
  "US",
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

// Primary exchanges per country. Without this map, a US stock like McDonald's
// dual-listed on XETRA (as $MDO.DE) sneaks in: it has country=US and XETRA
// is a primary EU exchange. We require BOTH country AND exchange to match —
// XETRA only counts when country=DE.
const PRIMARY_EXCHANGES_BY_COUNTRY: Record<string, string[]> = {
  US: ["NYSE", "NASDAQ", "AMEX", "NYSEArca", "BATS", "NYSE American", "NASDAQ Global Select"],
  DE: ["XETRA", "FSX"],
  FR: ["PAR"],
  NL: ["AMS"],
  SE: ["STO"],
  IT: ["MIL"],
  ES: ["BME"],
  DK: ["CPH"],
  PL: ["WSE"],
  FI: ["HEL"],
  BE: ["BRU"],
  IE: ["DUB"],
  GR: ["ATH"],
  AT: ["VIE"],
  PT: ["LIS"],
  HU: ["BUD"],
  CZ: ["PRG"],
  RO: ["BUC"],
  LV: ["RGA"],
  EE: ["TAL"],
  LT: ["VLN"],
  BG: ["BVL"],
  SI: ["LJU"],
};

// Flattened list — used in the initial Supabase query as a coarse filter.
// The JS-side `matchesPrimaryListing` does the strict country+exchange match.
const PRIMARY_EXCHANGES = Array.from(
  new Set(Object.values(PRIMARY_EXCHANGES_BY_COUNTRY).flat()),
);

function matchesPrimaryListing(
  country: string | null | undefined,
  exchange: string | null | undefined,
): boolean {
  if (!country) return false;
  const allowed = PRIMARY_EXCHANGES_BY_COUNTRY[country];
  if (!allowed) return false;
  // Allow null exchange when country = US (data has ~30 US payers with null
  // exchange_short — they're legit US tickers, just missing the column).
  if (!exchange) return country === "US";
  return allowed.includes(exchange);
}

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

  // Strategy: tickers-first, ratings-second. The earlier version pulled the
  // top 500 globally-rated stocks then filtered to US/EU — but the top of the
  // composite_total leaderboard is dominated by Asian micro-caps, so US/EU
  // candidates like PHM/NVDA were eliminated before the filter ran. Instead,
  // get all US/EU candidates with an upcoming ex-div first, then rank by
  // rating freshly looked up per symbol.
  const { data: tk } = await sb
    .from("tickers")
    .select("symbol,country,exchange_short,mkt_cap,next_ex_dividend_date")
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("is_fund", false)
    .in("country", TARGET_COUNTRIES)
    .in("exchange_short", PRIMARY_EXCHANGES)
    // $5B floor for featured-stock — smaller than ex-div-watch ($10B) because
    // featured posts include more context (streak, payout, recovery) that
    // helps mid-caps land. Anything below $5B becomes feed noise.
    .gt("mkt_cap", 5_000_000_000)
    .gte("next_ex_dividend_date", today)
    .lte("next_ex_dividend_date", horizon)
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(400);

  type TkRow = {
    symbol: string;
    country: string | null;
    exchange_short: string | null;
    mkt_cap: number | null;
  };
  const tickers = ((tk as TkRow[]) ?? [])
    .filter((r) => matchesPrimaryListing(r.country, r.exchange_short))
    .filter((r) => !skip.has(r.symbol));
  if (tickers.length === 0) return null;

  // Pull recent ratings for just these symbols.
  const cutoffDate = new Date(Date.now() - 14 * 86400 * 1000).toISOString().slice(0, 10);
  const { data: ratings } = await sb
    .from("stock_ratings_daily")
    .select("symbol,composite_total,computed_date")
    .in("symbol", tickers.map((t) => t.symbol))
    .gte("computed_date", cutoffDate)
    .order("computed_date", { ascending: false });
  const bestRating = new Map<string, number>();
  for (const r of (ratings as { symbol: string; composite_total: number }[]) ?? []) {
    if (!bestRating.has(r.symbol)) bestRating.set(r.symbol, r.composite_total);
  }

  // Rank by rating desc, then mkt_cap desc as tiebreaker. Require rating >= 17
  // (B+ or better) — below that the bot is just amplifying mediocre payers.
  const ranked = tickers
    .map((t) => ({ symbol: t.symbol, mkt_cap: t.mkt_cap, rating: bestRating.get(t.symbol) ?? -1 }))
    .filter((t) => t.rating >= 17)
    .sort((a, b) => b.rating - a.rating || (b.mkt_cap ?? 0) - (a.mkt_cap ?? 0));

  if (ranked.length === 0) return null;
  return buildFeaturedStockInput(ranked[0].symbol);
}

// ---------------------------------------------------------------------------
// Flow: featured-etf
// ---------------------------------------------------------------------------

export async function pickFeaturedEtf(): Promise<FeaturedEtfInput | null> {
  const sb = admin("backend");
  const skip = await recentlyPostedSymbols("featured-etf", 30);

  // Two ETF data quirks in backend.tickers:
  //  1. exchange_short is NULL for most US ETFs (SCHD, VYM, JEPI, DGRO...).
  //     We can't .in("exchange_short", PRIMARY_EXCHANGES) — would drop all
  //     of them. matchesPrimaryListing handles null + country='US' correctly.
  //  2. next_ex_dividend_date is NULL for ETFs in this data set, so we can't
  //     time the post to an upcoming ex-div. We drop that filter and just
  //     pick the largest unposted ETF in target countries.
  const { data } = await sb
    .from("tickers")
    .select(
      "symbol,name,country,exchange_short,aum,expense_ratio,last_div,price,next_ex_dividend_date",
    )
    .eq("is_etf", true)
    .eq("is_actively_trading", true)
    .in("country", TARGET_COUNTRIES)
    .gt("aum", 500_000_000)
    .order("aum", { ascending: false, nullsFirst: false })
    .limit(200);

  type Row = {
    symbol: string;
    name: string | null;
    country: string | null;
    exchange_short: string | null;
    aum: number | null;
    expense_ratio: number | null;
    last_div: number | null;
    price: number | null;
    next_ex_dividend_date: string | null;
  };
  const rows = ((data as Row[]) ?? [])
    .filter((r) => matchesPrimaryListing(r.country, r.exchange_short))
    .filter((r) => !skip.has(r.symbol));
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

  // ETF yield: TTM (trailing 12 months) sum of distributions / current price.
  // `tickers.last_div` is NULL for most US ETFs, so we sum the dividends
  // table directly. This is a proxy for SEC 30-day yield — close enough for
  // a snapshot tweet, not the regulated calc.
  let ttmDistribution: number | null = null;
  if (pick.price != null && Number(pick.price) > 0) {
    const cutoff = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);
    const { data: divs } = await sb
      .from("dividends")
      .select("dividend,date")
      .eq("symbol", pick.symbol)
      .gte("date", cutoff)
      .order("date", { ascending: false })
      .limit(15);
    const rows = (divs as { dividend: number }[]) ?? [];
    if (rows.length > 0) {
      ttmDistribution = rows.reduce((s, r) => s + Number(r.dividend || 0), 0);
    }
  }
  const yieldPct =
    ttmDistribution != null && pick.price && Number(pick.price) > 0
      ? (ttmDistribution / Number(pick.price)) * 100
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
    .select("symbol,name,country,exchange_short,price,last_div,next_ex_dividend_date,mkt_cap")
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("is_fund", false)
    .in("country", TARGET_COUNTRIES)
    .in("exchange_short", PRIMARY_EXCHANGES)
    // $10B floor — cuts ultra micro-caps that nobody recognizes and would
    // make the feed look like discount-bin spam. Drops Budimex-tier names
    // ($17B is borderline but they pass; below $10B is the noise floor).
    .gt("mkt_cap", 10_000_000_000)
    .gte("next_ex_dividend_date", today)
    .lte("next_ex_dividend_date", horizon)
    .order("next_ex_dividend_date", { ascending: true })
    .limit(80);

  type Row = {
    symbol: string;
    name: string | null;
    country: string | null;
    exchange_short: string | null;
    price: number | null;
    last_div: number | null;
    next_ex_dividend_date: string;
    mkt_cap: number | null;
  };

  const rows = ((data as Row[]) ?? [])
    // Strict country+exchange match — kills dual-listings like McDonald's
    // (country=US) showing up on XETRA as $MDO.DE.
    .filter((r) => matchesPrimaryListing(r.country, r.exchange_short))
    .filter((r) => !skip.has(r.symbol))
    .map((r) => ({
      symbol: r.symbol,
      name: r.name,
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
      picked.push({ symbol: r.symbol, name: r.name, exDate: r.exDate, yieldPct: r.yieldPct });
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
    .select("symbol,mkt_cap,country")
    .in("symbol", symbols)
    .in("country", TARGET_COUNTRIES)
    .in("exchange_short", PRIMARY_EXCHANGES);
  const mktCapBySymbol = new Map<string, number>();
  const usSymbols = new Set<string>();
  for (const t of (tickers as { symbol: string; mkt_cap: number | null; country: string | null }[]) ?? []) {
    usSymbols.add(t.symbol);
    if (t.mkt_cap != null) mktCapBySymbol.set(t.symbol, Number(t.mkt_cap));
  }
  // Drop non-US symbols from further consideration.
  const usOnlySymbols = symbols.filter((s) => usSymbols.has(s));
  if (usOnlySymbols.length === 0) return null;

  // Pull last 6 dividends per symbol so we can find the previous regular.
  const { data: history } = await sb
    .from("dividends")
    .select("symbol,date,dividend,frequency")
    .in("symbol", usOnlySymbols)
    .order("date", { ascending: false })
    .limit(usOnlySymbols.length * 8);
  const historyBySymbol = new Map<string, Row[]>();
  for (const r of (history as Row[]) ?? []) {
    const arr = historyBySymbol.get(r.symbol) ?? [];
    arr.push(r);
    historyBySymbol.set(r.symbol, arr);
  }

  type Candidate = PayoutChangeInput & { mktCap: number; prio: number };
  const candidates: Candidate[] = [];

  for (const r of rows) {
    if (!usOnlySymbols.includes(r.symbol)) continue;
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
  // Pull country + exchange + is_etf + is_fund so we can filter to US+EU
  // primary listings only. Without this, Canadian banks (RY, BMO) and ETF
  // micro-distribution adjustments swamp the candidates.
  const { data: tickers } = await sb
    .from("tickers")
    .select("symbol,mkt_cap,country,exchange_short,is_etf,is_fund")
    .in("symbol", symbols);
  type TkRow = {
    symbol: string;
    mkt_cap: number | null;
    country: string | null;
    exchange_short: string | null;
    is_etf: boolean | null;
    is_fund: boolean | null;
  };
  const tkBySymbol = new Map<string, TkRow>();
  for (const t of (tickers as TkRow[]) ?? []) tkBySymbol.set(t.symbol, t);

  // Allowed symbols: US+EU primary stock listings, not ETFs/funds, and a
  // floor on mkt_cap so we don't post micro-cap noise nobody recognizes.
  const minMktCap = direction === "down" ? 10_000_000_000 : 5_000_000_000;
  const allowed = new Set<string>();
  for (const sym of symbols) {
    const t = tkBySymbol.get(sym);
    if (!t) continue;
    if (t.is_etf || t.is_fund) continue;
    if ((t.mkt_cap ?? 0) < minMktCap) continue;
    if (!matchesPrimaryListing(t.country, t.exchange_short)) continue;
    allowed.add(sym);
  }
  if (allowed.size === 0) return [];

  // Fetch history for change comparison — only for allowed symbols.
  const { data: history } = await sb
    .from("dividends")
    .select("symbol,date,dividend,frequency")
    .in("symbol", Array.from(allowed))
    .order("date", { ascending: false })
    .limit(allowed.size * 6);
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
    if (!allowed.has(r.symbol)) continue;
    if (seenSym.has(r.symbol)) continue;
    if ((r.frequency ?? "").toLowerCase() === "special") continue;
    const hist = historyBy.get(r.symbol) ?? [];
    const prior = hist.find((h) => h.date < r.date);
    if (!prior) continue;
    const newAmount = Number(r.dividend);
    const prevAmount = Number(prior.dividend);
    if (newAmount <= 0 || prevAmount <= 0) continue;
    // Require a meaningful absolute dividend so $0.04 -> $0.05 noise doesn't
    // qualify (those are usually ETF distribution adjustments, not real
    // corporate news).
    if (newAmount < 0.10 || prevAmount < 0.10) continue;
    // Require a real % move — 5% threshold filters out rounding noise.
    if (direction === "up" && newAmount <= prevAmount * 1.05) continue;
    if (direction === "down" && newAmount >= prevAmount * 0.95) continue;
    out.push({
      symbol: r.symbol,
      newAmount,
      prevAmount,
      streakYearsAfter: null,
      mktCap: tkBySymbol.get(r.symbol)?.mkt_cap ?? 0,
    });
    seenSym.add(r.symbol);
  }

  out.sort((a, b) => b.mktCap - a.mktCap);
  const top = out.slice(0, 4);

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

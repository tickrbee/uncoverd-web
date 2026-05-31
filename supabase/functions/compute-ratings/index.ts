import "jsr:@supabase/functions-js/edge-runtime.d.ts";

let createClient: any;
try {
  const mod = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
  createClient = mod.createClient;
} catch (e) {
  console.error("Failed to import supabase-js:", e);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/* ------------------------------------------------------------------ */
/*  Methodology                                                       */
/* ------------------------------------------------------------------ */

// z → 1-5 dot-scale mapping (peer-relative quintile-ish)
function zToScore(z: number | null | undefined): number {
  if (z === null || z === undefined || Number.isNaN(z)) return 3;
  if (z >= 1.5)  return 5;
  if (z >= 0.5)  return 4;
  if (z >= -0.5) return 3;
  if (z >= -1.5) return 2;
  return 1;
}

// Weighted average of available z-scores (skip nulls; renormalize weights).
// `inv` flag inverts the sign for "lower is better" metrics (PE, debt, EV/EBITDA…).
function weightedZ(parts: Array<{ z: number | null | undefined; w: number; inv?: boolean }>): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const p of parts) {
    if (p.z === null || p.z === undefined || Number.isNaN(p.z)) continue;
    const adjusted = p.inv ? -p.z : p.z;
    sum += adjusted * p.w;
    weightSum += p.w;
  }
  return weightSum > 0 ? sum / weightSum : null;
}

interface ZRow {
  symbol: string;
  industry: string | null;
  sector: string | null;
  market_cap_category: string | null;
  peer_group_count: number | null;

  // Value metrics
  earnings_yield_zscore?: number | null;
  free_cash_flow_yield_zscore?: number | null;
  ev_to_ebitda_zscore?: number | null;
  price_to_book_ratio_zscore?: number | null;
  price_to_sales_ratio_zscore?: number | null;

  // Profit metrics
  return_on_invested_capital_zscore?: number | null;
  net_profit_margin_zscore?: number | null;
  return_on_equity_zscore?: number | null;
  gross_profit_margin_zscore?: number | null;
  income_quality_zscore?: number | null;

  // Health metrics
  interest_coverage_ratio_zscore?: number | null;
  net_debt_to_ebitda_zscore?: number | null;
  debt_to_equity_ratio_zscore?: number | null;
  current_ratio_zscore?: number | null;
  solvency_ratio_zscore?: number | null;
}

// Composite letter grade — matches the StockCard mock from the design phase
function gradeFor(total: number): { grade: string; color: string } {
  if (total >= 22) return { grade: "A",  color: "#34D399" };
  if (total >= 19) return { grade: "A-", color: "#34D399" };
  if (total >= 17) return { grade: "B+", color: "#34D399" };
  if (total >= 14) return { grade: "B",  color: "#A7F3D0" };
  if (total >= 12) return { grade: "C+", color: "#FBBF24" };
  if (total >= 10) return { grade: "C",  color: "#FBBF24" };
  if (total >=  8) return { grade: "D",  color: "#FB923C" };
  return                  { grade: "F",  color: "#F87171" };
}

/* ------------------------------------------------------------------ */
/*  Per-symbol rating computation                                     */
/* ------------------------------------------------------------------ */

interface Rating {
  symbol: string;
  computed_date: string;
  value_score: number;
  growth_score: number;
  profit_score: number;
  momentum_score: number;
  health_score: number;
  composite_total: number;
  composite_grade: string;
  composite_color: string;
  value_z: number | null;
  growth_z: number | null;
  profit_z: number | null;
  momentum_z: number | null;
  health_z: number | null;
  cohort_industry: string | null;
  cohort_cap_category: string | null;
  cohort_size: number | null;
}

function computeRatingForSymbol(
  z: ZRow,
  growthZ: number | null,
  momentumZ: number | null,
  computedDate: string,
): Rating {
  // VALUE — yields are higher-is-better (no invert); ratios are lower-is-better (invert)
  const valueZ = weightedZ([
    { z: z.earnings_yield_zscore,        w: 0.30 },
    { z: z.free_cash_flow_yield_zscore,  w: 0.25 },
    { z: z.ev_to_ebitda_zscore,          w: 0.20, inv: true },
    { z: z.price_to_book_ratio_zscore,   w: 0.15, inv: true },
    { z: z.price_to_sales_ratio_zscore,  w: 0.10, inv: true },
  ]);

  // PROFIT — all higher-is-better
  const profitZ = weightedZ([
    { z: z.return_on_invested_capital_zscore, w: 0.35 },
    { z: z.net_profit_margin_zscore,          w: 0.25 },
    { z: z.return_on_equity_zscore,           w: 0.20 },
    { z: z.gross_profit_margin_zscore,        w: 0.10 },
    { z: z.income_quality_zscore,             w: 0.10 },
  ]);

  // HEALTH — coverage/liquidity higher-is-better; debt lower-is-better (invert)
  const healthZ = weightedZ([
    { z: z.interest_coverage_ratio_zscore, w: 0.30 },
    { z: z.net_debt_to_ebitda_zscore,      w: 0.25, inv: true },
    { z: z.debt_to_equity_ratio_zscore,    w: 0.20, inv: true },
    { z: z.current_ratio_zscore,           w: 0.15 },
    { z: z.solvency_ratio_zscore,          w: 0.10 },
  ]);

  const value_score    = zToScore(valueZ);
  const profit_score   = zToScore(profitZ);
  const health_score   = zToScore(healthZ);
  const growth_score   = zToScore(growthZ);
  const momentum_score = zToScore(momentumZ);

  const composite_total = value_score + growth_score + profit_score + momentum_score + health_score;
  const { grade, color } = gradeFor(composite_total);

  return {
    symbol: z.symbol,
    computed_date: computedDate,
    value_score, growth_score, profit_score, momentum_score, health_score,
    composite_total,
    composite_grade: grade,
    composite_color: color,
    value_z: valueZ, growth_z: growthZ, profit_z: profitZ, momentum_z: momentumZ, health_z: healthZ,
    cohort_industry: z.industry,
    cohort_cap_category: z.market_cap_category,
    cohort_size: z.peer_group_count,
  };
}

/* ------------------------------------------------------------------ */
/*  Pipeline                                                          */
/* ------------------------------------------------------------------ */

const Z_COLUMNS = [
  "symbol", "industry", "sector", "market_cap_category", "peer_group_count",
  "earnings_yield_zscore", "free_cash_flow_yield_zscore",
  "ev_to_ebitda_zscore", "price_to_book_ratio_zscore", "price_to_sales_ratio_zscore",
  "return_on_invested_capital_zscore", "net_profit_margin_zscore",
  "return_on_equity_zscore", "gross_profit_margin_zscore", "income_quality_zscore",
  "interest_coverage_ratio_zscore", "net_debt_to_ebitda_zscore",
  "debt_to_equity_ratio_zscore", "current_ratio_zscore", "solvency_ratio_zscore",
].join(",");

// Skip rating micro-caps — z-scoring is meaningless for $5M penny stocks and
// the long tail balloons compute time without user value. $100M is a reasonable
// floor (covers all US small-caps + every international name with real liquidity).
// Override per-call via ?minMarketCap=N.
const DEFAULT_MIN_MARKET_CAP = 100_000_000;

interface RunOptions { symbols?: string[]; limit?: number; minMarketCap?: number }

async function runPipeline(supabaseUrl: string, supabaseKey: string, opts: RunOptions = {}) {
  if (!createClient) throw new Error("supabase client unavailable");
  const sb = createClient(supabaseUrl, supabaseKey, { db: { schema: "backend" } });
  const computedDate = new Date().toISOString().split("T")[0];
  const minCap = opts.minMarketCap ?? DEFAULT_MIN_MARKET_CAP;

  // Pull the latest annual z-score row per (symbol × market_cap_category).
  // The unique key on industry_zscores_annual is (symbol, date, period, market_cap_category),
  // so we pick the most recent date per symbol via DISTINCT ON.
  // PostgREST doesn't support DISTINCT ON natively, so we pull all rows and dedupe in code.
  let q = sb.from("industry_zscores_annual")
    .select(Z_COLUMNS)
    .gte("market_cap", minCap)
    .order("date", { ascending: false });

  if (opts.symbols?.length) q = q.in("symbol", opts.symbols);
  if (opts.limit)           q = q.limit(opts.limit);
  else                      q = q.limit(60000); // safety cap; current universe ~44k symbols

  const { data: zRows, error: zErr } = await q;
  if (zErr) throw new Error(`industry_zscores_annual: ${zErr.message}`);
  if (!zRows || zRows.length === 0) {
    return { processed: 0, written: 0, message: "no z-score rows found" };
  }

  // Keep only the latest (date, market_cap_category) row per symbol — list is already sorted desc.
  const latestBySymbol = new Map<string, ZRow>();
  for (const row of zRows) {
    if (!latestBySymbol.has(row.symbol)) latestBySymbol.set(row.symbol, row);
  }

  // Pull existing growth + momentum z-scores for today (3b + 3c will populate these).
  // For 3a, both are null → compute defaults to median (score 3) per dimension.
  const symbols = Array.from(latestBySymbol.keys());
  const [growthMap, momentumMap] = await Promise.all([
    fetchSideTableMap(sb, "growth_zscores_daily", "composite_growth_zscore", computedDate, symbols),
    fetchSideTableMap(sb, "momentum_zscores_daily", "composite_momentum_zscore", computedDate, symbols),
  ]);

  // Compute ratings
  const ratings: Rating[] = [];
  for (const [symbol, zRow] of latestBySymbol.entries()) {
    const growthZ   = growthMap.get(symbol)   ?? null;
    const momentumZ = momentumMap.get(symbol) ?? null;
    ratings.push(computeRatingForSymbol(zRow, growthZ, momentumZ, computedDate));
  }

  // Upsert in batches (PostgREST upsert sweet spot is ~500 rows per call)
  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < ratings.length; i += BATCH) {
    const chunk = ratings.slice(i, i + BATCH);
    const { error: upErr } = await sb.from("stock_ratings_daily")
      .upsert(chunk, { onConflict: "symbol,computed_date" });
    if (upErr) throw new Error(`upsert batch ${i}: ${upErr.message}`);
    written += chunk.length;
  }

  return { processed: latestBySymbol.size, written, computed_date: computedDate };
}

async function fetchSideTableMap(
  sb: any, table: string, column: string, computedDate: string, symbols: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  // Chunk the .in() filter — PostgREST URL has a length limit
  const CHUNK = 200;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const slice = symbols.slice(i, i + CHUNK);
    const { data, error } = await sb.from(table)
      .select(`symbol,${column}`)
      .eq("computed_date", computedDate)
      .in("symbol", slice);
    if (error) {
      console.log(`${table} read failed (non-fatal):`, error.message);
      continue;
    }
    for (const row of (data ?? [])) {
      if (typeof row[column] === "number") map.set(row.symbol, row[column]);
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Handler                                                           */
/* ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase env vars missing");

    const url = new URL(req.url);
    const symbolsParam = url.searchParams.get("symbols") || "";
    const limitParam = url.searchParams.get("limit");
    const minCapParam = url.searchParams.get("minMarketCap");

    const opts: RunOptions = {};
    if (symbolsParam)  opts.symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (limitParam)    opts.limit = parseInt(limitParam, 10);
    if (minCapParam)   opts.minMarketCap = parseFloat(minCapParam);

    const start = Date.now();
    const result = await runPipeline(supabaseUrl, supabaseKey, opts);
    const elapsed = Date.now() - start;

    console.log(`compute-ratings: processed=${result.processed} written=${result.written} ms=${elapsed}`);
    return new Response(
      JSON.stringify({ ok: true, ...result, elapsed_ms: elapsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("compute-ratings error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

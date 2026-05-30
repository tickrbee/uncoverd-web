// Find-an-alternative engine. Given a target stock or ETF, surfaces peers
// that are objectively better on a single axis (yield, rating, valuation,
// expense, balance sheet, performance). Each axis returns the TOP peer
// for that axis only — so "higher yield" might be a different name than
// "better rating", which is the value: each axis tells you something
// specific.
//
// Important: we never produce a "recommendation". The page framing is
// "comparable {stock|ETF} with {axis} in the same {sector|category}" —
// data-driven, no editorializing. The user decides what to act on.

import "server-only";
import { getBackendClient, getAdminClient } from "@/lib/supabase/admin";

// Country + exchange filter — same logic as the X bot's candidates.ts.
// Limits peer pools to legit primary listings instead of every dual-listing
// on a foreign exchange.
const TARGET_COUNTRIES = [
  "US",
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

// ---------------------------------------------------------------------------
// Stock alternatives
// ---------------------------------------------------------------------------

export type StockAlternative = {
  symbol: string;
  name: string | null;
  axis: StockAxis;
  // Plain-English claim: "Higher yield (4.2% vs 3.1%)", "Better rating (A- vs B+)".
  claim: string;
  // Direct comparison fields for the card display.
  metricLabel: string;
  metricValue: string;
  metricValueTarget: string;
  // Plus the rest of the alternative's key stats for the card body.
  yieldPct: number | null;
  marketCap: number | null;
  composite: number | null;
  grade: string | null;
  return1y: number | null;
  peRatio: number | null;
};

type StockAxis = "yield" | "rating" | "valuation" | "balance-sheet" | "return-1y";

const STOCK_AXES: { id: StockAxis; label: string; description: string }[] = [
  { id: "yield", label: "Higher yield", description: "Same sector, paying a bigger dividend" },
  { id: "rating", label: "Better rating", description: "Stronger uncoverd composite score" },
  { id: "valuation", label: "Cheaper valuation", description: "Lower P/E for the same industry" },
  { id: "balance-sheet", label: "Stronger balance sheet", description: "Lower net debt / EBITDA" },
  { id: "return-1y", label: "Better 1-year return", description: "Bigger price gain over the past 12 months" },
];

export type StockAlternativeReport = {
  target: {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mktCap: number | null;
    yieldPct: number | null;
    composite: number | null;
    grade: string | null;
    peRatio: number | null;
    netDebtToEbitda: number | null;
    return1y: number | null;
  };
  alternatives: StockAlternative[];
};

export async function findStockAlternatives(symbol: string): Promise<StockAlternativeReport | null> {
  const sb = getBackendClient();

  // 1) Target ticker. limit(1) + array picking handles duplicate-row
  // tickers (cross-listings). Also pull isin so we can exclude other
  // ticker variants of the same company (AAPL vs AAPL.MX both share
  // ISIN US0378331005). pe_ratio is NOT a column on tickers — it lives
  // in ratios_annual and is joined below.
  const { data: targets } = await sb
    .from("tickers")
    .select("symbol,name,sector,industry,mkt_cap,price,last_div,beta,country,exchange_short,is_etf,is_fund,isin")
    .eq("symbol", symbol)
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(1);
  type T = {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mkt_cap: number | null;
    price: number | null;
    last_div: number | null;
    country: string | null;
    exchange_short: string | null;
    is_etf: boolean | null;
    is_fund: boolean | null;
    isin: string | null;
  };
  const t = (targets as T[] | null)?.[0] ?? null;
  if (!t || t.is_etf || t.is_fund) return null;
  // Don't gate on sector — some major stocks (NFLX) have null sector in
  // the DB. We fall back to industry- or country-based peer lookup below.

  const targetYield =
    t.last_div != null && t.price != null && Number(t.price) > 0
      ? (Number(t.last_div) / Number(t.price)) * 100
      : null;
  const targetMktCap = t.mkt_cap != null ? Number(t.mkt_cap) : null;

  // 2) Load TARGET enrichment data FIRST, always. Previous version ran
  // this only after the peer query and bailed out with hardcoded null
  // values whenever the peer pool was empty — that's why PUM.DE, TE,
  // and other foreign mid-caps were showing dashes for rating/P/E/etc
  // on the reference card even though the data existed.
  const targetEnrichment = await loadStockTargetEnrichment(sb, symbol);

  type P = {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mkt_cap: number | null;
    price: number | null;
    last_div: number | null;
    country: string | null;
    exchange_short: string | null;
    isin: string | null;
  };

  // 3) Peer pool with cascading fallback tiers. Smaller / less-typical
  // tickers (foreign mid-caps, sector=null) often produce empty results
  // on the strict initial query — we fall through to broader filters
  // rather than returning empty.
  const peers = await loadStockPeers(sb, t, targetMktCap);

  // If still empty, return target-only report.
  if (peers.length === 0) {
    return {
      target: {
        symbol,
        name: t.name,
        sector: t.sector,
        industry: t.industry,
        mktCap: targetMktCap,
        yieldPct: targetYield,
        composite: targetEnrichment.composite,
        grade: targetEnrichment.grade,
        peRatio: targetEnrichment.peRatio,
        netDebtToEbitda: targetEnrichment.netDebt,
        return1y: targetEnrichment.return1y,
      },
      alternatives: [],
    };
  }
  // Re-bind to satisfy downstream code that expects the local `peers` to
  // be the typed array (the helper above returns P[] but TS doesn't see
  // through the helper return without an explicit annotation).
  void (peers as P[]);

  const peerSymbols = peers.map((p) => p.symbol);

  // Enrich PEERS with ratings, fundamentals, returns. Target enrichment
  // is already loaded above.
  const [ratingsData, ratiosData, keyMetricsData, returns1yMap] = await Promise.all([
    sb
      .from("stock_ratings_daily")
      .select("symbol,composite_total,composite_grade,computed_date")
      .in("symbol", peerSymbols)
      .order("computed_date", { ascending: false })
      .limit(peerSymbols.length * 3),
    sb
      .from("ratios_annual")
      .select("symbol,date,price_to_earnings_ratio")
      .in("symbol", peerSymbols)
      .order("date", { ascending: false })
      .limit(peerSymbols.length * 3),
    sb
      .from("key_metrics_annual")
      .select("symbol,date,net_debt_to_ebitda")
      .in("symbol", peerSymbols)
      .order("date", { ascending: false })
      .limit(peerSymbols.length * 3),
    compute1yReturnsBatch(peerSymbols),
  ]);

  const ratingsBy = new Map<string, { composite: number | null; grade: string | null }>();
  for (const r of (ratingsData.data as { symbol: string; composite_total: number | null; composite_grade: string | null }[] | null) ?? []) {
    if (!ratingsBy.has(r.symbol)) ratingsBy.set(r.symbol, { composite: r.composite_total, grade: r.composite_grade });
  }
  const peBy = new Map<string, number>();
  for (const r of (ratiosData.data as { symbol: string; price_to_earnings_ratio: number | null }[] | null) ?? []) {
    if (peBy.has(r.symbol)) continue;
    if (r.price_to_earnings_ratio == null) continue;
    peBy.set(r.symbol, Number(r.price_to_earnings_ratio));
  }
  const netDebtBy = new Map<string, number>();
  for (const r of (keyMetricsData.data as { symbol: string; net_debt_to_ebitda: number | null }[] | null) ?? []) {
    if (netDebtBy.has(r.symbol)) continue;
    if (r.net_debt_to_ebitda == null) continue;
    netDebtBy.set(r.symbol, Number(r.net_debt_to_ebitda));
  }

  type Enriched = {
    symbol: string;
    name: string | null;
    industry: string | null;
    yieldPct: number | null;
    marketCap: number | null;
    composite: number | null;
    grade: string | null;
    peRatio: number | null;
    netDebt: number | null;
    return1y: number | null;
  };
  const enrich = (p: P): Enriched => {
    const y =
      p.last_div != null && p.price != null && Number(p.price) > 0
        ? (Number(p.last_div) / Number(p.price)) * 100
        : null;
    const rating = ratingsBy.get(p.symbol);
    return {
      symbol: p.symbol,
      name: p.name,
      industry: p.industry,
      yieldPct: y,
      marketCap: p.mkt_cap != null ? Number(p.mkt_cap) : null,
      composite: rating?.composite ?? null,
      grade: rating?.grade ?? null,
      peRatio: peBy.get(p.symbol) ?? null,
      netDebt: netDebtBy.get(p.symbol) ?? null,
      return1y: returns1yMap.get(p.symbol) ?? null,
    };
  };
  const enrichedPeers = peers.map(enrich);
  // Use the pre-loaded targetEnrichment (loaded BEFORE peers, so always
  // populated when the data exists in the DB).
  const targetEnriched = {
    yieldPct: targetYield,
    composite: targetEnrichment.composite,
    grade: targetEnrichment.grade,
    peRatio: targetEnrichment.peRatio,
    netDebt: targetEnrichment.netDebt,
    return1y: targetEnrichment.return1y,
  };

  // 4) Pick the top-1 peer per axis. Same-industry candidates win ties.
  // Capture target industry in a local so the closure type-narrows correctly
  // (TS can't prove `t` stays non-null through every async hop above).
  const targetIndustry = t.industry;
  function bestBy(
    direction: "high" | "low",
    valueOf: (e: Enriched) => number | null,
    targetValue: number | null,
  ): Enriched | null {
    const eligible = enrichedPeers.filter((p) => {
      const v = valueOf(p);
      if (v == null || !isFinite(v)) return false;
      if (targetValue == null) return true;
      // Must be better than the target on this axis.
      return direction === "high" ? v > targetValue * 1.01 : v < targetValue * 0.99;
    });
    if (eligible.length === 0) return null;
    eligible.sort((a, b) => {
      const av = valueOf(a)!;
      const bv = valueOf(b)!;
      // Same-industry first (within-industry alternatives are stronger signal)
      const aSameInd = a.industry === targetIndustry ? 1 : 0;
      const bSameInd = b.industry === targetIndustry ? 1 : 0;
      if (aSameInd !== bSameInd) return bSameInd - aSameInd;
      return direction === "high" ? bv - av : av - bv;
    });
    return eligible[0];
  }

  const alts: StockAlternative[] = [];

  // Higher yield
  {
    const w = bestBy("high", (e) => e.yieldPct, targetEnriched.yieldPct);
    if (w) {
      alts.push({
        symbol: w.symbol,
        name: w.name,
        axis: "yield",
        claim: `Yielding ${fmt(w.yieldPct, "pct")} vs ${fmt(targetEnriched.yieldPct, "pct")}`,
        metricLabel: "Yield",
        metricValue: fmt(w.yieldPct, "pct"),
        metricValueTarget: fmt(targetEnriched.yieldPct, "pct"),
        yieldPct: w.yieldPct,
        marketCap: w.marketCap,
        composite: w.composite,
        grade: w.grade,
        return1y: w.return1y,
        peRatio: w.peRatio,
      });
    }
  }

  // Better rating
  {
    const w = bestBy("high", (e) => e.composite, targetEnriched.composite);
    if (w) {
      alts.push({
        symbol: w.symbol,
        name: w.name,
        axis: "rating",
        claim: `Composite ${w.grade ?? ""} vs ${targetEnriched.grade ?? "?"}`,
        metricLabel: "Rating",
        metricValue: w.grade ?? String(w.composite),
        metricValueTarget: targetEnriched.grade ?? "—",
        yieldPct: w.yieldPct,
        marketCap: w.marketCap,
        composite: w.composite,
        grade: w.grade,
        return1y: w.return1y,
        peRatio: w.peRatio,
      });
    }
  }

  // Cheaper valuation (lower P/E)
  {
    const w = bestBy("low", (e) => e.peRatio, targetEnriched.peRatio);
    if (w && (w.peRatio ?? 0) > 0) {
      alts.push({
        symbol: w.symbol,
        name: w.name,
        axis: "valuation",
        claim: `P/E ${fmt(w.peRatio, "num")} vs ${fmt(targetEnriched.peRatio, "num")}`,
        metricLabel: "P/E ratio",
        metricValue: fmt(w.peRatio, "num"),
        metricValueTarget: fmt(targetEnriched.peRatio, "num"),
        yieldPct: w.yieldPct,
        marketCap: w.marketCap,
        composite: w.composite,
        grade: w.grade,
        return1y: w.return1y,
        peRatio: w.peRatio,
      });
    }
  }

  // Stronger balance sheet (lower net-debt/EBITDA)
  {
    const w = bestBy("low", (e) => e.netDebt, targetEnriched.netDebt);
    if (w) {
      alts.push({
        symbol: w.symbol,
        name: w.name,
        axis: "balance-sheet",
        claim: `Net debt/EBITDA ${fmt(w.netDebt, "num")} vs ${fmt(targetEnriched.netDebt, "num")}`,
        metricLabel: "Net debt / EBITDA",
        metricValue: fmt(w.netDebt, "num"),
        metricValueTarget: fmt(targetEnriched.netDebt, "num"),
        yieldPct: w.yieldPct,
        marketCap: w.marketCap,
        composite: w.composite,
        grade: w.grade,
        return1y: w.return1y,
        peRatio: w.peRatio,
      });
    }
  }

  // Better 1-year return
  {
    const w = bestBy("high", (e) => e.return1y, targetEnriched.return1y);
    if (w) {
      alts.push({
        symbol: w.symbol,
        name: w.name,
        axis: "return-1y",
        claim: `1Y price ${fmt(w.return1y, "pct")} vs ${fmt(targetEnriched.return1y, "pct")}`,
        metricLabel: "1Y price",
        metricValue: fmt(w.return1y, "pct"),
        metricValueTarget: fmt(targetEnriched.return1y, "pct"),
        yieldPct: w.yieldPct,
        marketCap: w.marketCap,
        composite: w.composite,
        grade: w.grade,
        return1y: w.return1y,
        peRatio: w.peRatio,
      });
    }
  }

  // Fallback "Closest peer": if NO axis surfaced (target is dominant on
  // everything OR data is thin), show the top-rated same-industry peer
  // as a generic alternative. Keeps the page useful instead of the
  // "No clear axis-winners" empty state.
  if (alts.length === 0) {
    const closestEligible = enrichedPeers
      .filter((p) => p.industry === t.industry || p.composite != null)
      .sort((a, b) => {
        const aSameInd = a.industry === t.industry ? 1 : 0;
        const bSameInd = b.industry === t.industry ? 1 : 0;
        if (aSameInd !== bSameInd) return bSameInd - aSameInd;
        return (b.composite ?? -1) - (a.composite ?? -1);
      });
    const w = closestEligible[0] ?? enrichedPeers[0];
    if (w) {
      alts.push({
        symbol: w.symbol,
        name: w.name,
        axis: "yield",
        claim: `Closest peer in ${t.industry ?? t.sector ?? "this group"}`,
        metricLabel: "Same group",
        metricValue: w.grade ?? "—",
        metricValueTarget: targetEnriched.grade ?? "—",
        yieldPct: w.yieldPct,
        marketCap: w.marketCap,
        composite: w.composite,
        grade: w.grade,
        return1y: w.return1y,
        peRatio: w.peRatio,
      });
    }
  }

  return {
    target: {
      symbol,
      name: t.name,
      sector: t.sector,
      industry: t.industry,
      mktCap: targetMktCap,
      yieldPct: targetEnriched.yieldPct,
      composite: targetEnriched.composite,
      grade: targetEnriched.grade,
      peRatio: targetEnriched.peRatio,
      netDebtToEbitda: targetEnriched.netDebt,
      return1y: targetEnriched.return1y,
    },
    alternatives: alts,
  };
}

// ---------------------------------------------------------------------------
// ETF alternatives
// ---------------------------------------------------------------------------

export type EtfAlternative = {
  symbol: string;
  name: string | null;
  axis: EtfAxis;
  claim: string;
  metricLabel: string;
  metricValue: string;
  metricValueTarget: string;
  // Holdings similarity to the target (cosine). 0-1.
  similarity: number;
  yieldPct: number | null;
  expenseRatio: number | null;
  aum: number | null;
};

type EtfAxis = "yield" | "expense" | "aum" | "next-best";

export type EtfAlternativeReport = {
  target: {
    symbol: string;
    name: string | null;
    yieldPct: number | null;
    expenseRatio: number | null;
    aum: number | null;
    holdingsCount: number;
  };
  alternatives: EtfAlternative[];
};

export async function findEtfAlternatives(symbol: string): Promise<EtfAlternativeReport | null> {
  const sb = getBackendClient();

  // 1) Target ETF + its holdings. Same duplicate-row defense as the stock
  // path — limit(1) + array picking instead of maybeSingle().
  const { data: targets } = await sb
    .from("tickers")
    .select("symbol,name,price,last_div,expense_ratio,aum,country,exchange_short,is_etf,is_fund")
    .eq("symbol", symbol)
    .order("aum", { ascending: false, nullsFirst: false })
    .limit(1);
  type T = {
    symbol: string;
    name: string | null;
    price: number | null;
    last_div: number | null;
    expense_ratio: number | null;
    aum: number | null;
    country: string | null;
    exchange_short: string | null;
    is_etf: boolean | null;
    is_fund: boolean | null;
  };
  const t = (targets as T[] | null)?.[0] ?? null;
  if (!t || (!t.is_etf && !t.is_fund)) return null;

  const { data: targetHoldings } = await sb
    .from("etf_holdings")
    .select("asset,weight_percentage")
    .eq("etf_symbol", symbol)
    .order("weight_percentage", { ascending: false, nullsFirst: false })
    .limit(50);
  type H = { asset: string; weight_percentage: number | null };
  const tHoldings = (targetHoldings as H[] | null) ?? [];

  // Target yield (TTM if last_div is null — typical for US ETFs)
  let targetYield: number | null =
    t.last_div != null && t.price != null && Number(t.price) > 0
      ? (Number(t.last_div) / Number(t.price)) * 100
      : null;
  if (targetYield == null) targetYield = await ttmYield(symbol, t.price);

  if (tHoldings.length === 0) {
    return {
      target: {
        symbol,
        name: t.name,
        yieldPct: targetYield,
        expenseRatio: t.expense_ratio,
        aum: t.aum,
        holdingsCount: 0,
      },
      alternatives: [],
    };
  }

  // 2) Pull candidate ETFs (large enough to be relevant)
  const { data: candidates } = await sb
    .from("tickers")
    .select("symbol,name,price,last_div,expense_ratio,aum,country,exchange_short")
    .eq("is_etf", true)
    .eq("is_actively_trading", true)
    .in("country", TARGET_COUNTRIES)
    .gt("aum", 500_000_000)
    .neq("symbol", symbol)
    .order("aum", { ascending: false, nullsFirst: false })
    .limit(300);
  type C = {
    symbol: string;
    name: string | null;
    price: number | null;
    last_div: number | null;
    expense_ratio: number | null;
    aum: number | null;
    country: string | null;
    exchange_short: string | null;
  };
  const candidateRows = (candidates as C[] | null) ?? [];
  if (candidateRows.length === 0) {
    return {
      target: {
        symbol,
        name: t.name,
        yieldPct: targetYield,
        expenseRatio: t.expense_ratio,
        aum: t.aum,
        holdingsCount: tHoldings.length,
      },
      alternatives: [],
    };
  }

  // 3) For each candidate, pull holdings + compute similarity
  const targetWeights = new Map<string, number>();
  for (const h of tHoldings) if (h.weight_percentage != null) targetWeights.set(h.asset, Number(h.weight_percentage));
  const tNormA = Math.sqrt(Array.from(targetWeights.values()).reduce((s, v) => s + v * v, 0));

  const candidateSymbols = candidateRows.map((c) => c.symbol);
  const { data: allHoldings } = await sb
    .from("etf_holdings")
    .select("etf_symbol,asset,weight_percentage")
    .in("etf_symbol", candidateSymbols)
    .order("weight_percentage", { ascending: false, nullsFirst: false })
    .limit(candidateSymbols.length * 30);
  type CH = { etf_symbol: string; asset: string; weight_percentage: number | null };
  const byEtf = new Map<string, Map<string, number>>();
  for (const h of (allHoldings as CH[] | null) ?? []) {
    if (h.weight_percentage == null) continue;
    let m = byEtf.get(h.etf_symbol);
    if (!m) {
      m = new Map();
      byEtf.set(h.etf_symbol, m);
    }
    if (m.size < 30) m.set(h.asset, Number(h.weight_percentage));
  }

  type Scored = C & { similarity: number; yieldPct: number | null };
  const scored: Scored[] = [];
  for (const c of candidateRows) {
    const m = byEtf.get(c.symbol);
    if (!m || m.size === 0) continue;
    let dot = 0;
    let normB = 0;
    for (const [asset, weight] of m) {
      normB += weight * weight;
      const tw = targetWeights.get(asset);
      if (tw != null) dot += weight * tw;
    }
    const sim = tNormA > 0 && normB > 0 ? dot / (tNormA * Math.sqrt(normB)) : 0;
    const y =
      c.last_div != null && c.price != null && Number(c.price) > 0
        ? (Number(c.last_div) / Number(c.price)) * 100
        : null;
    scored.push({ ...c, similarity: sim, yieldPct: y });
  }

  // Backfill yields via TTM dividends for ETFs with null last_div.
  const needYield = scored.filter((s) => s.yieldPct == null && s.price != null && Number(s.price) > 0);
  if (needYield.length > 0) {
    const yields = await batchTtmYield(needYield.map((s) => s.symbol));
    for (const s of needYield) {
      const ttm = yields.get(s.symbol);
      if (ttm != null && s.price != null && Number(s.price) > 0) {
        s.yieldPct = (ttm / Number(s.price)) * 100;
      }
    }
  }

  // Yield-similarity guard: every alt must be within a yield band of the
  // target. Wider band than the first attempt — [0.7, 1.5] was eliminating
  // legitimate alts (VYM, DGRO showing as alts to SCHD). The current [0.4,
  // 2.5] excludes truly different fund profiles (1% broad-market vs 8%
  // dividend ETF) while keeping reasonable peers in the pool.
  function yieldInBand(y: number | null, target: number | null, mult: [number, number]): boolean {
    if (y == null) return false;
    if (target == null) return true;
    return y >= target * mult[0] && y <= target * mult[1];
  }

  // Only consider candidates with meaningful overlap.
  const similar = scored.filter((s) => s.similarity >= 0.4);
  const alternatives: EtfAlternative[] = [];

  // Higher yield among similar — same fund profile, paying more (up to 2x).
  {
    const eligible = similar.filter(
      (s) =>
        s.yieldPct != null &&
        (targetYield == null || s.yieldPct > targetYield * 1.05) &&
        yieldInBand(s.yieldPct, targetYield, [1.0, 2.0]),
    );
    eligible.sort((a, b) => (b.yieldPct ?? 0) - (a.yieldPct ?? 0));
    const w = eligible[0];
    if (w) {
      alternatives.push({
        symbol: w.symbol,
        name: w.name,
        axis: "yield",
        claim: `Yields ${fmt(w.yieldPct, "pct")} vs ${fmt(targetYield, "pct")}`,
        metricLabel: "Yield",
        metricValue: fmt(w.yieldPct, "pct"),
        metricValueTarget: fmt(targetYield, "pct"),
        similarity: w.similarity,
        yieldPct: w.yieldPct,
        expenseRatio: w.expense_ratio != null ? Number(w.expense_ratio) : null,
        aum: w.aum != null ? Number(w.aum) : null,
      });
    }
  }

  // Cheaper expense ratio — must hold a SIMILAR yield, otherwise it's just
  // "different fund". Yield band: [0.7x, 1.5x] of target.
  {
    const eligible = similar.filter(
      (s) =>
        s.expense_ratio != null &&
        (t.expense_ratio == null || Number(s.expense_ratio) < Number(t.expense_ratio) * 0.85) &&
        yieldInBand(s.yieldPct, targetYield, [0.4, 2.5]),
    );
    eligible.sort((a, b) => Number(a.expense_ratio) - Number(b.expense_ratio));
    const w = eligible[0];
    if (w) {
      alternatives.push({
        symbol: w.symbol,
        name: w.name,
        axis: "expense",
        claim: `Expense ratio ${fmt(w.expense_ratio, "pct")} vs ${fmt(t.expense_ratio, "pct")}`,
        metricLabel: "Expense ratio",
        metricValue: fmt(w.expense_ratio, "pct"),
        metricValueTarget: fmt(t.expense_ratio, "pct"),
        similarity: w.similarity,
        yieldPct: w.yieldPct,
        expenseRatio: w.expense_ratio != null ? Number(w.expense_ratio) : null,
        aum: w.aum != null ? Number(w.aum) : null,
      });
    }
  }

  // Larger AUM (more liquid) — yield must be similar.
  {
    const eligible = similar.filter(
      (s) =>
        s.aum != null &&
        (t.aum == null || Number(s.aum) > Number(t.aum) * 1.3) &&
        yieldInBand(s.yieldPct, targetYield, [0.4, 2.5]),
    );
    eligible.sort((a, b) => Number(b.aum) - Number(a.aum));
    const w = eligible[0];
    if (w) {
      alternatives.push({
        symbol: w.symbol,
        name: w.name,
        axis: "aum",
        claim: `${fmtAum(w.aum)} in AUM vs ${fmtAum(t.aum)}`,
        metricLabel: "AUM",
        metricValue: fmtAum(w.aum),
        metricValueTarget: fmtAum(t.aum),
        similarity: w.similarity,
        yieldPct: w.yieldPct,
        expenseRatio: w.expense_ratio != null ? Number(w.expense_ratio) : null,
        aum: w.aum != null ? Number(w.aum) : null,
      });
    }
  }

  // Next best — closest overall match: very similar yield + holdings overlap.
  // Replaces the earlier "alt-strategy" axis which surfaced low-overlap
  // funds with wildly different yields. This axis is about "if you can't
  // get this one, this is the closest substitute".
  {
    const usedSyms = new Set(alternatives.map((a) => a.symbol));
    const eligible = scored
      .filter((s) => !usedSyms.has(s.symbol))
      .filter((s) => s.similarity >= 0.4)
      .filter((s) => yieldInBand(s.yieldPct, targetYield, [0.8, 1.25]));
    // Score = similarity * 0.7 + (1 - |expense_ratio - target_expense|) * 0.3
    // Picks the candidate that overall looks closest to the target.
    const targetExp = t.expense_ratio != null ? Number(t.expense_ratio) : null;
    eligible.sort((a, b) => {
      const aDelta = targetExp != null && a.expense_ratio != null ? Math.abs(Number(a.expense_ratio) - targetExp) : 0;
      const bDelta = targetExp != null && b.expense_ratio != null ? Math.abs(Number(b.expense_ratio) - targetExp) : 0;
      const aScore = a.similarity * 0.7 - aDelta * 0.3;
      const bScore = b.similarity * 0.7 - bDelta * 0.3;
      return bScore - aScore;
    });
    const w = eligible[0];
    if (w) {
      alternatives.push({
        symbol: w.symbol,
        name: w.name,
        axis: "next-best",
        claim: `${(w.similarity * 100).toFixed(0)}% holdings match, similar yield`,
        metricLabel: "Match",
        metricValue: `${(w.similarity * 100).toFixed(0)}%`,
        metricValueTarget: "100%",
        similarity: w.similarity,
        yieldPct: w.yieldPct,
        expenseRatio: w.expense_ratio != null ? Number(w.expense_ratio) : null,
        aum: w.aum != null ? Number(w.aum) : null,
      });
    }
  }

  // Fallback "Closest peer": if nothing matched the strict axis criteria,
  // surface the highest-similarity peer regardless of yield/expense
  // differences. Stops the page from rendering as "No alternatives" for
  // ETFs that already lead their group on every axis we track.
  if (alternatives.length === 0) {
    const sortedByOverlap = [...scored].sort((a, b) => b.similarity - a.similarity);
    const w = sortedByOverlap[0];
    if (w && w.similarity > 0.1) {
      alternatives.push({
        symbol: w.symbol,
        name: w.name,
        axis: "next-best",
        claim: `Highest overlap with ${symbol} — ${(w.similarity * 100).toFixed(0)}% holdings match`,
        metricLabel: "Overlap",
        metricValue: `${(w.similarity * 100).toFixed(0)}%`,
        metricValueTarget: "100%",
        similarity: w.similarity,
        yieldPct: w.yieldPct,
        expenseRatio: w.expense_ratio != null ? Number(w.expense_ratio) : null,
        aum: w.aum != null ? Number(w.aum) : null,
      });
    }
  }

  return {
    target: {
      symbol,
      name: t.name,
      yieldPct: targetYield,
      expenseRatio: t.expense_ratio,
      aum: t.aum,
      holdingsCount: tHoldings.length,
    },
    alternatives,
  };
}

export const ETF_AXES: { id: EtfAxis; label: string; description: string }[] = [
  { id: "yield", label: "Higher yield", description: "Same fund profile, paying more" },
  { id: "expense", label: "Cheaper", description: "Same fund profile, lower expense ratio" },
  { id: "aum", label: "More liquid", description: "Bigger AUM = tighter spreads" },
  { id: "next-best", label: "Next best", description: "Closest substitute — similar holdings + similar yield" },
];

export { STOCK_AXES };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Load a stock target's enrichment data (rating, P/E, net debt, 1Y return)
// in one shot. Always runs — regardless of whether we find peers later.
// Previous version bailed out of the function before this ran whenever
// peers came back empty, leaving the reference card with hardcoded nulls
// even though the data existed.
async function loadStockTargetEnrichment(
  sb: ReturnType<typeof getBackendClient>,
  symbol: string,
): Promise<{
  composite: number | null;
  grade: string | null;
  peRatio: number | null;
  netDebt: number | null;
  return1y: number | null;
}> {
  const [rating, ratio, key, returns] = await Promise.all([
    sb
      .from("stock_ratings_daily")
      .select("composite_total,composite_grade,computed_date")
      .eq("symbol", symbol)
      .order("computed_date", { ascending: false })
      .limit(1),
    sb
      .from("ratios_annual")
      .select("price_to_earnings_ratio,date")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1),
    sb
      .from("key_metrics_annual")
      .select("net_debt_to_ebitda,date")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1),
    compute1yReturnsBatch([symbol]),
  ]);
  const rRow = (rating.data as { composite_total: number | null; composite_grade: string | null }[] | null)?.[0];
  const pRow = (ratio.data as { price_to_earnings_ratio: number | null }[] | null)?.[0];
  const kRow = (key.data as { net_debt_to_ebitda: number | null }[] | null)?.[0];
  return {
    composite: rRow?.composite_total ?? null,
    grade: rRow?.composite_grade ?? null,
    peRatio: pRow?.price_to_earnings_ratio != null ? Number(pRow.price_to_earnings_ratio) : null,
    netDebt: kRow?.net_debt_to_ebitda != null ? Number(kRow.net_debt_to_ebitda) : null,
    return1y: returns.get(symbol) ?? null,
  };
}

// Load peers with cascading fallback. Tier 1 = strict (same sector +
// US/EU primary listings + mkt_cap window). If that returns 0, try
// broader filters: same industry / same country / sector only with no
// cap window. Avoids the "no alternatives" empty state for foreign mid-
// caps and stocks with sparse sector data.
async function loadStockPeers(
  sb: ReturnType<typeof getBackendClient>,
  t: {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mkt_cap: number | null;
    country: string | null;
    exchange_short: string | null;
    is_etf: boolean | null;
    is_fund: boolean | null;
    isin: string | null;
  },
  targetMktCap: number | null,
): Promise<
  Array<{
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mkt_cap: number | null;
    price: number | null;
    last_div: number | null;
    country: string | null;
    exchange_short: string | null;
    isin: string | null;
  }>
> {
  type P = {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mkt_cap: number | null;
    price: number | null;
    last_div: number | null;
    country: string | null;
    exchange_short: string | null;
    isin: string | null;
  };

  let minCap: number;
  let maxCap: number | null;
  if (targetMktCap == null) {
    minCap = 500_000_000;
    maxCap = null;
  } else if (targetMktCap >= 500_000_000_000) {
    minCap = 50_000_000_000;
    maxCap = null;
  } else if (targetMktCap >= 50_000_000_000) {
    minCap = targetMktCap * 0.2;
    maxCap = targetMktCap * 5;
  } else if (targetMktCap >= 10_000_000_000) {
    minCap = targetMktCap * 0.3;
    maxCap = targetMktCap * 3;
  } else {
    minCap = Math.max(300_000_000, targetMktCap * 0.3);
    maxCap = targetMktCap * 3;
  }

  // Build a base SELECT query with shared filters that apply to every tier.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  function baseTickerQuery(): any {
    let qb: any = sb
      .from("tickers")
      .select("symbol,name,sector,industry,mkt_cap,price,last_div,country,exchange_short,isin")
      .eq("is_actively_trading", true)
      .eq("is_etf", false)
      .eq("is_fund", false)
      .neq("symbol", t.symbol);
    if (t.isin) qb = qb.neq("isin", t.isin);
    if (t.name) qb = qb.neq("name", t.name);
    return qb;
  }

  // Tier 1: same sector + cap range + US/EU primary listings.
  const tier1Rows: P[] = await (async (): Promise<P[]> => {
    if (!t.sector) return [];
    let q: any = baseTickerQuery().eq("sector", t.sector).in("country", TARGET_COUNTRIES).gte("mkt_cap", minCap);
    if (maxCap != null) q = q.lte("mkt_cap", maxCap);
    const { data } = await q.order("mkt_cap", { ascending: false, nullsFirst: false }).limit(120);
    return (data as P[] | null) ?? [];
  })();

  // Tier 2: same industry, no cap range (handles thin sectors).
  const tier2Rows: P[] = tier1Rows.length >= 3 ? [] : await (async (): Promise<P[]> => {
    if (!t.industry) return [];
    const q: any = baseTickerQuery()
      .eq("industry", t.industry)
      .in("country", TARGET_COUNTRIES)
      .gt("mkt_cap", 200_000_000);
    const { data } = await q.order("mkt_cap", { ascending: false, nullsFirst: false }).limit(60);
    return (data as P[] | null) ?? [];
  })();

  // Tier 3: same country + cap range (covers sector=null and very local
  // ticker pools).
  const tier3Rows: P[] = (tier1Rows.length + tier2Rows.length) >= 3 ? [] : await (async (): Promise<P[]> => {
    if (!t.country) return [];
    let q: any = baseTickerQuery()
      .eq("country", t.country)
      .gte("mkt_cap", Math.max(500_000_000, minCap * 0.5));
    if (maxCap != null) q = q.lte("mkt_cap", maxCap * 2);
    const { data } = await q.order("mkt_cap", { ascending: false, nullsFirst: false }).limit(60);
    return (data as P[] | null) ?? [];
  })();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Dedupe across tiers by ISIN, then by name.
  const byIsin = new Map<string, P>();
  const noIsin: P[] = [];
  for (const p of [...tier1Rows, ...tier2Rows, ...tier3Rows]) {
    if (p.isin) {
      const existing = byIsin.get(p.isin);
      if (!existing || (p.mkt_cap ?? 0) > (existing.mkt_cap ?? 0)) byIsin.set(p.isin, p);
    } else {
      noIsin.push(p);
    }
  }
  const seenNames = new Set<string>();
  for (const p of Array.from(byIsin.values())) if (p.name) seenNames.add(p.name);
  const peers: P[] = Array.from(byIsin.values());
  for (const p of noIsin.sort((a, b) => (b.mkt_cap ?? 0) - (a.mkt_cap ?? 0))) {
    if (p.name && seenNames.has(p.name)) continue;
    if (p.name) seenNames.add(p.name);
    peers.push(p);
  }
  return peers;
}

async function ttmYield(symbol: string, price: number | null): Promise<number | null> {
  if (price == null || price <= 0) return null;
  const sb = getBackendClient();
  const cutoff = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("dividends")
    .select("dividend")
    .eq("symbol", symbol)
    .gte("date", cutoff)
    .gt("dividend", 0)
    .limit(20);
  const rows = (data as { dividend: number }[] | null) ?? [];
  if (rows.length === 0) return null;
  const ttm = rows.reduce((s, r) => s + Number(r.dividend), 0);
  return ttm > 0 ? (ttm / price) * 100 : null;
}

async function batchTtmYield(symbols: string[]): Promise<Map<string, number>> {
  const sb = getBackendClient();
  const cutoff = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("dividends")
    .select("symbol,dividend")
    .in("symbol", symbols)
    .gte("date", cutoff)
    .gt("dividend", 0)
    .limit(symbols.length * 15);
  const map = new Map<string, number>();
  for (const r of (data as { symbol: string; dividend: number }[] | null) ?? []) {
    map.set(r.symbol, (map.get(r.symbol) ?? 0) + Number(r.dividend));
  }
  return map;
}

// Compute 1-year price-change pct for many symbols in one round-trip per
// symbol (the price tables are large; doing them in a single big IN-query
// would return half a million rows). Acceptable in this context because
// we cap peers at 120.
async function compute1yReturnsBatch(symbols: string[]): Promise<Map<string, number>> {
  const sb = getBackendClient();
  const map = new Map<string, number>();
  // Run in chunks of 20 to avoid hammering the DB.
  const chunkSize = 20;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (sym) => {
        try {
          const { data } = await sb
            .from("historical_prices_stocks")
            .select("date,close")
            .eq("symbol", sym)
            .order("date", { ascending: false })
            .limit(260);
          const rows = (data as { date: string; close: number }[] | null) ?? [];
          if (rows.length < 30) return;
          const latest = Number(rows[0].close);
          if (!isFinite(latest) || latest <= 0) return;
          const oneY = rows[Math.min(rows.length - 1, 252)]?.close;
          if (oneY == null || !isFinite(Number(oneY)) || Number(oneY) <= 0) return;
          map.set(sym, ((latest - Number(oneY)) / Number(oneY)) * 100);
        } catch {
          /* skip — best-effort */
        }
      }),
    );
  }
  return map;
}

function fmt(v: number | null | undefined, mode: "pct" | "num"): string {
  if (v == null || !isFinite(v)) return "—";
  if (mode === "pct") return `${v.toFixed(2)}%`;
  return v.toFixed(2);
}
function fmtAum(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${Math.round(v)}`;
}

// Suppress an unused import warning for getAdminClient — it's referenced
// here for future use when we expand to public.dividend_kings etc.
void getAdminClient;

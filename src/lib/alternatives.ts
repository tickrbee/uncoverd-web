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

  // 1) Target ticker
  const { data: target } = await sb
    .from("tickers")
    .select("symbol,name,sector,industry,mkt_cap,price,last_div,pe_ratio,beta,country,exchange_short,is_etf,is_fund")
    .eq("symbol", symbol)
    .maybeSingle();
  type T = {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    mkt_cap: number | null;
    price: number | null;
    last_div: number | null;
    pe_ratio?: number | null;
    country: string | null;
    exchange_short: string | null;
    is_etf: boolean | null;
    is_fund: boolean | null;
  };
  const t = target as T | null;
  if (!t || t.is_etf || t.is_fund) return null;
  if (!t.sector) return null;

  const targetYield =
    t.last_div != null && t.price != null && Number(t.price) > 0
      ? (Number(t.last_div) / Number(t.price)) * 100
      : null;
  const targetMktCap = t.mkt_cap != null ? Number(t.mkt_cap) : null;

  // 2) Peer pool: same sector, mkt_cap within 0.3x-3x of target. Restrict
  // to US+EU primary listings; the user expects names they can actually
  // research, not micro-caps from minor exchanges.
  const minCap = targetMktCap != null ? targetMktCap * 0.3 : 1_000_000_000;
  const maxCap = targetMktCap != null ? targetMktCap * 3 : null;

  let q = sb
    .from("tickers")
    .select("symbol,name,sector,industry,mkt_cap,price,last_div,country,exchange_short")
    .eq("sector", t.sector)
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("is_fund", false)
    .in("country", TARGET_COUNTRIES)
    .gte("mkt_cap", minCap)
    .neq("symbol", symbol);
  if (maxCap != null) q = q.lte("mkt_cap", maxCap);
  // Same-industry peers rank higher, but if industry is set we still allow
  // sector-wide candidates; the picker prioritizes industry matches.
  const { data: peerRows } = await q
    .order("mkt_cap", { ascending: false, nullsFirst: false })
    .limit(120);

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
  };
  const peers = (peerRows as P[] | null) ?? [];
  if (peers.length === 0) {
    return {
      target: {
        symbol,
        name: t.name,
        sector: t.sector,
        industry: t.industry,
        mktCap: targetMktCap,
        yieldPct: targetYield,
        composite: null,
        grade: null,
        peRatio: t.pe_ratio ?? null,
        netDebtToEbitda: null,
        return1y: null,
      },
      alternatives: [],
    };
  }

  const peerSymbols = peers.map((p) => p.symbol);
  const allSymbolsIncludingTarget = [...peerSymbols, symbol];

  // 3) Enrich peers + target in parallel with ratings, fundamentals, returns
  const [ratingsData, ratiosData, keyMetricsData, returns1yMap] = await Promise.all([
    sb
      .schema("backend")
      .from("stock_ratings_daily")
      .select("symbol,composite_total,composite_grade,computed_date")
      .in("symbol", allSymbolsIncludingTarget)
      .order("computed_date", { ascending: false })
      .limit(allSymbolsIncludingTarget.length * 3),
    sb
      .from("ratios_annual")
      .select("symbol,date,price_to_earnings_ratio")
      .in("symbol", allSymbolsIncludingTarget)
      .order("date", { ascending: false })
      .limit(allSymbolsIncludingTarget.length * 3),
    sb
      .from("key_metrics_annual")
      .select("symbol,date,net_debt_to_ebitda")
      .in("symbol", allSymbolsIncludingTarget)
      .order("date", { ascending: false })
      .limit(allSymbolsIncludingTarget.length * 3),
    compute1yReturnsBatch(allSymbolsIncludingTarget),
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
  const targetRating = ratingsBy.get(symbol) ?? { composite: null, grade: null };
  const targetEnriched = {
    yieldPct: targetYield,
    composite: targetRating.composite,
    grade: targetRating.grade,
    peRatio: peBy.get(symbol) ?? t.pe_ratio ?? null,
    netDebt: netDebtBy.get(symbol) ?? null,
    return1y: returns1yMap.get(symbol) ?? null,
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

type EtfAxis = "yield" | "expense" | "aum" | "alt-strategy";

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

  // 1) Target ETF + its holdings
  const { data: target } = await sb
    .from("tickers")
    .select("symbol,name,price,last_div,expense_ratio,aum,country,exchange_short,is_etf,is_fund")
    .eq("symbol", symbol)
    .maybeSingle();
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
  const t = target as T | null;
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

  // Only consider candidates with meaningful overlap or alt-strategy options.
  const similar = scored.filter((s) => s.similarity >= 0.4);
  const alternatives: EtfAlternative[] = [];

  // Higher yield among similar
  {
    const eligible = similar.filter(
      (s) => s.yieldPct != null && (targetYield == null || s.yieldPct > targetYield * 1.05),
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

  // Cheaper expense ratio
  {
    const eligible = similar.filter(
      (s) =>
        s.expense_ratio != null &&
        (t.expense_ratio == null || Number(s.expense_ratio) < Number(t.expense_ratio)),
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

  // Larger AUM (more liquid)
  {
    const eligible = similar.filter(
      (s) => s.aum != null && (t.aum == null || Number(s.aum) > Number(t.aum) * 1.3),
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

  // Alt strategy: lower similarity but still in the dividend-ETF space.
  // Surfaces "fills the same slot with a different angle" candidates.
  {
    const eligible = scored
      .filter((s) => s.similarity >= 0.15 && s.similarity < 0.5)
      .filter((s) => s.yieldPct != null && s.yieldPct > 1.5);
    eligible.sort((a, b) => (b.aum ?? 0) - (a.aum ?? 0));
    const w = eligible[0];
    if (w) {
      alternatives.push({
        symbol: w.symbol,
        name: w.name,
        axis: "alt-strategy",
        claim: `Different angle — ${(w.similarity * 100).toFixed(0)}% overlap`,
        metricLabel: "Holdings overlap",
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
  { id: "alt-strategy", label: "Different angle", description: "Fills the same slot via different holdings" },
];

export { STOCK_AXES };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

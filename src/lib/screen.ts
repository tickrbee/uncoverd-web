// ============================================================================
// Text-to-screen executor for the Portfolio Generator v2.
//
// The LLM screen-planner (separate edge function) turns a free-form query
// ("most volatile energy stocks, profitable, paying a dividend") into a
// *validated* ScreenSpec. This module runs that spec deterministically against
// the real DB and returns the SAME GenInstrument[] shape the generator already
// consumes — so the screened universe is a drop-in replacement for the curated
// one, and every name that comes out is real DB data (no LLM-hallucinated
// tickers). The LLM is a query planner, never a source of facts.
//
// NOTE: the candidate-pool stage (per-country listStocks → FX-normalize caps →
// cap/liquidity floors → dedupe → ratings join) mirrors buildUniverse() in
// src/app/api/portfolio/universe/route.ts. Kept self-contained for now to avoid
// touching that production endpoint; a future refactor can lift the shared
// stage into one helper both call.
// ============================================================================

import { listStocks, getStockRatings, fxRatesToUSD } from "@/lib/data";
import { stockToGenInstrument } from "@/lib/gen-instrument";
import type { StockRow } from "@/lib/types";
import type { GenInstrument } from "@/components/generator/types";

export type ScreenSortBy = "yield" | "vol" | "cap" | "grade" | "profit";

// Everything the planner is allowed to emit. Every field is validated/clamped
// by validateScreenSpec before it touches the DB.
export type ScreenSpec = {
  country: string; // "US" | "GLOBAL" | ISO code(s), comma-sep ≤4
  sectors: string[]; // [] = any sector
  minYield: number | null; // %
  maxYield: number | null; // %
  minCapUsd: number | null;
  maxCapUsd: number | null;
  grades: string[]; // [] = any; e.g. ["A","A-","B+"]
  minVol: number | null; // est. annual vol %
  maxVol: number | null;
  minProfit: number | null; // rating profitability pillar, 1-5 scale (5 = best)
  sortBy: ScreenSortBy;
  sortDir: "asc" | "desc";
  limit: number;
  includeEtfs: boolean; // reserved: append curated ETF/bond sleeve (UI wiring)
};

// Canonical DB sectors. The planner is told to use these; validation also maps
// common synonyms so a stray "Tech"/"Financials" still resolves.
export const KNOWN_SECTORS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Communication Services",
  "Basic Materials",
] as const;

const SECTOR_ALIASES: Record<string, string> = {
  tech: "Technology",
  technology: "Technology",
  healthcare: "Healthcare",
  health: "Healthcare",
  "health care": "Healthcare",
  financial: "Financial Services",
  financials: "Financial Services",
  finance: "Financial Services",
  "financial services": "Financial Services",
  bank: "Financial Services",
  banks: "Financial Services",
  "consumer cyclical": "Consumer Cyclical",
  "consumer discretionary": "Consumer Cyclical",
  discretionary: "Consumer Cyclical",
  "consumer defensive": "Consumer Defensive",
  "consumer staples": "Consumer Defensive",
  staples: "Consumer Defensive",
  industrials: "Industrials",
  industrial: "Industrials",
  energy: "Energy",
  oil: "Energy",
  "oil & gas": "Energy",
  utilities: "Utilities",
  utility: "Utilities",
  "real estate": "Real Estate",
  reit: "Real Estate",
  reits: "Real Estate",
  "communication services": "Communication Services",
  communications: "Communication Services",
  telecom: "Communication Services",
  telecoms: "Communication Services",
  "basic materials": "Basic Materials",
  materials: "Basic Materials",
};

// composite_grade values the model emits, best→worst. Allowlist for `grades`.
export const KNOWN_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"] as const;

// Market codes the generator universe understands (mirrors the universe route).
const COUNTRY_WHITELIST = new Set([
  "GLOBAL", "US", "EU", "CA", "GB", "DE", "FR", "AU", "NL", "CH", "ES", "IT",
  "SE", "DK", "NO", "FI", "BE", "AT", "PT", "IE", "JP",
]);
const BLOCKED_COUNTRIES = new Set(["RU"]);
const isBlocked = (r: { symbol: string; country: string | null }) =>
  BLOCKED_COUNTRIES.has(r.country ?? "") || r.symbol.endsWith(".ME") || r.symbol.endsWith(".IL");
const US_EXCH = new Set(["NYSE", "NASDAQ", "AMEX", "NYSE American", "NYSEArca"]);
const isUsTicker = (s: string) => /^[A-Z]{1,5}$/.test(s) || /^[A-Z]{1,4}\.[AB]$/.test(s);

const GRADE_RANK: Record<string, number> = {
  "A+": 11, A: 10, "A-": 9, "B+": 8, B: 7, "B-": 6, "C+": 5, C: 4, "C-": 3, D: 2, F: 1,
};

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && isFinite(n) ? n : null;
};
const clampNum = (v: number | null, lo: number, hi: number): number | null =>
  v == null ? null : Math.max(lo, Math.min(hi, v));

// Coerce an arbitrary (LLM-produced or user) object into a safe ScreenSpec.
// Unknown sectors/grades are dropped; numbers clamped to sane ranges; an
// out-of-list country falls back to US. NEVER throws.
export function validateScreenSpec(raw: unknown): ScreenSpec {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  // country: uppercased, comma-list ≤4, each in whitelist; default US.
  let country = "US";
  if (typeof o.country === "string" && o.country.trim()) {
    const codes = o.country
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => COUNTRY_WHITELIST.has(c))
      .slice(0, 4);
    if (codes.length) country = codes.join(",");
  }

  const sectorsIn = Array.isArray(o.sectors) ? o.sectors : [];
  const sectors = Array.from(
    new Set(
      sectorsIn
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .map((s) => {
          if (!s) return "";
          const exact = (KNOWN_SECTORS as readonly string[]).find((k) => k.toLowerCase() === s.toLowerCase());
          return exact ?? SECTOR_ALIASES[s.toLowerCase()] ?? "";
        })
        .filter(Boolean),
    ),
  );

  const gradesIn = Array.isArray(o.grades) ? o.grades : [];
  const grades = Array.from(
    new Set(
      gradesIn
        .map((g) => (typeof g === "string" ? g.trim().toUpperCase() : ""))
        .filter((g) => (KNOWN_GRADES as readonly string[]).includes(g)),
    ),
  );

  const sortBy: ScreenSortBy = (["yield", "vol", "cap", "grade", "profit"] as const).includes(o.sortBy as ScreenSortBy)
    ? (o.sortBy as ScreenSortBy)
    : "grade";
  const sortDir: "asc" | "desc" = o.sortDir === "asc" ? "asc" : "desc";

  return {
    country,
    sectors,
    minYield: clampNum(num(o.minYield), 0, 100),
    maxYield: clampNum(num(o.maxYield), 0, 100),
    minCapUsd: clampNum(num(o.minCapUsd), 0, 1e13),
    maxCapUsd: clampNum(num(o.maxCapUsd), 0, 1e13),
    grades,
    minVol: clampNum(num(o.minVol), 0, 100),
    maxVol: clampNum(num(o.maxVol), 0, 100),
    // Pillar scores (profit/value/etc.) are a 1-5 scale in stock_ratings_daily
    // (5 = best, avg ~3), NOT 0-100 — clamp accordingly so the planner can't
    // emit an unreachable floor.
    minProfit: clampNum(num(o.minProfit), 1, 5),
    sortBy,
    sortDir,
    limit: Math.round(clampNum(num(o.limit), 5, 120) ?? 40),
    includeEtfs: o.includeEtfs === true,
  };
}

// Cash leg — always present so the optimizer has a risk-free sizing anchor.
function cashInstrument(): GenInstrument {
  return {
    tk: "CASH", name: "Cash & Equivalents", cls: "cash", kind: "cash", sector: "Cash",
    yield: 4.3, beta: 0, vol: 0.2, er: 4.3, q: 99, rate: "—", etf: false, type: "cash",
  };
}

// Resolve the screen's `country` into the concrete market codes to fetch.
// GLOBAL fans out to the major developed markets (caps are FX-normalized to USD
// afterward so high-denomination currencies don't dominate ranking).
function resolveMarkets(country: string): { ccList: string[]; isGlobal: boolean; usOnly: boolean } {
  const codes = country.split(",").map((c) => c.trim().toUpperCase()).filter((c) => COUNTRY_WHITELIST.has(c));
  const isGlobal = codes.length === 0 || codes.includes("GLOBAL");
  const ccList = isGlobal ? ["US", "EU", "GB", "CH", "CA", "JP", "AU"] : codes;
  const usOnly = ccList.length === 1 && ccList[0] === "US";
  return { ccList, isGlobal, usOnly };
}

export type ScreenResult = {
  universe: GenInstrument[];
  matched: number; // stocks passing the spec (pre-limit)
  scanned: number; // candidate pool size after floors
};

// Run a validated spec against the DB and return a generator-ready universe.
export async function buildScreenedUniverse(spec: ScreenSpec): Promise<ScreenResult> {
  const { ccList, isGlobal, usOnly } = resolveMarkets(spec.country);

  const [pools, fx] = await Promise.all([
    Promise.all(
      ccList.map((cc) =>
        // minDividend 0.01 keeps the universe to dividend payers (the site's
        // identity); yield-band filtering happens after.
        listStocks({ country: cc, minMarketCap: 250e6, minDividend: 0.01, limit: 600 }).catch(() => [] as StockRow[]),
      ),
    ),
    fxRatesToUSD().catch(() => new Map<string, number>()),
  ]);

  const toUsd = (v: number | null | undefined, currency: string | null) => {
    if (v == null) return 0;
    if (!currency || currency === "USD") return v;
    return v * (fx.get(currency) ?? 0);
  };

  // Dedupe by symbol across markets.
  const seenPool = new Set<string>();
  const pool = pools.flat().filter((r) => (seenPool.has(r.symbol) ? false : (seenPool.add(r.symbol), true)));

  // USD floors: market-cap gate + dollar-ADV liquidity screen (a retail
  // position must be tradeable). Mirrors the curated universe route.
  const minUsdCap = Math.max(1e9, spec.minCapUsd ?? 0);
  const minDollarAdv = isGlobal ? 3e6 : 750_000;
  const cands = pool.filter((r) => {
    if (!r.sector || isBlocked(r)) return false;
    const usdCap = toUsd(r.market_cap, r.currency);
    const usdAdv = ((r.avg_volume ?? r.volume ?? 0) as number) * toUsd(r.price, r.currency);
    if (usdCap < minUsdCap || usdAdv < minDollarAdv) return false;
    if (usOnly && !(isUsTicker(r.symbol) && US_EXCH.has(r.exchange ?? ""))) return false;
    r.market_cap = usdCap; // normalize so downstream cap logic reads USD
    return true;
  });

  // Ratings join, chunked (a single .in() with 1000+ symbols fails silently).
  const ratings = new Map<string, Awaited<ReturnType<typeof getStockRatings>> extends Map<string, infer V> ? V : never>();
  const syms = cands.map((r) => r.symbol);
  for (let i = 0; i < syms.length; i += 250) {
    const part = await getStockRatings(syms.slice(i, i + 250)).catch(() => new Map());
    for (const [k, v] of part) ratings.set(k, v);
  }

  // Map to instruments + carry the rating pillars we filter/sort on.
  type Cand = { inst: GenInstrument; grade: string | null; profit: number | null };
  const sectorSet = new Set(spec.sectors);
  const gradeSet = new Set(spec.grades);
  const seenNames = new Set<string>();

  let matched = 0;
  const passing: Cand[] = [];
  for (const r of cands) {
    const rt = ratings.get(r.symbol) ?? null;
    const inst = stockToGenInstrument(r, rt);
    const grade = rt?.composite_grade ?? null;
    const profit = rt?.profit_score ?? null;

    if (sectorSet.size && !sectorSet.has(inst.sector)) continue;
    if (spec.minYield != null && inst.yield < spec.minYield) continue;
    if (spec.maxYield != null && inst.yield > spec.maxYield) continue;
    if (spec.minCapUsd != null && (inst.capUsd ?? 0) < spec.minCapUsd) continue;
    if (spec.maxCapUsd != null && (inst.capUsd ?? Infinity) > spec.maxCapUsd) continue;
    if (spec.minVol != null && inst.vol < spec.minVol) continue;
    if (spec.maxVol != null && inst.vol > spec.maxVol) continue;
    if (gradeSet.size && (!grade || !gradeSet.has(grade))) continue;
    if (spec.minProfit != null && (profit == null || profit < spec.minProfit)) continue;

    // Dedupe by normalized company name (same co. has many listings).
    const nameKey = (inst.name ?? inst.tk).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);

    matched++;
    passing.push({ inst, grade, profit });
  }

  // Sort by the requested key.
  const keyOf = (c: Cand): number => {
    switch (spec.sortBy) {
      case "yield": return c.inst.yield;
      case "vol": return c.inst.vol;
      case "cap": return c.inst.capUsd ?? 0;
      case "profit": return c.profit ?? -1;
      case "grade":
      default: return c.grade ? GRADE_RANK[c.grade] ?? 0 : 0;
    }
  };
  const dir = spec.sortDir === "asc" ? 1 : -1;
  passing.sort((a, b) => (keyOf(a) - keyOf(b)) * dir);

  const stocks = passing.slice(0, spec.limit).map((c) => c.inst);
  const universe: GenInstrument[] = [...stocks, cashInstrument()];

  return { universe, matched, scanned: cands.length };
}

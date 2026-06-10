import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listStocks, getStockRatings, yieldFromStock, fxRatesToUSD } from "@/lib/data";
import { stockToGenInstrument } from "@/lib/gen-instrument";
import type { GenInstrument } from "@/components/generator/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Instrument universe for the Portfolio Generator. Real data:
//  - stocks: top-rated US dividend payers per sector (backend.tickers +
//    stock_ratings_daily), beta/yield/name straight from the DB.
//  - ETFs/bonds: a curated sleeve (broad / dividend / sector / bond) whose
//    name+yield+beta are hydrated from the DB; class/role metadata is design.
// vol/er are model estimates derived from beta + rating (we don't store
// expected returns) — clearly labeled as modelled assumptions in the UI.
// ============================================================================

const US_EXCH = new Set(["NYSE", "NASDAQ", "AMEX", "NYSE American", "NYSEArca"]);
const isUsTicker = (s: string) => /^[A-Z]{1,5}$/.test(s) || /^[A-Z]{1,4}\.[AB]$/.test(s);

// Curated ETF sleeve: [tk, fallbackName, kind, sector, fbYield, beta, vol, er]
// beta/vol/er are design estimates for the optimizer; name+yield hydrate live.
const ETF_SLEEVE: [string, string, GenInstrument["kind"], string, number, number, number, number][] = [
  ["VTI", "Vanguard Total US Market", "broad", "Diversified", 1.3, 1.0, 16, 8.0],
  ["VOO", "Vanguard S&P 500", "broad", "Diversified", 1.3, 1.0, 16, 8.0],
  ["QQQ", "Invesco QQQ (Nasdaq-100)", "broad", "Diversified", 0.55, 1.12, 21, 10.4],
  ["IWM", "iShares Russell 2000", "broad", "Diversified", 1.3, 1.18, 22, 8.6],
  ["VXUS", "Vanguard Total Intl Stock", "broad", "Diversified", 3.0, 0.9, 17, 7.0],
  ["VWO", "Vanguard Emerging Markets", "broad", "Diversified", 3.0, 1.05, 20, 7.6],
  ["SCHD", "Schwab US Dividend Equity", "div", "Diversified", 3.6, 0.86, 14, 7.6],
  ["VYM", "Vanguard High Dividend Yield", "div", "Diversified", 3.1, 0.84, 13, 7.2],
  ["DGRO", "iShares Core Dividend Growth", "div", "Diversified", 2.3, 0.92, 14, 8.0],
  ["VIG", "Vanguard Dividend Appreciation", "div", "Diversified", 1.8, 0.9, 14, 8.2],
  ["JEPI", "JPMorgan Equity Premium Income", "div", "Diversified", 7.4, 0.62, 11, 6.4],
  ["JEPQ", "JPMorgan Nasdaq Equity Premium", "div", "Diversified", 9.2, 0.78, 15, 7.8],
  ["SCHY", "Schwab Intl Dividend Equity", "div", "Diversified", 4.2, 0.8, 15, 6.5],
  ["XLK", "Technology Select Sector", "sector", "Technology", 0.7, 1.15, 22, 10.0],
  ["XLV", "Health Care Select Sector", "sector", "Healthcare", 1.6, 0.75, 15, 7.5],
  ["XLF", "Financial Select Sector", "sector", "Financial Services", 1.7, 1.1, 20, 8.0],
  ["XLY", "Consumer Discretionary Sector", "sector", "Consumer Cyclical", 0.8, 1.2, 22, 8.6],
  ["XLP", "Consumer Staples Sector", "sector", "Consumer Defensive", 2.6, 0.55, 13, 6.4],
  ["XLI", "Industrial Select Sector", "sector", "Industrials", 1.5, 1.05, 18, 7.8],
  ["XLE", "Energy Select Sector", "sector", "Energy", 3.3, 0.95, 26, 7.4],
  ["XLU", "Utilities Select Sector", "sector", "Utilities", 3.0, 0.5, 15, 6.0],
  ["XLRE", "Real Estate Select Sector", "sector", "Real Estate", 3.5, 0.9, 20, 6.8],
  ["XLC", "Communication Services Sector", "sector", "Communication Services", 0.9, 1.05, 20, 9.0],
  ["XLB", "Materials Select Sector", "sector", "Basic Materials", 1.9, 1.0, 20, 7.0],
];

// Bond/cash sleeve — static design rows (bond ETF yields hydrate from DB too).
const BOND_SLEEVE: [string, string, number, number, number, number][] = [
  // [tk, fallbackName, fbYield, beta, vol, er]
  ["BND", "Vanguard Total Bond Market", 4.3, 0.08, 6, 4.5],
  ["AGG", "iShares Core US Aggregate", 4.2, 0.08, 6, 4.4],
  ["SGOV", "iShares 0-3 Month Treasury", 5.0, 0.0, 1, 5.0],
  ["TLT", "iShares 20+ Year Treasury", 4.2, -0.25, 14, 4.0],
  ["VCIT", "Vanguard Interm Corp Bond", 5.1, 0.2, 8, 5.2],
  ["TIP", "iShares TIPS Bond", 3.8, 0.1, 7, 4.2],
];

// "EU" = the whole EU bloc; "GLOBAL" = no market preference (everything,
// higher cap floor so the default stays liquid). Multiple markets may be
// combined ("EU,CH,GB" — max 4).
const COUNTRY_WHITELIST = new Set([
  "GLOBAL", "US", "EU", "CA", "GB", "DE", "FR", "AU", "NL", "CH", "ES", "IT",
  "SE", "DK", "NO", "FI", "BE", "AT", "PT", "IE", "JP",
]);
// Sanctioned / untradeable listings never enter the pool.
const BLOCKED_COUNTRIES = new Set(["RU"]);
const isBlocked = (r: { symbol: string; country: string | null }) =>
  BLOCKED_COUNTRIES.has(r.country ?? "") || r.symbol.endsWith(".ME");

async function buildUniverse(countryParam: string): Promise<GenInstrument[]> {
  const codes = countryParam
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => COUNTRY_WHITELIST.has(c))
    .slice(0, 4);
  const isGlobal = codes.length === 0 || codes.includes("GLOBAL");
  // CRITICAL: mkt_cap/price are stored in LOCAL currency (an Indonesian small
  // cap reads as "4.5 trillion" and outranks Apple). A raw country=ALL fetch
  // sorted by mkt_cap floods the pool with high-denomination currencies, so
  // GLOBAL fetches the major developed markets individually and everything is
  // converted to USD before floors, liquidity screens and ranking.
  const ccList = isGlobal ? ["US", "EU", "GB", "CH", "CA", "JP", "AU"] : codes;
  const sleeveSymbols = [...ETF_SLEEVE.map((e) => e[0]), ...BOND_SLEEVE.map((b) => b[0])];

  const [pools, sleeveRows, fx] = await Promise.all([
    Promise.all(
      ccList.map((cc) =>
        listStocks({ country: cc, minMarketCap: 250e6, minDividend: 0.01, limit: 600 }).catch(() => [])
      )
    ),
    listStocks({ symbols: sleeveSymbols, excludeEtfs: false, limit: sleeveSymbols.length }),
    fxRatesToUSD().catch(() => new Map<string, number>()),
  ]);
  const toUsd = (v: number | null | undefined, currency: string | null) => {
    if (v == null) return 0;
    if (!currency || currency === "USD") return v;
    return v * (fx.get(currency) ?? 0);
  };
  const seenPool = new Set<string>();
  const pool = pools.flat().filter((r) => (seenPool.has(r.symbol) ? false : (seenPool.add(r.symbol), true)));

  const bySym = new Map(sleeveRows.map((r) => [r.symbol, r]));

  // For the US, also require a clean primary-exchange listing; foreign markets
  // use suffixed symbols (SAP.DE, …) so those filters don't apply.
  const usOnly = ccList.length === 1 && ccList[0] === "US";
  // USD floors: market-cap gate + LIQUIDITY screen (dollar daily volume — a
  // retail position must be tradeable without moving the market). avg_volume
  // is null for ~all rows, so fall back to the latest day's volume.
  const minUsdCap = isGlobal ? 5e9 : 1e9;
  const minDollarAdv = isGlobal ? 3e6 : 750_000;
  const cands = pool
    .filter((r) => {
      if (!r.sector || isBlocked(r)) return false;
      const usdCap = toUsd(r.market_cap, r.currency);
      const usdAdv = ((r.avg_volume ?? r.volume ?? 0) as number) * toUsd(r.price, r.currency);
      if (usdCap < minUsdCap || usdAdv < minDollarAdv) return false;
      if (usOnly && !(isUsTicker(r.symbol) && US_EXCH.has(r.exchange ?? ""))) return false;
      // Normalize the cap to USD so downstream size logic (vol estimate)
      // doesn't misread foreign small caps as mega caps.
      r.market_cap = usdCap;
      return true;
    })
    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
  // Ratings lookup CHUNKED: a single .in() with 1500 symbols exceeds the
  // query limit and fails silently — which left GLOBAL with zero rated names.
  const ratings = new Map<string, Awaited<ReturnType<typeof getStockRatings>> extends Map<string, infer V> ? V : never>();
  const symsAll = cands.map((r) => r.symbol);
  for (let i = 0; i < symsAll.length; i += 250) {
    const part = await getStockRatings(symsAll.slice(i, i + 250)).catch(() => new Map());
    for (const [k, v] of part) ratings.set(k, v);
  }

  // Top-rated names per sector (A/B grades only) so every sector chip has depth.
  const ranked = cands
    .map((r) => ({ r, rt: ratings.get(r.symbol) }))
    .filter((x) => x.rt?.composite_grade && /^[AB]/.test(x.rt.composite_grade))
    .sort((a, b) => (b.rt!.composite_total ?? 0) - (a.rt!.composite_total ?? 0));

  const perSector: Record<string, number> = {};
  const seen = new Set<string>();
  // Same company often has several listings (AIXA.DE / AIX2.F / 0Q3C.L…) —
  // dedupe by normalised company name, keeping the first (best-ranked).
  const seenNames = new Set<string>();
  const stocks: GenInstrument[] = [];
  const take = (r: (typeof cands)[number], rt?: ReturnType<typeof ratings.get>) => {
    const sec = r.sector!;
    const nameKey = (r.name ?? r.symbol).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
    if (seen.has(r.symbol) || seenNames.has(nameKey) || (perSector[sec] ?? 0) >= 16) return;
    perSector[sec] = (perSector[sec] ?? 0) + 1;
    seen.add(r.symbol);
    seenNames.add(nameKey);
    stocks.push(stockToGenInstrument(r, rt ?? null));
  };
  for (const { r, rt } of ranked) {
    take(r, rt);
    if (stocks.length >= 200) break;
  }
  // Smaller markets may have few rated names — backfill by market cap so the
  // generator still has a workable pool (grades show as "—").
  if (stocks.length < 25) {
    for (const r of cands) {
      take(r, ratings.get(r.symbol));
      if (stocks.length >= 60) break;
    }
  }

  const etfs: GenInstrument[] = ETF_SLEEVE.map(([tk, fbName, kind, sector, fbYield, beta, vol, er]) => {
    const row = bySym.get(tk);
    const yld = row ? row.dividend_yield ?? yieldFromStock(row) ?? fbYield : fbYield;
    return {
      tk, name: row?.name ?? fbName, cls: "eq" as const, kind, sector,
      yield: +(yld ?? fbYield).toFixed(2), beta, vol, er,
      q: kind === "div" ? 84 : 82, rate: kind === "div" ? "A" : "A-",
      etf: true, type: "etf" as const,
    };
  });

  const bonds: GenInstrument[] = BOND_SLEEVE.map(([tk, fbName, fbYield, beta, vol, er]) => {
    const row = bySym.get(tk);
    const yld = row ? row.dividend_yield ?? yieldFromStock(row) ?? fbYield : fbYield;
    return {
      tk, name: row?.name ?? fbName, cls: "bond" as const, kind: "bond" as const,
      sector: "Fixed Income", yield: +(yld ?? fbYield).toFixed(2), beta, vol, er,
      q: 88, rate: "A", etf: true, type: "bond" as const,
    };
  });

  const cashYield = bonds.find((b) => b.tk === "SGOV")?.yield ?? 4.3;
  const cash: GenInstrument = {
    tk: "CASH", name: "Cash & Equivalents", cls: "cash", kind: "cash", sector: "Cash",
    yield: cashYield, beta: 0, vol: 0.2, er: cashYield, q: 99, rate: "—", etf: false, type: "cash",
  };

  return [...etfs, ...bonds, cash, ...stocks];
}

// User-independent + heavy (500-row scan + ratings join) → cache 1h.
// unstable_cache keys on the call args, so each country caches separately.
const cachedUniverse = unstable_cache(buildUniverse, ["v3:genUniverse"], { revalidate: 3600 });

export async function GET(req: Request) {
  try {
    const country = (new URL(req.url).searchParams.get("country") ?? "US").toUpperCase();
    const universe = await cachedUniverse(country);
    if (universe.length < 20) {
      return NextResponse.json({ error: "Universe unavailable" }, { status: 503 });
    }
    return NextResponse.json(
      { universe },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
    );
  } catch (e) {
    console.error("[api.portfolio.universe]", e);
    return NextResponse.json({ error: "Universe unavailable" }, { status: 503 });
  }
}

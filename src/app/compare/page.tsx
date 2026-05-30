import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareSearch } from "./compare-search";
import {
  getStock,
  getEtfDetail,
  getStockRating,
  getEtfHoldings,
  getStockExtras,
  historicalPrices,
} from "@/lib/data";
import { getBackendClient } from "@/lib/supabase/admin";
import { formatCurrency, formatPercent } from "@/lib/format";
import { APP_NAME } from "@/lib/branding";

// Compare tool: side-by-side view of 2–4 stocks/ETFs.
//
// Hits the long-tail "X vs Y" SEO queries that drive a lot of dividend
// research traffic. Each comparison is a real landing page with its
// canonical URL, OG image, and indexed metrics — so Google can serve it
// when someone searches "SCHD vs VYM" or "JEPI vs JEPQ".
//
// Detection:
//   - getStock() returns the ticker row with is_etf flag
//   - if is_etf=true, we load ETF detail + holdings and compute TTM yield
//     (because last_div is NULL on most ETF rows)
//   - otherwise load stock extras (streak, CAGR, payout, returns) + rating
//
// Winner highlighting:
//   - Per-metric direction (high or low wins) drives a green pill behind
//     the best value in the row. Subtle but clearly visual. Not just green
//     text — a soft glow + "Best" badge so the eye lands on it first.
//
// ETF similarity:
//   - Cosine similarity on holding-weight vectors. Only renders when
//     2+ ETFs are in the comparison — hidden for stock-only sets.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_SYMBOLS = 4;
const SLOTS = ["a", "b", "c", "d"] as const;

function parseSymbols(sp: Record<string, string | string[] | undefined>): string[] {
  const out: string[] = [];
  for (const slot of SLOTS) {
    const v = sp[slot];
    if (typeof v === "string" && v.trim().length > 0) {
      out.push(v.trim().toUpperCase());
    }
  }
  return Array.from(new Set(out)).slice(0, MAX_SYMBOLS);
}

function buildQueryString(symbols: string[]): string {
  return symbols.map((s, i) => `${SLOTS[i]}=${encodeURIComponent(s)}`).join("&");
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const symbols = parseSymbols(sp);
  if (symbols.length < 2) {
    return {
      title: "Compare Dividend Stocks & ETFs Side by Side",
      description:
        "Compare dividend stocks and ETFs side by side. Yield, payout ratio, dividend growth, rating, expense ratio, and holdings overlap — built for fast dividend research.",
      alternates: { canonical: "/compare" },
    };
  }
  const joined = symbols.join(" vs ");
  const qs = buildQueryString(symbols);
  const description = `${joined}: side-by-side dividend comparison. Yield, payout ratio, dividend growth streak, rating, 1Y/3Y returns, expense ratio, and holdings overlap. Real-time data from ${APP_NAME}.`;
  return {
    title: `${joined} — Dividend Stock & ETF Comparison`,
    description,
    keywords: [
      ...symbols.map((s) => `${s} dividend`),
      ...symbols.map((s) => `${s} yield`),
      `${joined} comparison`,
      `${joined} dividend`,
      "compare dividend stocks",
      "compare dividend ETFs",
    ],
    alternates: { canonical: `/compare?${qs}` },
    openGraph: {
      title: `${joined} — Dividend Comparison | ${APP_NAME}`,
      description,
      type: "website",
      url: `https://uncoverd.org/compare?${qs}`,
      images: [
        {
          url: `/api/og/compare?${qs}`,
          width: 1200,
          height: 630,
          alt: `${joined} dividend comparison`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${joined} — Dividend Comparison`,
      description,
      images: [`/api/og/compare?${qs}`],
    },
  };
}

type ColumnData = {
  symbol: string;
  name: string | null;
  kind: "stock" | "etf" | "missing";
  // Core
  price: number | null;
  changePercent: number | null;
  yieldPct: number | null;
  // Stock/ETF mass
  marketCap: number | null;
  aum: number | null;
  // ETF specifics
  expenseRatio: number | null;
  topHoldings: { asset: string; name: string | null; weight: number | null }[];
  // Stock specifics
  peRatio: number | null;
  beta: number | null;
  sector: string | null;
  industry: string | null;
  composite: number | null;
  grade: string | null;
  streakYears: number | null;
  divCagr5y: number | null;
  payoutRatio: number | null;
  netDebtToEbitda: number | null;
  return1y: number | null;
  return3y: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  pctOff52wHigh: number | null;
};

const EMPTY_COLUMN = (symbol: string): ColumnData => ({
  symbol,
  name: null,
  kind: "missing",
  price: null,
  changePercent: null,
  yieldPct: null,
  marketCap: null,
  aum: null,
  expenseRatio: null,
  topHoldings: [],
  peRatio: null,
  beta: null,
  sector: null,
  industry: null,
  composite: null,
  grade: null,
  streakYears: null,
  divCagr5y: null,
  payoutRatio: null,
  netDebtToEbitda: null,
  return1y: null,
  return3y: null,
  yearHigh: null,
  yearLow: null,
  pctOff52wHigh: null,
});

// Compute TTM yield from the dividends table. Used for ETFs because their
// tickers.last_div is NULL — same logic as enrichEtfYieldsFromDividends in
// data.ts but for a single symbol.
async function computeTtmYieldPct(symbol: string, price: number | null): Promise<number | null> {
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
  if (ttm <= 0) return null;
  return (ttm / price) * 100;
}

// Compute 1Y and 3Y total price change (%) from historical_prices_stocks.
// Distinct from total return — we don't reinvest dividends. Good enough
// for compare-page level of fidelity; tagged honestly as "1Y price" not
// "1Y total return" to avoid misrepresentation.
async function computePriceReturns(symbol: string): Promise<{ return1y: number | null; return3y: number | null }> {
  const days = 365 * 3 + 30; // a little buffer past 3Y
  const rows = await historicalPrices(symbol, days);
  if (rows.length < 30) return { return1y: null, return3y: null };
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const latestClose = Number(sorted[sorted.length - 1].close);
  if (!isFinite(latestClose) || latestClose <= 0) return { return1y: null, return3y: null };
  function priceAtIndex(idx: number): number | null {
    if (idx < 0 || idx >= sorted.length) return null;
    const v = Number(sorted[idx].close);
    return isFinite(v) && v > 0 ? v : null;
  }
  // Approx trading-day offsets — close enough on a 1Y/3Y horizon
  const oneYIdx = sorted.length - 252;
  const threeYIdx = sorted.length - 252 * 3;
  const a = priceAtIndex(oneYIdx);
  const b = priceAtIndex(threeYIdx);
  return {
    return1y: a != null ? ((latestClose - a) / a) * 100 : null,
    return3y: b != null ? ((latestClose - b) / b) * 100 : null,
  };
}

async function loadColumn(symbol: string): Promise<ColumnData> {
  // One ticker fetch first. The is_etf flag is the source of truth — we don't
  // dual-fetch ETF detail for every symbol (the old bug was returning ETF
  // shape for stocks because getEtfDetail doesn't filter by is_etf).
  const base = await getStock(symbol);
  if (!base) return EMPTY_COLUMN(symbol);

  const isEtf = base.is_etf === true || base.is_fund === true;

  if (isEtf) {
    const [etfDetail, holdings] = await Promise.all([
      getEtfDetail(symbol),
      getEtfHoldings(symbol, 25),
    ]);
    const detail = etfDetail ?? base;
    // ETF yield: tickers.last_div is null for SCHD/VYM/VTI/JEPI etc, so
    // detail.dividend_yield is null. Compute from TTM dividends.
    let yieldPct = detail.dividend_yield;
    if (yieldPct == null) {
      yieldPct = await computeTtmYieldPct(symbol, detail.price);
    }
    return {
      ...EMPTY_COLUMN(symbol),
      name: detail.name,
      kind: "etf",
      price: detail.price ?? null,
      changePercent: detail.change_percent ?? null,
      yieldPct,
      aum: detail.aum ?? null,
      expenseRatio: detail.expense_ratio ?? null,
      sector: detail.sector ?? null,
      topHoldings: holdings.map((h) => ({
        asset: h.asset,
        name: h.name,
        weight: h.weight_percentage,
      })),
    };
  }

  // Stock path: pull extras (streak, CAGR, payout, etc.), rating, and
  // price returns in parallel.
  const [rating, extrasMap, returns] = await Promise.all([
    getStockRating(symbol).catch(() => null),
    getStockExtras([symbol]).catch(() => new Map()),
    computePriceReturns(symbol).catch(() => ({ return1y: null, return3y: null })),
  ]);
  const ex = extrasMap.get(symbol);

  return {
    ...EMPTY_COLUMN(symbol),
    name: base.name,
    kind: "stock",
    price: base.price ?? null,
    changePercent: base.change_percent ?? null,
    yieldPct: base.dividend_yield ?? null,
    marketCap: base.market_cap ?? null,
    peRatio: base.pe_ratio ?? ex?.peRatio ?? null,
    beta: base.beta ?? null,
    sector: base.sector ?? null,
    industry: base.industry ?? null,
    composite: rating?.composite_total ?? null,
    grade: rating?.composite_grade ?? null,
    streakYears: ex?.consecutiveIncreases ?? null,
    divCagr5y: ex?.divCagr5y ?? null,
    // payoutRatio in extras is a fraction (0-1); normalize to percent for display
    payoutRatio: ex?.payoutRatio != null ? ex.payoutRatio * 100 : null,
    netDebtToEbitda: ex?.netDebtToEbitda ?? null,
    return1y: returns.return1y,
    return3y: returns.return3y,
    yearHigh: ex?.yearHigh ?? null,
    yearLow: ex?.yearLow ?? null,
    pctOff52wHigh: ex?.pctOff52wHigh ?? null,
  };
}

// Cosine similarity on holding-weight vectors.
function holdingsSimilarity(
  a: { asset: string; weight: number | null }[],
  b: { asset: string; weight: number | null }[],
): number {
  const am = new Map<string, number>();
  const bm = new Map<string, number>();
  for (const h of a) if (h.weight != null) am.set(h.asset, Number(h.weight));
  for (const h of b) if (h.weight != null) bm.set(h.asset, Number(h.weight));
  const keys = new Set([...am.keys(), ...bm.keys()]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const k of keys) {
    const av = am.get(k) ?? 0;
    const bv = bm.get(k) ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildSwapUrl(currentSymbols: string[], replaceIndex: number, withSymbol: string | null): string {
  const next = [...currentSymbols];
  if (withSymbol === null) next.splice(replaceIndex, 1);
  else next[replaceIndex] = withSymbol;
  const filtered = next.filter(Boolean);
  if (filtered.length === 0) return "/compare";
  return `/compare?${buildQueryString(filtered)}`;
}

// ---------------------------------------------------------------------------
// Winner-detection: for each metric, find which column has the "best" value
// according to direction (high/low). Returns the symbol that wins, or null
// if there's a tie or insufficient data.
// ---------------------------------------------------------------------------

type WinnerDirection = "high" | "low";

function findWinner(
  cols: ColumnData[],
  picker: (c: ColumnData) => number | null,
  direction: WinnerDirection,
): string | null {
  const candidates: { symbol: string; value: number }[] = [];
  for (const c of cols) {
    const v = picker(c);
    if (v == null || !isFinite(v)) continue;
    candidates.push({ symbol: c.symbol, value: v });
  }
  if (candidates.length < 2) return null;
  candidates.sort((a, b) => (direction === "high" ? b.value - a.value : a.value - b.value));
  // If top two are within 0.5% of each other, it's a tie — don't highlight.
  const top = candidates[0];
  const second = candidates[1];
  const diff = Math.abs(top.value - second.value);
  const denom = Math.abs(top.value) || 1;
  if (diff / denom < 0.005) return null;
  return top.symbol;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const symbols = parseSymbols(sp);

  if (symbols.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="dv-page">
          <section className="dv-compare-hero">
            <div className="dv-eyebrow">Tools</div>
            <h1 style={{ margin: "0.4rem 0", fontSize: "2.1rem", letterSpacing: "-0.02em" }}>
              Compare dividend stocks & ETFs
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: 640, fontSize: "1.02rem", lineHeight: 1.55 }}>
              Drop in 2–4 tickers. See yield, dividend growth, payout, rating,
              expense ratio, returns, and ETF overlap — side by side. Stock-vs-stock,
              ETF-vs-ETF, or mixed.
            </p>
          </section>
          <section className="panel stack" style={{ marginTop: "1.5rem" }}>
            <CompareSearch slot="a" currentSymbols={[]} />
          </section>
          <section className="dv-section" style={{ marginTop: "2.5rem" }}>
            <h2 className="dv-section__title">Popular comparisons</h2>
            <div className="dv-compare-examples">
              {[
                { label: "SCHD vs VYM vs DGRO", path: "/compare?a=SCHD&b=VYM&c=DGRO", desc: "Three popular dividend ETFs" },
                { label: "JEPI vs JEPQ", path: "/compare?a=JEPI&b=JEPQ", desc: "Covered-call income ETFs" },
                { label: "JNJ vs KO vs PG", path: "/compare?a=JNJ&b=KO&c=PG", desc: "Three Dividend Kings" },
                { label: "VIG vs NOBL", path: "/compare?a=VIG&b=NOBL", desc: "Dividend growth ETFs" },
                { label: "O vs STAG vs WPC", path: "/compare?a=O&b=STAG&c=WPC", desc: "Monthly-paying REITs" },
                { label: "SCHD vs JEPI vs DGRO", path: "/compare?a=SCHD&b=JEPI&c=DGRO", desc: "Yield vs growth vs income" },
              ].map((e) => (
                <Link key={e.path} href={e.path} className="dv-compare-example-card">
                  <span className="dv-compare-example-card__title">{e.label}</span>
                  <span className="dv-compare-example-card__desc">{e.desc}</span>
                </Link>
              ))}
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const columns = await Promise.all(symbols.map((s) => loadColumn(s)));
  const etfCols = columns.filter((c) => c.kind === "etf");
  const headline = symbols.join(" vs ");
  const qs = buildQueryString(symbols);

  // Pre-compute winners per metric.
  const winners = {
    yield: findWinner(columns, (c) => c.yieldPct, "high"),
    streak: findWinner(columns, (c) => c.streakYears, "high"),
    cagr5y: findWinner(columns, (c) => c.divCagr5y, "high"),
    payout: findWinner(columns, (c) => c.payoutRatio, "low"),
    return1y: findWinner(columns, (c) => c.return1y, "high"),
    return3y: findWinner(columns, (c) => c.return3y, "high"),
    rating: findWinner(columns, (c) => c.composite, "high"),
    pe: findWinner(columns, (c) => c.peRatio, "low"),
    beta: findWinner(columns, (c) => c.beta, "low"),
    netDebt: findWinner(columns, (c) => c.netDebtToEbitda, "low"),
    aum: findWinner(columns, (c) => c.aum, "high"),
    expense: findWinner(columns, (c) => c.expenseRatio, "low"),
  };

  const hasStocks = columns.some((c) => c.kind === "stock");
  const hasEtfs = etfCols.length > 0;
  const showSimilarity = etfCols.length >= 2;

  // Pairwise similarities (ETFs only).
  const similarities: { a: string; b: string; score: number }[] = [];
  if (showSimilarity) {
    for (let i = 0; i < etfCols.length; i++) {
      for (let j = i + 1; j < etfCols.length; j++) {
        similarities.push({
          a: etfCols[i].symbol,
          b: etfCols[j].symbol,
          score: holdingsSimilarity(etfCols[i].topHoldings, etfCols[j].topHoldings),
        });
      }
    }
  }

  const colCount = columns.length;

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section className="dv-compare-hero">
          <div className="dv-eyebrow">Compare</div>
          <h1 style={{ margin: "0.4rem 0", fontSize: "2.1rem", letterSpacing: "-0.02em" }}>
            {headline}
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Side-by-side dividend comparison. Green badges mark the leader on each metric.
          </p>
        </section>

        {colCount < MAX_SYMBOLS && (
          <section className="panel" style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
            <CompareSearch slot={SLOTS[colCount]} currentSymbols={symbols} />
          </section>
        )}

        {/* Column headers (tickers + names) */}
        <section className="dv-compare-grid" style={gridStyle(colCount)}>
          {columns.map((c, i) => (
            <ColumnHeader key={c.symbol} col={c} removeUrl={buildSwapUrl(symbols, i, null)} />
          ))}
        </section>

        {/* Hero metric row: yield (the headline number for dividend research) */}
        <MetricSection title="Headline" cols={colCount}>
          <MetricRow
            label="Dividend Yield"
            cols={columns}
            winnerSymbol={winners.yield}
            valueFor={(c) => c.yieldPct}
            format={(v) => formatPercent(v, 2)}
            hero
          />
          <MetricRow
            label="Day change"
            cols={columns}
            winnerSymbol={null}
            valueFor={(c) => c.changePercent}
            format={(v) => formatPercent(v, 2)}
            tone={(v) => (v == null ? undefined : v >= 0 ? "positive" : "negative")}
          />
          <MetricRow
            label="Price"
            cols={columns}
            winnerSymbol={null}
            valueFor={(c) => c.price}
            format={(v) => formatCurrency(v)}
          />
        </MetricSection>

        {/* Income section: yield + streak + CAGR + payout (stocks only fields gracefully degrade) */}
        {hasStocks && (
          <MetricSection title="Income & Growth" cols={colCount}>
            <MetricRow
              label="Consecutive raises"
              cols={columns}
              winnerSymbol={winners.streak}
              valueFor={(c) => c.streakYears}
              format={(v) => `${Math.round(v)} years`}
            />
            <MetricRow
              label="5Y dividend CAGR"
              cols={columns}
              winnerSymbol={winners.cagr5y}
              valueFor={(c) => c.divCagr5y}
              format={(v) => formatPercent(v, 1)}
            />
            <MetricRow
              label="Payout ratio"
              cols={columns}
              winnerSymbol={winners.payout}
              valueFor={(c) => c.payoutRatio}
              format={(v) => formatPercent(v, 0)}
              winnerHint="Lower is safer"
            />
          </MetricSection>
        )}

        {/* Performance section */}
        <MetricSection title="Performance" cols={colCount}>
          <MetricRow
            label="1-year price"
            cols={columns}
            winnerSymbol={winners.return1y}
            valueFor={(c) => c.return1y}
            format={(v) => formatPercent(v, 1)}
            tone={(v) => (v == null ? undefined : v >= 0 ? "positive" : "negative")}
          />
          <MetricRow
            label="3-year price"
            cols={columns}
            winnerSymbol={winners.return3y}
            valueFor={(c) => c.return3y}
            format={(v) => formatPercent(v, 1)}
            tone={(v) => (v == null ? undefined : v >= 0 ? "positive" : "negative")}
          />
          <MetricRow
            label="% off 52w high"
            cols={columns}
            winnerSymbol={null}
            valueFor={(c) => c.pctOff52wHigh}
            format={(v) => formatPercent(v, 1)}
          />
        </MetricSection>

        {/* Quality section (stocks only) */}
        {hasStocks && (
          <MetricSection title="Quality" cols={colCount}>
            <MetricRow
              label="Rating"
              cols={columns}
              winnerSymbol={winners.rating}
              valueFor={(c) => c.composite}
              format={(v, c) => (c?.grade ? `${c.grade} (${Math.round(v)})` : Math.round(v).toString())}
              gradeFor={(c) => c.grade}
            />
            <MetricRow
              label="P/E ratio"
              cols={columns}
              winnerSymbol={winners.pe}
              valueFor={(c) => c.peRatio}
              format={(v) => v.toFixed(2)}
              winnerHint="Lower = cheaper"
            />
            <MetricRow
              label="Beta"
              cols={columns}
              winnerSymbol={winners.beta}
              valueFor={(c) => c.beta}
              format={(v) => v.toFixed(2)}
              winnerHint="Lower = less volatile"
            />
            <MetricRow
              label="Net debt / EBITDA"
              cols={columns}
              winnerSymbol={winners.netDebt}
              valueFor={(c) => c.netDebtToEbitda}
              format={(v) => v.toFixed(2)}
              winnerHint="Lower = stronger balance sheet"
            />
            <MetricRow
              label="Market cap"
              cols={columns}
              winnerSymbol={null}
              valueFor={(c) => c.marketCap}
              format={(v) => formatCurrency(v, { abbreviate: true })}
            />
          </MetricSection>
        )}

        {/* ETF specifics */}
        {hasEtfs && (
          <MetricSection title="ETF mechanics" cols={colCount}>
            <MetricRow
              label="AUM"
              cols={columns}
              winnerSymbol={winners.aum}
              valueFor={(c) => c.aum}
              format={(v) => formatCurrency(v, { abbreviate: true })}
            />
            <MetricRow
              label="Expense ratio"
              cols={columns}
              winnerSymbol={winners.expense}
              valueFor={(c) => c.expenseRatio}
              format={(v) => formatPercent(v, 2)}
              winnerHint="Lower = cheaper to hold"
            />
          </MetricSection>
        )}

        {/* Top holdings — ETFs only, side-by-side */}
        {hasEtfs && etfCols.some((c) => c.topHoldings.length > 0) && (
          <section className="dv-section" style={{ marginTop: "2rem" }}>
            <h2 className="dv-section__title">Top holdings</h2>
            <div className="dv-compare-grid" style={gridStyle(colCount)}>
              {columns.map((c) => (
                <div key={`hold-${c.symbol}`} className="dv-compare-holdings-card">
                  <div className="dv-compare-holdings-card__sym">{c.symbol}</div>
                  {c.kind === "etf" && c.topHoldings.length > 0 ? (
                    <div>
                      {c.topHoldings.slice(0, 8).map((h) => (
                        <div key={h.asset} className="dv-compare-holdings-card__row">
                          <span className="dv-compare-holdings-card__asset">{h.asset}</span>
                          <span className="dv-compare-holdings-card__weight">
                            {h.weight != null ? `${Number(h.weight).toFixed(2)}%` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="dv-compare-holdings-card__empty">—</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ETF similarity — only when 2+ ETFs */}
        {showSimilarity && similarities.length > 0 && (
          <section className="dv-section" style={{ marginTop: "2rem" }}>
            <h2 className="dv-section__title">How similar are these ETFs?</h2>
            <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.92rem" }}>
              Cosine similarity on top-25 holdings, weighted by position size.
              1.0 = identical positions at identical weights. Surface-level
              "different fund" labels can hide near-duplicate exposure.
            </p>
            <div className="dv-compare-similarity-grid">
              {similarities.map((s) => (
                <div key={`${s.a}-${s.b}`} className="dv-compare-similarity-card">
                  <div className="dv-compare-similarity-card__pair">
                    <span>{s.a}</span>
                    <span className="dv-compare-similarity-card__arrow">↔</span>
                    <span>{s.b}</span>
                  </div>
                  <div className="dv-compare-similarity-card__score">
                    {(s.score * 100).toFixed(0)}%
                  </div>
                  <div
                    className={`dv-compare-similarity-card__label dv-compare-similarity-card__label--${similarityTier(s.score)}`}
                  >
                    {similarityLabel(s.score)}
                  </div>
                  <div className="dv-compare-similarity-card__bar">
                    <div
                      className={`dv-compare-similarity-card__bar-fill dv-compare-similarity-card__bar-fill--${similarityTier(s.score)}`}
                      style={{ width: `${Math.max(2, s.score * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Share section with OG image preview */}
        <section className="dv-compare-share" style={{ marginTop: "2.5rem" }}>
          <div className="dv-compare-share__head">
            <div>
              <div className="dv-eyebrow" style={{ fontSize: "0.7rem" }}>Share this comparison</div>
              <div className="dv-compare-share__title">{headline}</div>
              <div className="dv-compare-share__url">{`uncoverd.org/compare?${qs}`}</div>
            </div>
            <div className="dv-compare-share__buttons">
              <a
                className="btn"
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(`${headline} — dividend comparison`)}&url=${encodeURIComponent(`https://uncoverd.org/compare?${qs}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on X
              </a>
              <a
                className="btn btn--ghost"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://uncoverd.org/compare?${qs}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on LinkedIn
              </a>
            </div>
          </div>
          {/* Live OG image preview — what people see when they share */}
          <div className="dv-compare-share__preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/og/compare?${qs}`}
              alt={`${headline} comparison preview`}
              width={1200}
              height={630}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// ---------------------------------------------------------------------------
// Tiny visual components used above. Kept inline because they're tightly
// coupled to the layout — extracting to /components/ would just add jumps
// without aiding reuse.
// ---------------------------------------------------------------------------

function gridStyle(n: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
    gap: "0.75rem",
  };
}

function ColumnHeader({ col, removeUrl }: { col: ColumnData; removeUrl: string }) {
  if (col.kind === "missing") {
    return (
      <div className="dv-compare-col-head dv-compare-col-head--missing">
        <div className="dv-compare-col-head__sym">{col.symbol}</div>
        <div className="dv-compare-col-head__missing">Not found</div>
        <Link href={removeUrl} className="dv-compare-col-head__remove" aria-label={`Remove ${col.symbol}`}>×</Link>
      </div>
    );
  }
  const detailHref = col.kind === "etf" ? `/etfs/symbol/${col.symbol}` : `/stocks/${col.symbol}`;
  return (
    <div className="dv-compare-col-head">
      <div className="dv-compare-col-head__top">
        <Link href={detailHref} className="dv-compare-col-head__sym-link">
          <div className="dv-compare-col-head__sym">{col.symbol}</div>
          {col.name && <div className="dv-compare-col-head__name">{col.name}</div>}
        </Link>
        <Link href={removeUrl} className="dv-compare-col-head__remove" aria-label={`Remove ${col.symbol}`}>×</Link>
      </div>
      <div className="dv-compare-col-head__tags">
        <span className={`dv-compare-tag dv-compare-tag--${col.kind}`}>
          {col.kind === "etf" ? "ETF" : "Stock"}
        </span>
        {col.sector && <span className="dv-compare-tag dv-compare-tag--neutral">{col.sector}</span>}
      </div>
    </div>
  );
}

function MetricSection({
  title,
  cols,
  children,
}: {
  title: string;
  cols: number;
  children: React.ReactNode;
}) {
  return (
    <section className="dv-compare-section" style={{ marginTop: "1.5rem" }}>
      <h2 className="dv-compare-section__title">{title}</h2>
      <div className="dv-compare-section__grid" style={{ "--col-count": cols } as React.CSSProperties}>
        {children}
      </div>
    </section>
  );
}

function MetricRow({
  label,
  cols,
  winnerSymbol,
  valueFor,
  format,
  tone,
  hero,
  winnerHint,
  gradeFor,
}: {
  label: string;
  cols: ColumnData[];
  winnerSymbol: string | null;
  valueFor: (c: ColumnData) => number | null;
  format: (value: number, col?: ColumnData) => string;
  tone?: (value: number | null) => "positive" | "negative" | undefined;
  hero?: boolean;
  winnerHint?: string;
  gradeFor?: (c: ColumnData) => string | null;
}) {
  return (
    <>
      <div className={`dv-compare-row__label ${hero ? "dv-compare-row__label--hero" : ""}`}>
        <span>{label}</span>
        {winnerHint && <span className="dv-compare-row__hint">{winnerHint}</span>}
      </div>
      {cols.map((c) => {
        const v = valueFor(c);
        const isWinner = winnerSymbol === c.symbol;
        const toneClass = v != null && tone ? tone(v) : undefined;
        const formatted = v != null ? format(v, c) : "—";
        return (
          <div
            key={`${label}-${c.symbol}`}
            className={[
              "dv-compare-row__cell",
              hero ? "dv-compare-row__cell--hero" : "",
              isWinner ? "dv-compare-row__cell--winner" : "",
              toneClass === "positive" ? "dv-compare-row__cell--positive" : "",
              toneClass === "negative" ? "dv-compare-row__cell--negative" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="dv-compare-row__value">{formatted}</span>
            {isWinner && <span className="dv-compare-row__badge">Best</span>}
            {gradeFor && gradeFor(c) && (
              <span className={`dv-compare-row__grade dv-compare-row__grade--${gradeLetterToTier(gradeFor(c))}`}>
                {gradeFor(c)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function gradeLetterToTier(grade: string | null | undefined): string {
  if (!grade) return "neutral";
  const first = grade.charAt(0).toUpperCase();
  if (first === "A") return "best";
  if (first === "B") return "good";
  if (first === "C") return "neutral";
  return "weak";
}

function similarityTier(score: number): "near" | "strong" | "some" | "low" {
  if (score >= 0.85) return "near";
  if (score >= 0.5) return "strong";
  if (score >= 0.2) return "some";
  return "low";
}

function similarityLabel(score: number): string {
  if (score >= 0.85) return "Near-duplicate";
  if (score >= 0.5) return "Strong overlap";
  if (score >= 0.2) return "Some overlap";
  return "Mostly distinct";
}

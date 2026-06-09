import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareSearch } from "./compare-search";
import { T } from "@/components/t";
import {
  getStock,
  getEtfDetail,
  getStockRating,
  getEtfHoldings,
  getStockExtras,
  historicalPrices,
  computeEtfRating,
} from "@/lib/data";
import { CompareApp } from "@/components/compare/app";
import type { CompareColumn } from "@/components/compare/types";
import { getBackendClient } from "@/lib/supabase/admin";
import { APP_NAME } from "@/lib/branding";

// Compare tool: side-by-side view of 2–4 stocks/ETFs.
//
// Hits the long-tail "X vs Y" SEO queries that drive a lot of dividend
// research traffic. Each comparison is a real landing page with its
// canonical URL, OG image, and indexed metrics — so Google can serve it
// when someone searches "SCHD vs VYM" or "JEPI vs JEPQ".
//
// The page assembles the real data server-side (SEO HTML carries every
// metric) and renders the interactive comparison app (verdict + radar +
// metric sections + real price chart + ETF holdings/overlap). Add/remove
// navigates to a new canonical /compare?a=&b= URL.

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

  // Generate "X vs Y" pair variants for the keyword list. Google ranks the
  // "compare X vs Y" intent strongly when the literal phrase appears in
  // keywords + title + body. For 2-symbol comparisons, also generate
  // "AAPL or MSFT" and "AAPL versus MSFT" since both are real search forms.
  const pairKeywords: string[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      pairKeywords.push(
        `${symbols[i]} vs ${symbols[j]}`,
        `${symbols[i]} versus ${symbols[j]}`,
        `${symbols[i]} or ${symbols[j]}`,
        `${symbols[i]} vs ${symbols[j]} dividend`,
        `${symbols[i]} vs ${symbols[j]} comparison`,
        `compare ${symbols[i]} ${symbols[j]}`,
      );
    }
  }

  return {
    title: `${joined} — Dividend Stock & ETF Comparison`,
    description,
    keywords: [
      ...pairKeywords,
      ...symbols.map((s) => `${s} dividend`),
      ...symbols.map((s) => `${s} yield`),
      ...symbols.map((s) => `${s} stock`),
      `${joined} comparison`,
      `${joined} dividend`,
      `${joined} which is better`,
      "compare dividend stocks",
      "compare dividend ETFs",
    ],
    alternates: { canonical: `/compare?${qs}` },
    openGraph: {
      title: `${joined} — Dividend Comparison | ${APP_NAME}`,
      description,
      type: "website",
      url: `https://uncoverd.org/compare?${qs}`,
      siteName: APP_NAME,
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
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

const EMPTY_COLUMN = (symbol: string): CompareColumn => ({
  symbol,
  name: null,
  kind: "missing",
  price: null,
  changePercent: null,
  yieldPct: null,
  marketCap: null,
  aum: null,
  expenseRatio: null,
  holdingsCount: null,
  topHoldings: [],
  peRatio: null,
  beta: null,
  sector: null,
  industry: null,
  composite: null,
  grade: null,
  pillars: null,
  streakYears: null,
  divCagr5y: null,
  payoutRatio: null,
  netDebtToEbitda: null,
  return1y: null,
  return3y: null,
  yearHigh: null,
  yearLow: null,
  pctOff52wHigh: null,
  profitMargin: null,
  revGrowthQoQ: null,
});

// Latest annual net profit margin (income / revenue) for a stock. Returns
// percent (e.g. 28.4 for 28.4%). Falls back to null when the income
// statement row is missing.
async function fetchProfitMargin(symbol: string): Promise<number | null> {
  const sb = getBackendClient();
  const { data } = await sb
    .from("income_statement_annual")
    .select("net_income,revenue,date")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { net_income: number | null; revenue: number | null } | null;
  if (!row) return null;
  if (row.net_income == null || row.revenue == null || Number(row.revenue) <= 0) return null;
  return (Number(row.net_income) / Number(row.revenue)) * 100;
}

// Compute 52w high/low + % off the high from historical_prices_stocks.
// StockExtras supplies this for stocks but not ETFs — we compute inline
// so the Performance section isn't empty on ETF-only comparisons.
async function fetchYearStats(
  symbol: string,
  currentPrice: number | null,
): Promise<{ high: number | null; low: number | null; pctOff: number | null }> {
  const rows = await historicalPrices(symbol, 380);
  if (rows.length < 30) return { high: null, low: null, pctOff: null };
  let high = -Infinity;
  let low = Infinity;
  for (const r of rows) {
    const v = Number(r.close);
    if (!isFinite(v) || v <= 0) continue;
    if (v > high) high = v;
    if (v < low) low = v;
  }
  if (!isFinite(high) || !isFinite(low)) return { high: null, low: null, pctOff: null };
  const px = currentPrice ?? Number(rows[0].close);
  const pctOff = isFinite(px) && px > 0 ? ((px - high) / high) * 100 : null;
  return { high, low, pctOff };
}

// Latest quarter-over-quarter revenue growth (most-recent quarter vs. the
// quarter before it). Useful for spotting accelerating vs decelerating
// dividend payers.
async function fetchRevGrowthQoQ(symbol: string): Promise<number | null> {
  const sb = getBackendClient();
  const { data } = await sb
    .from("income_statement_quarterly")
    .select("revenue,date")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(2);
  const rows = (data as { revenue: number | null }[] | null) ?? [];
  if (rows.length < 2) return null;
  const latest = rows[0].revenue;
  const prior = rows[1].revenue;
  if (latest == null || prior == null || Number(prior) <= 0) return null;
  return ((Number(latest) - Number(prior)) / Number(prior)) * 100;
}

// Compute TTM yield from the dividends table. Used for ETFs because their
// tickers.last_div is NULL — same logic as enrichEtfYieldsFromDividends in
// data.ts but for a single symbol.
async function computeTtmYieldPct(symbol: string, price: number | null): Promise<number | null> {
  if (price == null || price <= 0) return null;
  const sb = getBackendClient();
  const cutoff = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("dividends")
    .select("adj_dividend,dividend")
    .eq("symbol", symbol)
    .gte("date", cutoff)
    .gt("dividend", 0)
    .limit(20);
  // Use adj_dividend (split-adjusted) — raw `dividend` stores pre-split
  // values, so for HDV (5:1 split) summing raw values gave 13% yield
  // instead of the real ~3%.
  const rows = (data as { adj_dividend: number | null; dividend: number }[] | null) ?? [];
  if (rows.length === 0) return null;
  const ttm = rows.reduce(
    (s, r) => s + (r.adj_dividend != null ? Number(r.adj_dividend) : Number(r.dividend)),
    0,
  );
  if (ttm <= 0) return null;
  return (ttm / price) * 100;
}

// Compute 1Y and 3Y total price change (%) from historical_prices_stocks.
// Distinct from total return — we don't reinvest dividends. Good enough
// for compare-page level of fidelity; tagged honestly as "1Y price" not
// "1Y total return" to avoid misrepresentation.
async function computePriceReturns(symbol: string): Promise<{ return1y: number | null; return3y: number | null }> {
  const days = 365 * 3 + 30;
  const rows = await historicalPrices(symbol, days);
  if (rows.length < 30) return { return1y: null, return3y: null };
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const latestClose = Number(sorted[sorted.length - 1].close);
  if (!isFinite(latestClose) || latestClose <= 0) return { return1y: null, return3y: null };
  // Date-based lookup: find the close on/after a target date. Trading-day
  // offsets fail when the backfill is just shy of a full 3 years (~750 days
  // vs 756 expected), which is why the 3y column was "—" for most ETFs.
  function priceOnOrAfter(targetIso: string): number | null {
    // Binary search would be nicer but rows are small (~750); linear is fine.
    for (const r of sorted) {
      if (r.date >= targetIso) {
        const v = Number(r.close);
        return isFinite(v) && v > 0 ? v : null;
      }
    }
    return null;
  }
  const today = new Date();
  const oneYAgo = new Date(today);
  oneYAgo.setFullYear(oneYAgo.getFullYear() - 1);
  const threeYAgo = new Date(today);
  threeYAgo.setFullYear(threeYAgo.getFullYear() - 3);
  const a = priceOnOrAfter(oneYAgo.toISOString().slice(0, 10));
  const b = priceOnOrAfter(threeYAgo.toISOString().slice(0, 10));
  return {
    return1y: a != null ? ((latestClose - a) / a) * 100 : null,
    return3y: b != null ? ((latestClose - b) / b) * 100 : null,
  };
}

async function loadColumn(symbol: string): Promise<CompareColumn> {
  // One ticker fetch first. The is_etf flag is the source of truth — we don't
  // dual-fetch ETF detail for every symbol (the old bug was returning ETF
  // shape for stocks because getEtfDetail doesn't filter by is_etf).
  const base = await getStock(symbol);
  if (!base) return EMPTY_COLUMN(symbol);

  const isEtf = base.is_etf === true || base.is_fund === true;

  if (isEtf) {
    // Pull detail + holdings + returns + year stats in parallel. Earlier
    // version skipped returns for ETFs, which left the Performance section
    // empty whenever all columns were ETFs.
    const [etfDetail, holdings, returns, yearStats] = await Promise.all([
      getEtfDetail(symbol),
      getEtfHoldings(symbol, 25),
      computePriceReturns(symbol).catch(() => ({ return1y: null, return3y: null })),
      fetchYearStats(symbol, base.price ?? null).catch(() => ({ high: null, low: null, pctOff: null })),
    ]);
    const detail = etfDetail ?? base;
    // ETF yield: tickers.last_div is null for SCHD/VYM/VTI/JEPI etc, so
    // detail.dividend_yield is null. Compute from TTM dividends.
    let yieldPct = detail.dividend_yield;
    if (yieldPct == null) {
      yieldPct = await computeTtmYieldPct(symbol, detail.price);
    }
    // Compute ETF rating once we have the yield and 1Y return. The rating
    // function expects dividend_yield + expense_ratio + aum on the detail
    // object plus the 1Y return externally.
    const enrichedDetail = etfDetail
      ? { ...etfDetail, dividend_yield: yieldPct ?? etfDetail.dividend_yield }
      : null;
    const rating = enrichedDetail ? computeEtfRating(enrichedDetail, returns.return1y) : null;
    return {
      ...EMPTY_COLUMN(symbol),
      name: detail.name,
      kind: "etf",
      price: detail.price ?? null,
      changePercent: detail.change_percent ?? null,
      yieldPct,
      aum: detail.aum ?? null,
      expenseRatio: detail.expense_ratio ?? null,
      holdingsCount: (etfDetail?.holdings_count as number | null) ?? base.holdings_count ?? null,
      sector: detail.sector ?? null,
      topHoldings: holdings.map((h) => ({
        asset: h.asset,
        name: h.name,
        weight: h.weight_percentage,
      })),
      return1y: returns.return1y,
      return3y: returns.return3y,
      yearHigh: yearStats.high,
      yearLow: yearStats.low,
      pctOff52wHigh: yearStats.pctOff,
      composite: rating?.composite ?? null,
      grade: rating?.grade ?? null,
    };
  }

  // Stock path: pull extras (streak, CAGR, payout) + rating + price returns
  // + profit margin + quarterly revenue growth in parallel.
  const [rating, extrasMap, returns, profitMargin, revGrowthQoQ] = await Promise.all([
    getStockRating(symbol).catch(() => null),
    getStockExtras([symbol]).catch(() => new Map()),
    computePriceReturns(symbol).catch(() => ({ return1y: null, return3y: null })),
    fetchProfitMargin(symbol).catch(() => null),
    fetchRevGrowthQoQ(symbol).catch(() => null),
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
    // Rating pillars (1..5) power the radar dims client-side.
    pillars: rating
      ? {
          value: rating.value_score ?? null,
          growth: rating.growth_score ?? null,
          profit: rating.profit_score ?? null,
          momentum: rating.momentum_score ?? null,
          health: rating.health_score ?? null,
        }
      : null,
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
    profitMargin,
    revGrowthQoQ,
  };
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
            <div className="dv-eyebrow"><T>Tools</T></div>
            <h1 style={{ margin: "0.4rem 0", fontSize: "2.1rem", letterSpacing: "-0.02em" }}>
              <T>Compare dividend stocks & ETFs</T>
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: 640, fontSize: "1.02rem", lineHeight: 1.55 }}>
              <T>Drop in 2–4 tickers. See yield, dividend growth, payout, rating, expense ratio, returns, and ETF overlap — side by side. Stock-vs-stock, ETF-vs-ETF, or mixed.</T>
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

  const [columns, chartSeries] = await Promise.all([
    Promise.all(symbols.map((s) => loadColumn(s))),
    Promise.all(
      symbols.map(async (s) => {
        const rows = await historicalPrices(s, 365 * 5).catch(() => []);
        return { symbol: s, points: rows.map((r) => ({ date: r.date, close: r.close })) };
      }),
    ),
  ]);

  return (
    <>
      <SiteHeader />
      <CompareApp columns={columns} series={chartSeries} />
      <SiteFooter />
    </>
  );
}

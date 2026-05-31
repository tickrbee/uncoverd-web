import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rich OG image for /compare?a=X&b=Y... — a real side-by-side miniature
// of the actual comparison page with live data (yield, expense ratio for
// ETFs / P/E for stocks, market cap, rating). 1200x630.
//
// Pulls data from Supabase. To stay reliable on Vercel, every fetch is
// wrapped in try/catch and falls back to "—" on any error. The render
// itself uses only plain CSS (no radial-gradients, no box-shadows) so
// next/og's streaming layer doesn't fall over.

export const runtime = "nodejs";
export const maxDuration = 30;

const SLOTS = ["a", "b", "c", "d"] as const;

type TickerData = {
  symbol: string;
  name: string | null;
  kind: "stock" | "etf";
  yieldPct: number | null;
  // Stock fields
  marketCap: number | null;
  peRatio: number | null;
  grade: string | null;
  // ETF fields
  aum: number | null;
  expenseRatio: number | null;
};

const BG = "#0a0a0a";
const PANEL = "#111111";
const BORDER = "#1f1f1f";
const GREEN = "#34d399";
const GREEN_DIM = "rgba(52,211,153,0.15)";
const TEXT = "#fafafa";
const MUTED = "#a1a1aa";

// Talk to Supabase directly here — no `server-only` imports allowed in
// the og route runtime even though it's nodejs.
function getSb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "backend" as "public" },
  });
}

async function loadTicker(symbol: string): Promise<TickerData> {
  const empty: TickerData = {
    symbol,
    name: null,
    kind: "stock",
    yieldPct: null,
    marketCap: null,
    peRatio: null,
    grade: null,
    aum: null,
    expenseRatio: null,
  };
  try {
    const sb = getSb();
    if (!sb) return empty;
    const { data } = await sb
      .from("tickers")
      .select("symbol,name,price,last_div,mkt_cap,aum,expense_ratio,is_etf,is_fund")
      .eq("symbol", symbol)
      .order("mkt_cap", { ascending: false, nullsFirst: false })
      .limit(1);
    const row = (data as { symbol: string; name: string | null; price: number | null; last_div: number | null; mkt_cap: number | null; aum: number | null; expense_ratio: number | null; is_etf: boolean | null; is_fund: boolean | null }[] | null)?.[0];
    if (!row) return empty;
    const isEtf = row.is_etf === true || row.is_fund === true;
    let yieldPct: number | null = null;
    if (row.last_div != null && row.price != null && Number(row.price) > 0) {
      yieldPct = (Number(row.last_div) / Number(row.price)) * 100;
    }
    // For ETFs, compute TTM yield from dividends if last_div is null
    if (yieldPct == null && isEtf && row.price != null && Number(row.price) > 0) {
      try {
        const cutoff = new Date(Date.now() - 365 * 86400 * 1000).toISOString().slice(0, 10);
        const { data: divs } = await sb
          .from("dividends")
          .select("adj_dividend,dividend")
          .eq("symbol", symbol)
          .gte("date", cutoff)
          .gt("dividend", 0)
          .limit(15);
        // adj_dividend = split-adjusted per-share, raw dividend = pre-split.
        // For HDV (5:1 split) summing raw gave 13% instead of real ~3%.
        const rows = (divs as { adj_dividend: number | null; dividend: number }[] | null) ?? [];
        if (rows.length > 0) {
          const ttm = rows.reduce(
            (s, r) => s + (r.adj_dividend != null ? Number(r.adj_dividend) : Number(r.dividend)),
            0,
          );
          if (ttm > 0) yieldPct = (ttm / Number(row.price)) * 100;
        }
      } catch {
        /* ignore */
      }
    }

    let peRatio: number | null = null;
    let grade: string | null = null;
    if (!isEtf) {
      // Fetch P/E + rating for stocks (each in its own try, so one failure
      // doesn't lose the other)
      try {
        const { data: ratio } = await sb
          .from("ratios_annual")
          .select("price_to_earnings_ratio")
          .eq("symbol", symbol)
          .order("date", { ascending: false })
          .limit(1);
        const peVal = (ratio as { price_to_earnings_ratio: number | null }[] | null)?.[0]?.price_to_earnings_ratio;
        if (peVal != null) peRatio = Number(peVal);
      } catch {
        /* ignore */
      }
      try {
        const { data: rating } = await sb
          .from("stock_ratings_daily")
          .select("composite_grade")
          .eq("symbol", symbol)
          .order("computed_date", { ascending: false })
          .limit(1);
        const g = (rating as { composite_grade: string | null }[] | null)?.[0]?.composite_grade;
        if (g) grade = g;
      } catch {
        /* ignore */
      }
    }

    return {
      symbol,
      name: row.name,
      kind: isEtf ? "etf" : "stock",
      yieldPct,
      marketCap: row.mkt_cap != null ? Number(row.mkt_cap) : null,
      peRatio,
      grade,
      aum: row.aum != null ? Number(row.aum) : null,
      expenseRatio: row.expense_ratio != null ? Number(row.expense_ratio) : null,
    };
  } catch {
    return empty;
  }
}

function fmtPct(v: number | null, d = 2): string {
  if (v == null || !isFinite(v)) return "—";
  return `${v.toFixed(d)}%`;
}

function fmtLargeUsd(v: number | null): string {
  if (v == null || !isFinite(v) || v <= 0) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${Math.round(v)}`;
}

function shortName(name: string | null, max = 28): string {
  if (!name) return "";
  let n = name
    .replace(/\s*\(.*?\)$/, "")
    .replace(/[, ]+(Inc\.?|Corporation|Corp\.?|Company|Co\.?|Limited|Ltd\.?|Holdings?|Group|PLC|S\.A\.|S\.E\.|N\.V\.|AG)\s*$/i, "")
    .trim();
  if (n.length > max) {
    const cut = n.lastIndexOf(" ", max);
    n = (cut > 0 ? n.slice(0, cut) : n.slice(0, max)).trim() + "…";
  }
  return n;
}

// Compute the "winner" symbol for a metric (high or low wins). Used to
// paint a green highlight on the leading cell.
function winnerOf(rows: TickerData[], getter: (r: TickerData) => number | null, dir: "high" | "low"): string | null {
  const valid = rows
    .map((r) => ({ symbol: r.symbol, val: getter(r) }))
    .filter((x): x is { symbol: string; val: number } => x.val != null && isFinite(x.val));
  if (valid.length < 2) return null;
  valid.sort((a, b) => (dir === "high" ? b.val - a.val : a.val - b.val));
  const top = valid[0];
  const second = valid[1];
  if (Math.abs(top.val - second.val) / (Math.abs(top.val) || 1) < 0.01) return null;
  return top.symbol;
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const symbols: string[] = [];
  for (const slot of SLOTS) {
    const v = url.searchParams.get(slot);
    if (v && v.trim().length > 0) symbols.push(v.trim().toUpperCase());
  }
  const unique = Array.from(new Set(symbols)).slice(0, 4);

  // No symbols: render generic landing card.
  if (unique.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: BG,
            color: TEXT,
            fontFamily: "sans-serif",
            padding: "60px 90px",
          }}
        >
          <BrandBar />
          <div style={{ fontSize: 64, fontWeight: 800, marginTop: 40, lineHeight: 1.05 }}>
            Compare dividend stocks &amp; ETFs
          </div>
          <div style={{ fontSize: 26, color: MUTED, marginTop: 22, maxWidth: 900 }}>
            Yield · payout · streak · rating · expense · holdings overlap. Side by side.
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: GREEN, marginTop: 50 }}>
            uncoverd.org/compare
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Load real data in parallel
  const tickers = await Promise.all(unique.map((s) => loadTicker(s)));

  // Determine winner per metric. For mixed stock/etf comparisons, the
  // axis depends on what each kind has.
  const anyStock = tickers.some((t) => t.kind === "stock");
  const anyEtf = tickers.some((t) => t.kind === "etf");
  const yieldWinner = winnerOf(tickers, (t) => t.yieldPct, "high");
  const expenseWinner = winnerOf(tickers, (t) => t.expenseRatio, "low");
  const peWinner = winnerOf(tickers, (t) => t.peRatio, "low");

  const headline = unique.join("  vs  ");
  const colCount = tickers.length;
  // 1200 - 180 (90px padding) = 1020. 16px gap.
  const cardWidth = Math.floor((1020 - 16 * (colCount - 1)) / colCount);

  // What metrics to show in the rows
  const metrics: { label: string; getter: (t: TickerData) => string; winner: string | null }[] = [
    {
      label: "Yield",
      getter: (t) => fmtPct(t.yieldPct, 2),
      winner: yieldWinner,
    },
    ...(anyEtf
      ? [
          {
            label: "Expense",
            getter: (t: TickerData) => fmtPct(t.expenseRatio, 2),
            winner: expenseWinner,
          },
          {
            label: "AUM",
            getter: (t: TickerData) => fmtLargeUsd(t.aum),
            winner: null,
          },
        ]
      : []),
    ...(anyStock
      ? [
          {
            label: "Rating",
            getter: (t: TickerData) => t.grade ?? "—",
            winner: null,
          },
          {
            label: "P/E",
            getter: (t: TickerData) => (t.peRatio != null ? t.peRatio.toFixed(1) : "—"),
            winner: peWinner,
          },
          {
            label: "Market cap",
            getter: (t: TickerData) => fmtLargeUsd(t.marketCap),
            winner: null,
          },
        ]
      : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: TEXT,
          fontFamily: "sans-serif",
          padding: "44px 90px 40px",
        }}
      >
        <BrandBar />

        {/* Headline */}
        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            marginTop: 18,
            lineHeight: 1,
            color: TEXT,
          }}
        >
          {headline}
        </div>

        {/* Comparison card grid */}
        <div style={{ display: "flex", marginTop: 30, flex: 1 }}>
          {tickers.map((t, i) => (
            <div
              key={t.symbol}
              style={{
                width: cardWidth,
                marginLeft: i === 0 ? 0 : 16,
                display: "flex",
                flexDirection: "column",
                padding: "20px 22px",
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
              }}
            >
              {/* Card header: symbol + kind tag */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: TEXT }}>{t.symbol}</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: t.kind === "etf" ? GREEN_DIM : "rgba(96,165,250,0.15)",
                    color: t.kind === "etf" ? GREEN : "#93c5fd",
                  }}
                >
                  {t.kind === "etf" ? "ETF" : "STOCK"}
                </div>
              </div>
              {t.name && (
                <div
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    marginTop: 4,
                    lineHeight: 1.3,
                  }}
                >
                  {shortName(t.name)}
                </div>
              )}

              {/* Metrics list */}
              <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
                {metrics.map((m) => {
                  const isWinner = m.winner === t.symbol;
                  return (
                    <div
                      key={m.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        marginTop: 6,
                        borderRadius: 8,
                        background: isWinner ? GREEN_DIM : "rgba(255,255,255,0.025)",
                        border: isWinner ? `1px solid ${GREEN}` : "1px solid transparent",
                      }}
                    >
                      <div style={{ fontSize: 13, color: MUTED }}>{m.label}</div>
                      <div
                        style={{
                          fontSize: 19,
                          fontWeight: 700,
                          color: isWinner ? GREEN : TEXT,
                        }}
                      >
                        {m.getter(t)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 22,
            alignItems: "center",
          }}
        >
          <div style={{ color: GREEN, fontSize: 22, fontWeight: 700 }}>
            uncoverd.org/compare
          </div>
          <div style={{ color: MUTED, fontSize: 16 }}>
            Dividend research · 65K+ stocks · 13.8K+ ETFs
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function BrandBar() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: GREEN,
          marginRight: 12,
        }}
      />
      <div style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>uncoverd</div>
      <div
        style={{
          marginLeft: 14,
          padding: "3px 11px",
          borderRadius: 999,
          background: GREEN_DIM,
          color: GREEN,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        COMPARE
      </div>
    </div>
  );
}

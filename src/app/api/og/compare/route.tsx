import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getStock, getEtfDetail } from "@/lib/data";
import { getBackendClient } from "@/lib/supabase/admin";

// Dynamic OG image for /compare?a=X&b=Y[&c=...][&d=...] — the social-card
// preview that X / LinkedIn / Slack will render when a comparison URL is
// pasted. 1200x630 (X's preferred large-summary size).
//
// Showing real numbers, not just a logo, is the whole point: X's algorithm
// surfaces image-card tweets more, and a numbered card has higher CTR
// than a generic logo.

// next/og + Supabase server client doesn't run cleanly on edge — server-only
// modules + node-style env access. Node runtime is fine and 800ms cold-start
// is acceptable for a once-per-share image.
export const runtime = "nodejs";

const SLOTS = ["a", "b", "c", "d"] as const;

type ColInfo = {
  symbol: string;
  kind: "stock" | "etf" | "missing";
  yieldPct: number | null;
  price: number | null;
  changePct: number | null;
  // ETF
  aum: number | null;
  expense: number | null;
};

async function loadCol(symbol: string): Promise<ColInfo> {
  try {
    const base = await getStock(symbol);
    if (!base) {
      return { symbol, kind: "missing", yieldPct: null, price: null, changePct: null, aum: null, expense: null };
    }
    const isEtf = base.is_etf === true || base.is_fund === true;
    if (isEtf) {
      const detail = (await getEtfDetail(symbol)) ?? base;
      let yieldPct = detail.dividend_yield ?? null;
      if (yieldPct == null && detail.price && detail.price > 0) {
        // TTM dividend yield — same logic as the page, inlined for edge runtime.
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
        if (rows.length > 0) {
          const ttm = rows.reduce((s, r) => s + Number(r.dividend), 0);
          if (ttm > 0) yieldPct = (ttm / Number(detail.price)) * 100;
        }
      }
      return {
        symbol,
        kind: "etf",
        yieldPct,
        price: detail.price ?? null,
        changePct: detail.change_percent ?? null,
        aum: detail.aum ?? null,
        expense: detail.expense_ratio ?? null,
      };
    }
    return {
      symbol,
      kind: "stock",
      yieldPct: base.dividend_yield ?? null,
      price: base.price ?? null,
      changePct: base.change_percent ?? null,
      aum: null,
      expense: null,
    };
  } catch {
    return { symbol, kind: "missing", yieldPct: null, price: null, changePct: null, aum: null, expense: null };
  }
}

function fmtPrice(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1000) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}
function fmtPct(v: number | null, d = 1): string {
  if (v == null) return "—";
  return `${v.toFixed(d)}%`;
}
function fmtAum(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${Math.round(v)}`;
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const symbols: string[] = [];
  for (const slot of SLOTS) {
    const v = url.searchParams.get(slot);
    if (v && v.trim().length > 0) symbols.push(v.trim().toUpperCase());
  }
  const unique = Array.from(new Set(symbols)).slice(0, 4);

  if (unique.length === 0) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, #050505 0%, #0a0a0a 60%, #0a0a0a 100%)",
            color: "#fafafa",
            padding: "70px 90px",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
          }}
        >
          <div style={{ color: "#34d399", fontSize: 22, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
            uncoverd · compare
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 }}>
            Compare any dividend stocks & ETFs
          </div>
          <div style={{ marginTop: 22, fontSize: 26, color: "#a1a1aa", maxWidth: 880, lineHeight: 1.4 }}>
            Yield · payout · streak · rating · expense · holdings overlap. Side by side.
          </div>
          <div style={{ marginTop: 60, fontSize: 26, color: "#a7f3d0", fontWeight: 700 }}>
            uncoverd.org/compare
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const cols = await Promise.all(unique.map((s) => loadCol(s)));
  const headline = unique.join(" vs ");
  const colCount = cols.length;
  // 1200px width, with 90px side padding -> 1020px usable. Divide evenly.
  const usable = 1020;
  const cardWidth = Math.min(280, Math.floor(usable / colCount) - 20);
  const cardGap = (usable - cardWidth * colCount) / Math.max(1, colCount - 1);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(120% 200% at 0% 0%, rgba(52,211,153,0.12) 0%, rgba(10,10,10,0) 50%), linear-gradient(135deg, #050505 0%, #0a0a0a 60%, #020202 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          padding: "60px 90px 50px",
          position: "relative",
        }}
      >
        {/* Brand bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30 }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, background: "#34d399", boxShadow: "0 0 16px rgba(52,211,153,0.6)" }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, textTransform: "lowercase", color: "#fafafa" }}>
            uncoverd
          </div>
          <div style={{ marginLeft: 14, padding: "4px 12px", borderRadius: 999, background: "rgba(52,211,153,0.12)", color: "#34d399", fontSize: 16, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            compare
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginBottom: 38 }}>
          {headline}
        </div>

        {/* Card row */}
        <div style={{ display: "flex", gap: cardGap, flex: 1 }}>
          {cols.map((c) => (
            <div
              key={c.symbol}
              style={{
                display: "flex",
                flexDirection: "column",
                width: cardWidth,
                padding: "20px 22px 24px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "radial-gradient(120% 200% at 0% 0%, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0) 60%), rgba(255,255,255,0.025)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 0.5 }}>{c.symbol}</div>
                <div style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: c.kind === "etf" ? "rgba(52,211,153,0.18)" : "rgba(96,165,250,0.15)", color: c.kind === "etf" ? "#34d399" : "#93c5fd", textTransform: "uppercase", letterSpacing: 1 }}>
                  {c.kind === "etf" ? "ETF" : c.kind === "stock" ? "Stock" : "—"}
                </div>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                Yield
              </div>
              <div style={{ marginTop: 4, fontSize: 44, fontWeight: 800, color: "#34d399", letterSpacing: -1, lineHeight: 1 }}>
                {fmtPct(c.yieldPct, 2)}
              </div>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: "#a1a1aa" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Price</span>
                  <span style={{ color: "#fafafa", fontWeight: 700 }}>{fmtPrice(c.price)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Today</span>
                  <span style={{ color: c.changePct == null ? "#a1a1aa" : c.changePct >= 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>
                    {fmtPct(c.changePct, 2)}
                  </span>
                </div>
                {c.kind === "etf" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>AUM</span>
                      <span style={{ color: "#fafafa", fontWeight: 700 }}>{fmtAum(c.aum)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Expense</span>
                      <span style={{ color: "#fafafa", fontWeight: 700 }}>{fmtPct(c.expense, 2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, color: "#a7f3d0", fontSize: 22, fontWeight: 700 }}>
          <span>uncoverd.org/compare</span>
          <span style={{ color: "#a1a1aa", fontSize: 16 }}>Dividend research · 65K+ stocks · 13.8K+ ETFs</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

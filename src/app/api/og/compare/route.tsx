import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Dynamic OG image for /compare?a=X&b=Y[&c=...][&d=...]. 1200x630, the
// large-summary card size X/LinkedIn render.
//
// IMPORTANT: this route renders WITHOUT any DB calls. Earlier version
// fetched live yield/price/AUM data and rendered them into the card,
// which kept failing (timeouts, edge-runtime quirks, missing rows). The
// broken state meant every shared link showed a blank box.
//
// Trade-off: the card no longer shows live numbers, just the tickers +
// brand + a clean visual. Reliability beats data density here — a card
// that renders 100% of the time is worth more than a richer card that
// silently fails 30% of the time.

export const runtime = "edge"; // pure render, no Node-only modules
export const maxDuration = 30;

const SLOTS = ["a", "b", "c", "d"] as const;

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const symbols: string[] = [];
  for (const slot of SLOTS) {
    const v = url.searchParams.get(slot);
    if (v && v.trim().length > 0) symbols.push(v.trim().toUpperCase());
  }
  const unique = Array.from(new Set(symbols)).slice(0, 4);

  // No symbols: render a generic compare-tool card.
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
              "radial-gradient(120% 200% at 0% 0%, rgba(52,211,153,0.12) 0%, rgba(10,10,10,0) 50%), linear-gradient(135deg, #050505 0%, #0a0a0a 60%, #020202 100%)",
            color: "#fafafa",
            padding: "80px 90px",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 38 }}>
            <div style={{ width: 18, height: 18, borderRadius: 999, background: "#34d399", boxShadow: "0 0 16px rgba(52,211,153,0.6)" }} />
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, textTransform: "lowercase" }}>
              uncoverd
            </div>
            <div style={{ marginLeft: 12, padding: "5px 14px", borderRadius: 999, background: "rgba(52,211,153,0.12)", color: "#34d399", fontSize: 16, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
              compare
            </div>
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.04 }}>
            Compare dividend stocks & ETFs
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#a1a1aa", maxWidth: 900, lineHeight: 1.4 }}>
            Yield · payout · streak · rating · expense · holdings overlap. Side by side.
          </div>
          <div style={{ marginTop: 56, fontSize: 26, color: "#a7f3d0", fontWeight: 700 }}>
            uncoverd.org/compare
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const headline = unique.join("  vs  ");
  // Tile widths scale with count. 1200 total, 90px side padding, 18px gap.
  const usable = 1200 - 180;
  const gap = 18;
  const tileWidth = Math.floor((usable - gap * (unique.length - 1)) / unique.length);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(120% 200% at 0% 0%, rgba(52,211,153,0.14) 0%, rgba(10,10,10,0) 50%), linear-gradient(135deg, #050505 0%, #0a0a0a 60%, #020202 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          padding: "60px 90px 50px",
        }}
      >
        {/* Brand bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, background: "#34d399", boxShadow: "0 0 14px rgba(52,211,153,0.6)" }} />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, textTransform: "lowercase", color: "#fafafa" }}>
            uncoverd
          </div>
          <div style={{ marginLeft: 12, padding: "4px 13px", borderRadius: 999, background: "rgba(52,211,153,0.12)", color: "#34d399", fontSize: 15, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
            compare
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: -2, lineHeight: 1, marginBottom: 14, color: "#fafafa" }}>
          {headline}
        </div>
        <div style={{ fontSize: 22, color: "#a1a1aa", fontWeight: 500, marginBottom: 40 }}>
          Dividend stock &amp; ETF comparison — yield, payout, rating, holdings.
        </div>

        {/* Ticker tiles row */}
        <div style={{ display: "flex", gap, flex: 1, alignItems: "stretch" }}>
          {unique.map((sym) => (
            <div
              key={sym}
              style={{
                width: tileWidth,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "28px 18px",
                borderRadius: 18,
                border: "1px solid rgba(52,211,153,0.22)",
                background:
                  "radial-gradient(120% 200% at 50% 0%, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0) 60%), rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  fontSize: tileWidth >= 250 ? 64 : 48,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: "#fafafa",
                  lineHeight: 1,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {sym}
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

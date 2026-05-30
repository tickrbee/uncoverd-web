import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Dynamic OG image for /compare?a=X&b=Y and /alternatives/[symbol].
// 1200x630, the large-summary card size X/LinkedIn render.
//
// Kept deliberately simple — no radial-gradients, no box-shadows, no
// custom fonts. The previous version with all those styles was failing
// at the streaming layer on Vercel, returning HTML error pages with
// image/png content-type (corrupt-file errors in Photos for users
// trying to download the share).

export const runtime = "edge";

const SLOTS = ["a", "b", "c", "d"] as const;
const BG = "#0a0a0a";
const GREEN = "#34d399";
const TEXT = "#fafafa";
const MUTED = "#a1a1aa";

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const symbols: string[] = [];
  for (const slot of SLOTS) {
    const v = url.searchParams.get(slot);
    if (v && v.trim().length > 0) symbols.push(v.trim().toUpperCase());
  }
  const unique = Array.from(new Set(symbols)).slice(0, 4);
  const headline = unique.length > 0 ? unique.join("  vs  ") : "Compare dividend stocks & ETFs";
  const colCount = Math.max(1, unique.length);

  // Tile width math. 1200 - 180 (90px side padding) = 1020 usable.
  // Gap of 18px between tiles.
  const usable = 1020;
  const gap = 18;
  const tileWidth = unique.length > 0
    ? Math.floor((usable - gap * (colCount - 1)) / colCount)
    : usable;

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
          padding: "60px 90px 50px",
        }}
      >
        {/* Brand bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 30 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: GREEN,
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: TEXT,
            }}
          >
            uncoverd
          </div>
          <div
            style={{
              marginLeft: 16,
              padding: "4px 14px",
              borderRadius: 999,
              background: "rgba(52,211,153,0.15)",
              color: GREEN,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            COMPARE
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: unique.length > 0 ? 78 : 56,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 14,
            color: TEXT,
          }}
        >
          {headline}
        </div>
        <div style={{ fontSize: 22, color: MUTED, marginBottom: 40 }}>
          Dividend stock &amp; ETF comparison — yield, payout, rating, holdings.
        </div>

        {/* Ticker tiles */}
        {unique.length > 0 && (
          <div style={{ display: "flex", flex: 1 }}>
            {unique.map((sym, i) => (
              <div
                key={sym}
                style={{
                  width: tileWidth,
                  marginLeft: i === 0 ? 0 : gap,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "28px 18px",
                  borderRadius: 18,
                  border: `1px solid ${GREEN}`,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    fontSize: tileWidth >= 250 ? 64 : 48,
                    fontWeight: 800,
                    color: TEXT,
                    textAlign: "center",
                  }}
                >
                  {sym}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 28,
            color: "#a7f3d0",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <div>uncoverd.org/compare</div>
          <div style={{ color: MUTED, fontSize: 16 }}>
            Dividend research · 65K+ stocks · 13.8K+ ETFs
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

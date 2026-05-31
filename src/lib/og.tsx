import { ImageResponse } from "next/og";

// Shared Open Graph image renderer for ticker pages. The audit flagged ~67k
// pages with an "incomplete Open Graph card" — the ticker routes set an
// `openGraph` object in generateMetadata but had no og:image, and a root-level
// opengraph-image is NOT inherited by child route segments. Co-locating an
// opengraph-image.tsx in each ticker segment gives every page a real card.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Branded OG card for a single security. Kept data-free (symbol + label only)
 * so the image route stays fast and doesn't need a DB round-trip per crawl.
 */
export function tickerOgImage(symbol: string, label: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #022c22 0%, #064e3b 35%, #0a0a0a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#34d399",
            }}
          />
          <div style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            uncoverd
          </div>
        </div>
        <div
          style={{
            fontSize: "140px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {symbol}
        </div>
        <div
          style={{
            fontSize: "36px",
            color: "#a7f3d0",
            marginTop: "28px",
            maxWidth: "1000px",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

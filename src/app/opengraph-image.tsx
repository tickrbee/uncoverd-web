import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "uncoverd — Dividend research & screener";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
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
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#34d399",
            }}
          />
          <div style={{ fontSize: "44px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            uncoverd
          </div>
        </div>
        <div
          style={{
            fontSize: "80px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            maxWidth: "1000px",
          }}
        >
          Dividend research that actually shows the data.
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#a7f3d0",
            marginTop: "32px",
            maxWidth: "900px",
            lineHeight: 1.3,
          }}
        >
          Ratings · model portfolios · ex-dividend calendar · 13K+ ETFs · €100/year.
        </div>
      </div>
    ),
    size,
  );
}

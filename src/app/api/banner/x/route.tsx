import { ImageResponse } from "next/og";

// X profile banner. Hit /api/banner/x and save the returned PNG (right-click
// → save image as). Twitter spec: 1500x500. Profile picture circle overlaps
// the lower-left ~200x200 so we keep that quadrant empty.
//
// Tweak copy in COPY below; tweak colors in the inline style (we match the
// site's emerald-on-near-black palette so the brand reads consistent across
// product + social).

export const runtime = "edge";

const COPY = {
  brand: "uncoverd",
  tagline: "Dividend research, made transparent",
  subline: "Ratings · Screener · Model portfolios · Ex-div calendar",
  url: "uncoverd.org",
};

const STATS: { label: string; value: string }[] = [
  { value: "65K+", label: "stocks" },
  { value: "13.8K+", label: "ETFs" },
  { value: "5-pillar", label: "ratings" },
  { value: "€100/yr", label: "premium" },
];

export async function GET(): Promise<Response> {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(120% 200% at 20% 10%, rgba(52,211,153,0.18) 0%, rgba(10,10,10,0) 55%), linear-gradient(135deg, #0a0a0a 0%, #050505 60%, #020202 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          padding: "60px 90px",
          position: "relative",
        }}
      >
        {/* Top-right faint URL */}
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 90,
            color: "#a1a1aa",
            fontSize: 26,
            letterSpacing: 0.5,
          }}
        >
          {COPY.url}
        </div>

        {/* Brand block */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 30,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#34d399",
              boxShadow: "0 0 24px rgba(52,211,153,0.45)",
            }}
          />
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: -1.5,
              color: "#fafafa",
              textTransform: "lowercase",
              lineHeight: 1,
            }}
          >
            {COPY.brand}
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 32,
            fontSize: 38,
            fontWeight: 600,
            color: "#fafafa",
            letterSpacing: -0.3,
            maxWidth: 1100,
            lineHeight: 1.15,
          }}
        >
          {COPY.tagline}
        </div>

        {/* Subline */}
        <div
          style={{
            marginTop: 14,
            fontSize: 22,
            color: "#a7f3d0",
            letterSpacing: 0.2,
          }}
        >
          {COPY.subline}
        </div>

        {/* Stats row — bottom-right, away from the avatar circle */}
        <div
          style={{
            position: "absolute",
            right: 90,
            bottom: 55,
            display: "flex",
            gap: 28,
          }}
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                padding: "14px 22px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                minWidth: 130,
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 700, color: "#fafafa" }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1500, height: 500 },
  );
}

"use client";

import { useMemo, useState } from "react";

export type CompareSeries = {
  symbol: string;
  points: { date: string; close: number | null }[];
};

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 182 },
  { label: "YTD", days: -1 },
  { label: "1Y", days: 365 },
  { label: "3Y", days: 365 * 3 },
  { label: "All", days: Infinity },
] as const;
type RangeLabel = (typeof RANGES)[number]["label"];

// Distinct, color-blind-aware palette. Up to 4 series in the compare tool.
const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6"];

export function CompareChart({
  series,
  defaultRange = "1Y",
}: {
  series: CompareSeries[];
  defaultRange?: RangeLabel;
}) {
  const [range, setRange] = useState<RangeLabel>(defaultRange);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const cleaned = useMemo(
    () =>
      series
        .map((s) => ({
          symbol: s.symbol,
          points: s.points.filter((p): p is { date: string; close: number } => p.close != null && p.close > 0),
        }))
        .filter((s) => s.points.length >= 2),
    [series],
  );

  // Build a unified time axis from the latest series' dates, then resample each
  // series onto it (forward-fill the most recent observed close). This keeps
  // the lines aligned even when one symbol has a slightly different trading
  // calendar than another.
  const { dates, normalized } = useMemo(() => {
    if (cleaned.length === 0) return { dates: [] as string[], normalized: [] as { symbol: string; values: number[] }[] };
    const unionDates = new Set<string>();
    for (const s of cleaned) for (const p of s.points) unionDates.add(p.date);
    const allDates = Array.from(unionDates).sort();

    // Apply range filter
    let filteredDates = allDates;
    if (range !== "All" && allDates.length > 0) {
      const last = new Date(allDates[allDates.length - 1]);
      let cutoff: Date;
      if (range === "YTD") {
        cutoff = new Date(last.getFullYear(), 0, 1);
      } else {
        const days = RANGES.find((r) => r.label === range)!.days as number;
        cutoff = new Date(last);
        cutoff.setDate(cutoff.getDate() - days);
      }
      const cutoffIso = cutoff.toISOString().slice(0, 10);
      filteredDates = allDates.filter((d) => d >= cutoffIso);
    }
    if (filteredDates.length < 2) return { dates: [] as string[], normalized: [] as { symbol: string; values: number[] }[] };

    // For each series, build a forward-filled close-per-date map, then
    // normalize to 100 at the first available point in the filtered window.
    const normSeries = cleaned.map((s) => {
      const map = new Map<string, number>();
      for (const p of s.points) map.set(p.date, p.close);
      const values: number[] = [];
      let last: number | null = null;
      let base: number | null = null;
      for (const d of filteredDates) {
        const v = map.get(d);
        if (v != null) last = v;
        if (base == null && last != null) base = last;
        values.push(last != null && base != null && base > 0 ? (last / base) * 100 : NaN);
      }
      return { symbol: s.symbol, values };
    });
    return { dates: filteredDates, normalized: normSeries };
  }, [cleaned, range]);

  if (dates.length < 2 || normalized.length === 0) {
    return <div className="dv-empty">Not enough price history to chart.</div>;
  }

  const width = 1000;
  const height = 280;
  const pad = { top: 14, right: 14, bottom: 30, left: 50 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allValues = normalized.flatMap((s) => s.values).filter((v) => isFinite(v));
  let min = Math.min(...allValues, 100);
  let max = Math.max(...allValues, 100);
  if (min === max) {
    min -= 5;
    max += 5;
  } else {
    const r = max - min;
    min -= r * 0.05;
    max += r * 0.05;
  }

  const xScale = (i: number) => pad.left + (i / (dates.length - 1)) * innerW;
  const yScale = (v: number) => pad.top + (1 - (v - min) / (max - min)) * innerH;

  const paths = normalized.map((s, si) => {
    let d = "";
    let started = false;
    for (let i = 0; i < s.values.length; i++) {
      const v = s.values[i];
      if (!isFinite(v)) continue;
      d += `${started ? "L" : "M"}${xScale(i).toFixed(2)},${yScale(v).toFixed(2)} `;
      started = true;
    }
    return { symbol: s.symbol, d, color: COLORS[si % COLORS.length] };
  });

  // Y ticks: round numbers
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const v = min + (i / (yTickCount - 1)) * (max - min);
    return { v, y: yScale(v) };
  });
  // X ticks: 4-5 dates
  const xTickCount = Math.min(5, dates.length);
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i * (dates.length - 1)) / Math.max(1, xTickCount - 1)),
  );

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    if (x < pad.left || x > width - pad.right) {
      setHoverIdx(null);
      return;
    }
    const idx = Math.round(((x - pad.left) / innerW) * (dates.length - 1));
    setHoverIdx(Math.max(0, Math.min(dates.length - 1, idx)));
  }

  // Latest displayed value per series for the legend.
  const legend = normalized.map((s, si) => {
    const last = [...s.values].reverse().find((v) => isFinite(v));
    const change = last != null && isFinite(last) ? last - 100 : null;
    return { symbol: s.symbol, color: COLORS[si % COLORS.length], change };
  });

  return (
    <div>
      <div className="dv-chart-toolbar">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem 1.25rem", alignItems: "center" }}>
          {legend.map((l) => (
            <span key={l.symbol} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: l.color,
                  display: "inline-block",
                }}
              />
              <span style={{ fontWeight: 600 }}>{l.symbol}</span>
              {l.change != null && (
                <span
                  style={{
                    color: l.change >= 0 ? "#34d399" : "#f87171",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {l.change >= 0 ? "+" : ""}
                  {l.change.toFixed(1)}%
                </span>
              )}
            </span>
          ))}
        </div>
        <div className="dv-chart-ranges">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.label)}
              className={`dv-chart-range-btn ${range === r.label ? "dv-chart-range-btn--active" : ""}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((t, idx) => (
          <line
            key={idx}
            x1={pad.left}
            x2={width - pad.right}
            y1={t.y}
            y2={t.y}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
        ))}

        {/* 100 baseline emphasized */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={yScale(100)}
          y2={yScale(100)}
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="2 4"
        />

        {paths.map((p) => (
          <path key={p.symbol} d={p.d} fill="none" stroke={p.color} strokeWidth={1.8} />
        ))}

        {yTicks.map((t, idx) => (
          <text key={`y-${idx}`} x={pad.left - 6} y={t.y + 3} textAnchor="end" fontSize="10" fill="rgba(161,161,170,0.9)">
            {t.v.toFixed(0)}
          </text>
        ))}

        {xTickIndices.map((i, idx) => (
          <text
            key={`x-${idx}`}
            x={xScale(i)}
            y={height - 10}
            textAnchor={idx === 0 ? "start" : idx === xTickIndices.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="rgba(161,161,170,0.9)"
          >
            {new Date(dates[i]).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          </text>
        ))}

        {hoverIdx != null && (
          <g>
            <line
              x1={xScale(hoverIdx)}
              x2={xScale(hoverIdx)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="4 4"
            />
            {normalized.map((s, si) => {
              const v = s.values[hoverIdx];
              if (!isFinite(v)) return null;
              return (
                <circle
                  key={s.symbol}
                  cx={xScale(hoverIdx)}
                  cy={yScale(v)}
                  r={3.5}
                  fill={COLORS[si % COLORS.length]}
                  stroke="#fff"
                  strokeWidth={1.2}
                />
              );
            })}
          </g>
        )}
      </svg>

      {hoverIdx != null && (
        <div className="dv-chart-hover" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            {new Date(dates[hoverIdx]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          {normalized.map((s, si) => {
            const v = s.values[hoverIdx];
            if (!isFinite(v)) return null;
            const change = v - 100;
            return (
              <span key={s.symbol} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: COLORS[si % COLORS.length],
                    display: "inline-block",
                  }}
                />
                <strong>{s.symbol}</strong>
                <span style={{ color: change >= 0 ? "#34d399" : "#f87171" }}>
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
              </span>
            );
          })}
        </div>
      )}
      <p style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
        Indexed to 100 at the start of the selected range. Price-only — does not include reinvested dividends.
      </p>
    </div>
  );
}

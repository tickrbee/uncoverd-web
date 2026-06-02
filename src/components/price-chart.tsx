"use client";

import { useMemo, useState } from "react";
import { symbolFor } from "@/lib/format";

export type Point = { date: string; close: number | null };

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 182 },
  { label: "YTD", days: -1 },
  { label: "1Y", days: 365 },
  { label: "5Y", days: 365 * 5 },
  { label: "All", days: Infinity },
] as const;

type RangeLabel = (typeof RANGES)[number]["label"];

export function PriceChart({
  data,
  defaultRange = "1Y",
  currency,
}: {
  data: Point[];
  defaultRange?: RangeLabel;
  currency?: string | null;
}) {
  const cur = symbolFor(currency);
  const [range, setRange] = useState<RangeLabel>(defaultRange);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const valid = useMemo(() => data.filter((p): p is { date: string; close: number } => p.close != null), [data]);

  const filtered = useMemo(() => {
    if (valid.length === 0) return [];
    if (range === "All") return valid;
    const last = new Date(valid[valid.length - 1].date);
    let cutoff: Date;
    if (range === "YTD") {
      cutoff = new Date(last.getFullYear(), 0, 1);
    } else {
      const days = RANGES.find((r) => r.label === range)!.days;
      cutoff = new Date(last);
      cutoff.setDate(cutoff.getDate() - (days as number));
    }
    return valid.filter((p) => new Date(p.date) >= cutoff);
  }, [valid, range]);

  if (filtered.length < 2) {
    return <div className="dv-empty">Not enough price history.</div>;
  }

  const width = 1000;
  const height = 260;
  const pad = { top: 12, right: 12, bottom: 30, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const closes = filtered.map((p) => p.close);
  let min = Math.min(...closes);
  let max = Math.max(...closes);
  if (min === max) {
    min = min * 0.95;
    max = max * 1.05;
  } else {
    const r = max - min;
    min -= r * 0.05;
    max += r * 0.05;
  }

  const xScale = (i: number) => pad.left + (i / (filtered.length - 1)) * innerW;
  const yScale = (v: number) => pad.top + (1 - (v - min) / (max - min)) * innerH;

  const linePath = filtered
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(2)},${yScale(p.close).toFixed(2)}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L${xScale(filtered.length - 1).toFixed(2)},${pad.top + innerH}` +
    ` L${xScale(0).toFixed(2)},${pad.top + innerH} Z`;

  const isPositive = filtered[filtered.length - 1].close >= filtered[0].close;
  const stroke = isPositive ? "#34d399" : "#f87171";
  const fillStart = isPositive ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)";

  // Date ticks (3-5 across the bottom)
  const tickCount = Math.min(5, filtered.length);
  const tickIndices = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i * (filtered.length - 1)) / Math.max(1, tickCount - 1))
  );
  const xTicks = tickIndices.map((i) => ({
    i,
    x: xScale(i),
    label: new Date(filtered[i].date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  }));

  // Y ticks
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const v = min + (i / (yTickCount - 1)) * (max - min);
    return { v, y: yScale(v) };
  });

  const startPrice = filtered[0].close;
  const endPrice = filtered[filtered.length - 1].close;
  const changeAbs = endPrice - startPrice;
  const changePct = (changeAbs / startPrice) * 100;

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    if (x < pad.left || x > width - pad.right) {
      setHoverIdx(null);
      return;
    }
    const idx = Math.round(((x - pad.left) / innerW) * (filtered.length - 1));
    setHoverIdx(Math.max(0, Math.min(filtered.length - 1, idx)));
  }

  const hover = hoverIdx != null ? filtered[hoverIdx] : null;

  return (
    <div>
      <div className="dv-chart-toolbar">
        <div className="dv-chart-toolbar__summary">
          <span className="dv-chart-toolbar__price">{cur}{endPrice.toFixed(2)}</span>
          <span className={changeAbs >= 0 ? "dv-change--pos" : "dv-change--neg"}>
            {changeAbs >= 0 ? "+" : ""}
            {changeAbs.toFixed(2)} ({changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%) · {range}
          </span>
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
        <defs>
          <linearGradient id="pc-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillStart} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

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

        <path d={areaPath} fill="url(#pc-area-gradient)" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.8} />

        {yTicks.map((t, idx) => (
          <text key={`y-${idx}`} x={pad.left - 6} y={t.y + 3} textAnchor="end" fontSize="10" fill="rgba(161,161,170,0.9)">
            {cur}{t.v.toFixed(t.v >= 100 ? 0 : 2)}
          </text>
        ))}

        {xTicks.map((t, idx) => (
          <text
            key={`x-${idx}`}
            x={t.x}
            y={height - 10}
            textAnchor={idx === 0 ? "start" : idx === xTicks.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="rgba(161,161,170,0.9)"
          >
            {t.label}
          </text>
        ))}

        {hover && hoverIdx != null && (
          <g>
            <line
              x1={xScale(hoverIdx)}
              x2={xScale(hoverIdx)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="4 4"
            />
            <circle cx={xScale(hoverIdx)} cy={yScale(hover.close)} r={4} fill={stroke} stroke="#fff" strokeWidth={1.5} />
          </g>
        )}
      </svg>

      {hover && (
        <div className="dv-chart-hover">
          <strong>{cur}{hover.close.toFixed(2)}</strong> on{" "}
          {new Date(hover.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}
    </div>
  );
}

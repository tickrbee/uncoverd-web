import type { IncomeStatementRow } from "@/lib/data";

export function RevenueNetIncomeChart({ rows }: { rows: IncomeStatementRow[] }) {
  if (rows.length === 0) {
    return <div className="dv-empty">No financials available.</div>;
  }
  // Display oldest-first
  const data = [...rows].reverse();
  const width = 600;
  const height = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const revenues = data.map((d) => Number(d.revenue ?? 0));
  const netIncomes = data.map((d) => Number(d.net_income ?? 0));
  const max = Math.max(...revenues, ...netIncomes, 1);
  const min = Math.min(0, ...netIncomes);
  const yRange = max - min || 1;

  const groupWidth = innerW / data.length;
  const barWidth = Math.min(28, groupWidth * 0.35);

  const yScale = (v: number) => pad.top + (1 - (v - min) / yRange) * innerH;

  function abbreviate(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={yScale(0)}
        y2={yScale(0)}
        stroke="rgba(255,255,255,0.15)"
      />
      {/* Y labels */}
      {[max, max / 2, 0, min].filter((v, i, arr) => arr.indexOf(v) === i).map((v, idx) => (
        <g key={idx}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="rgba(161,161,170,0.9)">
            {abbreviate(v)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const cx = pad.left + i * groupWidth + groupWidth / 2;
        const rev = Number(d.revenue ?? 0);
        const ni = Number(d.net_income ?? 0);
        const revH = Math.abs(yScale(rev) - yScale(0));
        const niH = Math.abs(yScale(ni) - yScale(0));
        return (
          <g key={d.date}>
            <rect
              x={cx - barWidth - 1}
              y={Math.min(yScale(rev), yScale(0))}
              width={barWidth}
              height={revH}
              fill="#3b82f6"
              opacity={0.85}
            />
            <rect
              x={cx + 1}
              y={Math.min(yScale(ni), yScale(0))}
              width={barWidth}
              height={niH}
              fill="#34d399"
              opacity={0.85}
            />
            <text x={cx} y={height - 8} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
              {(d.fiscal_year || d.date).slice(0, 4)}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${pad.left}, 6)`}>
        <rect x={0} y={0} width={10} height={10} fill="#3b82f6" />
        <text x={14} y={9} fontSize="10" fill="rgba(229,229,231,0.9)">
          Revenue
        </text>
        <rect x={70} y={0} width={10} height={10} fill="#34d399" />
        <text x={84} y={9} fontSize="10" fill="rgba(229,229,231,0.9)">
          Net Income
        </text>
      </g>
    </svg>
  );
}

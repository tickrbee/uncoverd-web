"use client";

import { useState } from "react";
import type { IncomeStatementRow, BalanceSheetRow, CashFlowRow } from "@/lib/data";

type AnyRow = IncomeStatementRow | BalanceSheetRow | CashFlowRow;
type Period = "annual" | "quarterly";

function abbrev(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  const n = Number(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function periodLabel(row: AnyRow, period: Period): string {
  if (period === "annual") return (row.fiscal_year || row.date).slice(0, 4);
  const d = new Date(row.date);
  return `${row.date.slice(0, 4)} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

export type StatementKey = "income" | "balance-sheet" | "cash-flow";

type LineItemDef = {
  key: string;
  label: string;
  bold?: boolean;
};

const INCOME_LINES: LineItemDef[] = [
  { key: "revenue", label: "Revenue", bold: true },
  { key: "gross_profit", label: "Gross profit" },
  { key: "operating_income", label: "Operating income" },
  { key: "ebitda", label: "EBITDA" },
  { key: "net_income", label: "Net income", bold: true },
  { key: "eps", label: "EPS" },
  { key: "eps_diluted", label: "EPS (diluted)" },
];

const BALANCE_LINES: LineItemDef[] = [
  { key: "total_assets", label: "Total assets", bold: true },
  { key: "total_current_assets", label: "Current assets" },
  { key: "cash_and_cash_equivalents", label: "Cash & equivalents" },
  { key: "cash_and_short_term_investments", label: "Cash & short-term investments" },
  { key: "total_liabilities", label: "Total liabilities", bold: true },
  { key: "total_current_liabilities", label: "Current liabilities" },
  { key: "short_term_debt", label: "Short-term debt" },
  { key: "long_term_debt", label: "Long-term debt" },
  { key: "total_debt", label: "Total debt" },
  { key: "net_debt", label: "Net debt" },
  { key: "total_stockholders_equity", label: "Stockholders' equity", bold: true },
];

const CASH_FLOW_LINES: LineItemDef[] = [
  { key: "net_cash_provided_by_operating_activities", label: "Operating activities", bold: true },
  { key: "net_cash_provided_by_investing_activities", label: "Investing activities", bold: true },
  { key: "net_cash_provided_by_financing_activities", label: "Financing activities", bold: true },
  { key: "free_cash_flow", label: "Free cash flow" },
  { key: "operating_cash_flow", label: "Operating cash flow (alt)" },
  { key: "capital_expenditure", label: "Capital expenditure" },
  { key: "common_dividends_paid", label: "Common dividends paid" },
  { key: "net_dividends_paid", label: "Net dividends paid" },
];

const LINES_BY_STATEMENT: Record<StatementKey, LineItemDef[]> = {
  income: INCOME_LINES,
  "balance-sheet": BALANCE_LINES,
  "cash-flow": CASH_FLOW_LINES,
};

type ChartSeries = { key: string; label: string; color: string };

const CHART_SERIES_BY_STATEMENT: Record<StatementKey, ChartSeries[]> = {
  income: [
    { key: "revenue", label: "Revenue", color: "#3b82f6" },
    { key: "net_income", label: "Net income", color: "#22d3ee" },
  ],
  "balance-sheet": [
    { key: "total_assets", label: "Total assets", color: "#10b981" },
    { key: "total_liabilities", label: "Total liabilities", color: "#ef4444" },
  ],
  "cash-flow": [
    { key: "net_cash_provided_by_operating_activities", label: "Operating", color: "#22d3ee" },
    { key: "net_cash_provided_by_investing_activities", label: "Investing", color: "#a78bfa" },
    { key: "net_cash_provided_by_financing_activities", label: "Financing", color: "#f97316" },
  ],
};

export function StatementDetail({
  symbol,
  statement,
  annual,
  quarterly,
}: {
  symbol: string;
  statement: StatementKey;
  annual: AnyRow[];
  quarterly: AnyRow[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const hasQuarterly = quarterly.length > 0;
  const lineItems = LINES_BY_STATEMENT[statement];
  const series = CHART_SERIES_BY_STATEMENT[statement];

  // Most recent first in source. The chart wants chronological (left → right).
  const chartData = [...source].reverse();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          {source.length} {period === "annual" ? "annual" : "quarterly"} period{source.length === 1 ? "" : "s"} on
          file for {symbol}.
        </p>
        <div className="dv-period-toggle">
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            className={period === "annual" ? "dv-period-toggle__btn--active" : "dv-period-toggle__btn"}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => setPeriod("quarterly")}
            className={period === "quarterly" ? "dv-period-toggle__btn--active" : "dv-period-toggle__btn"}
            disabled={!hasQuarterly}
            style={hasQuarterly ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
          >
            Quarterly
          </button>
        </div>
      </div>

      <HistoryChart data={chartData} period={period} series={series} />

      <StatementTable source={source} period={period} lineItems={lineItems} />
    </div>
  );
}

function HistoryChart({
  data,
  period,
  series,
}: {
  data: AnyRow[];
  period: Period;
  series: ChartSeries[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="dv-empty">No {period} history available.</div>;
  }

  const width = 1200;
  const height = 360;
  const pad = { top: 32, right: 24, bottom: 48, left: 80 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  // Pull series values per row.
  const seriesValues: number[][] = series.map((s) =>
    data.map((r) => {
      const v = (r as unknown as Record<string, number | null>)[s.key];
      return v == null || !isFinite(Number(v)) ? 0 : Number(v);
    })
  );

  const allVals = seriesValues.flat();
  const yMax = Math.max(1, ...allVals);
  const yMin = Math.min(0, ...allVals);
  const yRange = yMax - yMin || 1;
  const yScale = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  const groupW = innerW / Math.max(data.length, 1);
  const totalBars = series.length;
  const barW = Math.max(2, Math.min(28, (groupW * 0.85) / totalBars));

  // Label only every Nth period if there are many points so the X-axis stays
  // readable. Aim for ~14 labels max.
  const labelStep = Math.max(1, Math.ceil(data.length / 14));

  const yTicks = [yMax, (yMax * 3 + yMin) / 4, (yMax + yMin) / 2, (yMax + yMin * 3) / 4, yMin]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="dv-fin-panel" style={{ marginBottom: "0.6rem" }}>
      <div className="dv-fin-panel__header">
        <h3>History</h3>
        <Legend items={series.map((s) => ({ color: s.color, label: s.label }))} />
      </div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="dv-fin-svg"
          style={{ height: 380 }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {yTicks.map((v, i) => (
            <g key={`y-${i}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="rgba(255,255,255,0.06)"
              />
              <text x={pad.left - 8} y={yScale(v) + 3} textAnchor="end" fontSize="11" fill="rgba(161,161,170,0.9)">
                {abbrev(v)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cxBase = pad.left + i * groupW + groupW / 2;
            const groupStart = cxBase - (barW * totalBars + (totalBars - 1) * 2) / 2;
            return (
              <g key={i} onMouseEnter={() => setHoverIdx(i)}>
                <rect
                  x={pad.left + i * groupW}
                  y={pad.top}
                  width={groupW}
                  height={innerH}
                  fill={i === hoverIdx ? "rgba(255,255,255,0.04)" : "transparent"}
                />
                {series.map((s, sIdx) => {
                  const v = seriesValues[sIdx][i];
                  const x = groupStart + sIdx * (barW + 2);
                  const top = Math.min(yScale(v), yScale(0));
                  const h = Math.max(1, Math.abs(yScale(v) - yScale(0)));
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={top}
                      width={barW}
                      height={h}
                      fill={s.color}
                      opacity={i === hoverIdx ? 1 : 0.9}
                    />
                  );
                })}
                {i % labelStep === 0 && (
                  <text x={cxBase} y={height - 14} textAnchor="middle" fontSize="11" fill="rgba(161,161,170,0.9)">
                    {periodLabel(d, period)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hoverIdx != null && data[hoverIdx] && (
          <div className="dv-fin-tooltip">
            <strong>{periodLabel(data[hoverIdx], period)}</strong>
            {series.map((s, sIdx) => (
              <div key={s.key}>
                {s.label}: <strong>{abbrev(seriesValues[sIdx][hoverIdx])}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="dv-fin-legend">
      {items.map((it) => (
        <span key={it.label}>
          <span className="dv-fin-legend__dot" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function StatementTable({
  source,
  period,
  lineItems,
}: {
  source: AnyRow[];
  period: Period;
  lineItems: LineItemDef[];
}) {
  if (source.length === 0) {
    return <div className="dv-empty">No {period} data on file.</div>;
  }

  return (
    <div className="dv-fin-statement-table">
      <div className="dv-table-scroll">
        <table className="dv-table dv-table--statement">
          <thead>
            <tr>
              <th>Line item</th>
              {source.map((r, i) => (
                <th key={i} className="dv-th--num">
                  {periodLabel(r, period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li) => (
              <tr key={li.key} className={li.bold ? "dv-row--total" : undefined}>
                <td>{li.label}</td>
                {source.map((r, i) => {
                  const v = (r as unknown as Record<string, number | null>)[li.key];
                  return (
                    <td key={i} className="dv-td--num">
                      {li.key === "eps" || li.key === "eps_diluted"
                        ? v != null
                          ? `$${Number(v).toFixed(2)}`
                          : "—"
                        : abbrev(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { IncomeStatementRow, BalanceSheetRow, CashFlowRow } from "@/lib/data";

function abbrev(v: number | null): string {
  if (v == null || !isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

export type FinancialsData = {
  income: IncomeStatementRow[];
  balance: BalanceSheetRow[];
  cashFlow: CashFlowRow[];
};

export function FinancialsSection({
  annual,
  quarterly,
}: {
  annual: FinancialsData;
  quarterly?: FinancialsData;
}) {
  if (
    annual.income.length === 0 &&
    annual.balance.length === 0 &&
    annual.cashFlow.length === 0 &&
    (!quarterly ||
      (quarterly.income.length === 0 && quarterly.balance.length === 0 && quarterly.cashFlow.length === 0))
  ) {
    return <div className="dv-empty">No financials available.</div>;
  }

  return (
    <div className="dv-fin-grid">
      <PerformancePanel annual={annual.income} quarterly={quarterly?.income ?? []} />
      <RevenueToProfitPanel annual={annual.income} quarterly={quarterly?.income ?? []} />
      <DebtPanel
        annualBalance={annual.balance}
        quarterlyBalance={quarterly?.balance ?? []}
        annualCashFlow={annual.cashFlow}
        quarterlyCashFlow={quarterly?.cashFlow ?? []}
      />
      <EarningsPanel annual={annual.income} quarterly={quarterly?.income ?? []} />
    </div>
  );
}

type Period = "annual" | "quarterly";

function PeriodToggle({
  value,
  onChange,
  hasQuarterly,
}: {
  value: Period;
  onChange: (p: Period) => void;
  hasQuarterly: boolean;
}) {
  return (
    <div className="dv-period-toggle">
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={value === "annual" ? "dv-period-toggle__btn--active" : "dv-period-toggle__btn"}
      >
        Annual
      </button>
      <button
        type="button"
        onClick={() => onChange("quarterly")}
        className={value === "quarterly" ? "dv-period-toggle__btn--active" : "dv-period-toggle__btn"}
        disabled={!hasQuarterly}
        style={hasQuarterly ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
      >
        Quarterly
      </button>
    </div>
  );
}

function PerformancePanel({ annual, quarterly }: { annual: IncomeStatementRow[]; quarterly: IncomeStatementRow[] }) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const data = [...source].reverse();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 640;
  const height = 240;
  const pad = { top: 28, right: 56, bottom: 32, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const revenues = data.map((d) => Number(d.revenue ?? 0));
  const netIncomes = data.map((d) => Number(d.net_income ?? 0));
  const margins = data.map((d) =>
    d.revenue && Number(d.revenue) > 0 ? (Number(d.net_income ?? 0) / Number(d.revenue)) * 100 : 0
  );

  const yMax = Math.max(1, ...revenues, ...netIncomes);
  const yMin = Math.min(0, ...netIncomes);
  const yRange = yMax - yMin || 1;
  const yScale = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  const marginMax = Math.max(1, ...margins, 5);
  const marginMin = Math.min(0, ...margins);
  const marginRange = marginMax - marginMin || 1;
  const marginYScale = (v: number) => pad.top + (1 - (v - marginMin) / marginRange) * innerH;

  const groupWidth = innerW / Math.max(data.length, 1);
  const barWidth = Math.min(24, groupWidth * 0.32);

  const marginLine = data
    .map((_, i) => {
      const x = pad.left + i * groupWidth + groupWidth / 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${marginYScale(margins[i]).toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Performance</h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Legend
            items={[
              { color: "#3b82f6", label: "Revenue" },
              { color: "#22d3ee", label: "Net income" },
              { color: "#f59e0b", label: "Net margin %" },
            ]}
          />
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
        </div>
      </div>
      {data.length === 0 ? (
        <div className="dv-empty">No {period} data.</div>
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="dv-fin-svg"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {[yMax, (yMax + yMin) / 2, yMin].filter((v, i, a) => a.indexOf(v) === i).map((v, i) => (
              <g key={`yl-${i}`}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={yScale(v)}
                  y2={yScale(v)}
                  stroke="rgba(255,255,255,0.06)"
                />
                <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="10" fill="rgba(161,161,170,0.9)">
                  {abbrev(v)}
                </text>
              </g>
            ))}
            {[marginMax, (marginMax + marginMin) / 2, marginMin]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((v, i) => (
                <text
                  key={`yr-${i}`}
                  x={width - pad.right + 6}
                  y={marginYScale(v) + 3}
                  fontSize="10"
                  fill="rgba(245,158,11,0.9)"
                >
                  {v.toFixed(0)}%
                </text>
              ))}
            {data.map((d, i) => {
              const cx = pad.left + i * groupWidth + groupWidth / 2;
              const rev = Number(d.revenue ?? 0);
              const ni = Number(d.net_income ?? 0);
              const hover = i === hoverIdx;
              return (
                <g key={`bar-${i}`} onMouseEnter={() => setHoverIdx(i)}>
                  <rect
                    x={cx - groupWidth / 2}
                    y={pad.top}
                    width={groupWidth}
                    height={innerH}
                    fill={hover ? "rgba(255,255,255,0.04)" : "transparent"}
                  />
                  <rect
                    x={cx - barWidth - 2}
                    y={Math.min(yScale(rev), yScale(0))}
                    width={barWidth}
                    height={Math.abs(yScale(rev) - yScale(0))}
                    fill="#3b82f6"
                    opacity={hover ? 1 : 0.9}
                  />
                  <rect
                    x={cx + 2}
                    y={Math.min(yScale(ni), yScale(0))}
                    width={barWidth}
                    height={Math.abs(yScale(ni) - yScale(0))}
                    fill="#22d3ee"
                    opacity={hover ? 1 : 0.9}
                  />
                  <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
                    {period === "annual"
                      ? (d.fiscal_year || d.date).slice(0, 4)
                      : `${d.date.slice(0, 4)} Q${Math.ceil((new Date(d.date).getMonth() + 1) / 3)}`}
                  </text>
                </g>
              );
            })}
            <path d={marginLine} fill="none" stroke="#f59e0b" strokeWidth={1.8} />
            {data.map((_, i) => {
              const cx = pad.left + i * groupWidth + groupWidth / 2;
              return (
                <circle
                  key={`m-${i}`}
                  cx={cx}
                  cy={marginYScale(margins[i])}
                  r={i === hoverIdx ? 4 : 3}
                  fill="#f59e0b"
                  stroke="#0a0a0a"
                  strokeWidth={1}
                />
              );
            })}
          </svg>
          {hoverIdx != null && data[hoverIdx] && (
            <div className="dv-fin-tooltip">
              <strong>
                {period === "annual"
                  ? (data[hoverIdx].fiscal_year || data[hoverIdx].date).slice(0, 4)
                  : `${data[hoverIdx].date.slice(0, 4)} Q${Math.ceil((new Date(data[hoverIdx].date).getMonth() + 1) / 3)}`}
              </strong>
              <div>
                Revenue: <strong>{abbrev(Number(data[hoverIdx].revenue ?? 0))}</strong>
              </div>
              <div>
                Net Income: <strong>{abbrev(Number(data[hoverIdx].net_income ?? 0))}</strong>
              </div>
              <div>
                Net Margin: <strong>{margins[hoverIdx].toFixed(1)}%</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RevenueToProfitPanel({ annual, quarterly }: { annual: IncomeStatementRow[]; quarterly: IncomeStatementRow[] }) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const latest = source[0];
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!latest) {
    return (
      <div className="dv-fin-panel">
        <div className="dv-fin-panel__header">
          <h3>Revenue to profit conversion</h3>
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
        </div>
        <div className="dv-empty">No {period} data.</div>
      </div>
    );
  }

  const revenue = Number(latest.revenue ?? 0);
  const grossProfit = Number(latest.gross_profit ?? 0);
  const operatingIncome = Number(latest.operating_income ?? 0);
  const netIncome = Number(latest.net_income ?? 0);
  const cogs = revenue - grossProfit;
  const opex = grossProfit - operatingIncome;
  const taxesEtc = operatingIncome - netIncome;

  type Bar = { label: string; value: number; positive: boolean; isTotal?: boolean };
  const bars: Bar[] = [
    { label: "Revenue", value: revenue, positive: true, isTotal: true },
    { label: "COGS", value: -cogs, positive: false },
    { label: "Gross profit", value: grossProfit, positive: true, isTotal: true },
    { label: "Op expenses", value: -opex, positive: false },
    { label: "Op income", value: operatingIncome, positive: true, isTotal: true },
    { label: "Taxes & other", value: -taxesEtc, positive: false },
    { label: "Net income", value: netIncome, positive: true, isTotal: true },
  ];

  const width = 640;
  const height = 240;
  const pad = { top: 16, right: 16, bottom: 38, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const yMax = revenue * 1.05;
  const yScale = (v: number) => pad.top + (1 - v / yMax) * innerH;
  const barWidth = (innerW / bars.length) * 0.7;

  let running = 0;
  const drawn: Array<{ b: Bar; top: number; bottom: number; x: number }> = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    let top: number, bottom: number;
    if (b.isTotal) {
      top = yScale(Math.abs(b.value));
      bottom = yScale(0);
      running = b.value;
    } else {
      const start = running;
      running = running + b.value;
      top = yScale(Math.max(start, running));
      bottom = yScale(Math.min(start, running));
    }
    drawn.push({
      b,
      top,
      bottom,
      x: pad.left + i * (innerW / bars.length) + (innerW / bars.length - barWidth) / 2,
    });
  }

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Revenue to profit conversion</h3>
        <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
      </div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="dv-fin-svg"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {drawn.map((d, i) => (
            <g key={i} onMouseEnter={() => setHoverIdx(i)}>
              <rect
                x={d.x}
                y={d.top}
                width={barWidth}
                height={Math.max(1, d.bottom - d.top)}
                fill={d.b.isTotal ? "#34d399" : d.b.positive ? "#3b82f6" : "#ef4444"}
                opacity={i === hoverIdx ? 1 : 0.9}
              />
              <text
                x={d.x + barWidth / 2}
                y={d.top - 6}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(229,229,231,0.9)"
              >
                {abbrev(Math.abs(d.b.value))}
              </text>
              <text
                x={d.x + barWidth / 2}
                y={height - 22}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(161,161,170,0.9)"
              >
                {d.b.label.length > 10 ? d.b.label.slice(0, 9) + "…" : d.b.label}
              </text>
            </g>
          ))}
          <text x={pad.left} y={height - 6} fontSize="9" fill="rgba(161,161,170,0.7)">
            {period === "annual"
              ? `${(latest.fiscal_year || latest.date).slice(0, 4)} fiscal year`
              : `${latest.date.slice(0, 4)} Q${Math.ceil((new Date(latest.date).getMonth() + 1) / 3)}`}
          </text>
        </svg>
        {hoverIdx != null && drawn[hoverIdx] && (
          <div className="dv-fin-tooltip">
            <strong>{drawn[hoverIdx].b.label}</strong>
            <div>
              Value: <strong>{abbrev(Math.abs(drawn[hoverIdx].b.value))}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DebtPanel({
  annualBalance,
  quarterlyBalance,
  annualCashFlow,
  quarterlyCashFlow,
}: {
  annualBalance: BalanceSheetRow[];
  quarterlyBalance: BalanceSheetRow[];
  annualCashFlow: CashFlowRow[];
  quarterlyCashFlow: CashFlowRow[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const balance = period === "annual" ? annualBalance : quarterlyBalance;
  const cashFlow = period === "annual" ? annualCashFlow : quarterlyCashFlow;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const balReversed = [...balance].reverse();
  const cfReversed = [...cashFlow].reverse();
  const fcfByKey = new Map<string, number>();
  for (const c of cfReversed) {
    const key = period === "annual" ? (c.fiscal_year || c.date).slice(0, 4) : c.date;
    fcfByKey.set(key, Number(c.free_cash_flow ?? 0));
  }
  const data = balReversed.map((b) => {
    const key = period === "annual" ? (b.fiscal_year || b.date).slice(0, 4) : b.date;
    return {
      label: period === "annual" ? key : `${key.slice(0, 4)} Q${Math.ceil((new Date(b.date).getMonth() + 1) / 3)}`,
      debt: Number(b.total_debt ?? b.long_term_debt ?? 0),
      cash: Number(b.cash_and_cash_equivalents ?? 0),
      fcf: fcfByKey.get(key) ?? 0,
    };
  });

  if (data.length === 0) {
    return (
      <div className="dv-fin-panel">
        <div className="dv-fin-panel__header">
          <h3>Debt level &amp; coverage</h3>
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterlyBalance.length > 0} />
        </div>
        <div className="dv-empty">No {period} data.</div>
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const pad = { top: 28, right: 16, bottom: 32, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const yMax = Math.max(1, ...data.flatMap((d) => [d.debt, d.fcf, d.cash]));
  const yMin = Math.min(0, ...data.flatMap((d) => [d.debt, d.fcf, d.cash]));
  const yRange = yMax - yMin || 1;
  const yScale = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  const groupWidth = innerW / data.length;
  const barWidth = Math.min(20, groupWidth * 0.27);

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Debt level &amp; coverage</h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Legend
            items={[
              { color: "#ef4444", label: "Debt" },
              { color: "#22d3ee", label: "Free cash flow" },
              { color: "#60a5fa", label: "Cash & equivalents" },
            ]}
          />
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterlyBalance.length > 0} />
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="dv-fin-svg"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {[yMax, yMax / 2, 0, yMin].filter((v, i, a) => a.indexOf(v) === i).map((v, i) => (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" />
              <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="10" fill="rgba(161,161,170,0.9)">
                {abbrev(v)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + i * groupWidth + groupWidth / 2;
            return (
              <g key={d.label} onMouseEnter={() => setHoverIdx(i)}>
                <rect
                  x={cx - groupWidth / 2}
                  y={pad.top}
                  width={groupWidth}
                  height={innerH}
                  fill={i === hoverIdx ? "rgba(255,255,255,0.04)" : "transparent"}
                />
                <rect
                  x={cx - barWidth * 1.5 - 1}
                  y={Math.min(yScale(d.debt), yScale(0))}
                  width={barWidth}
                  height={Math.abs(yScale(d.debt) - yScale(0))}
                  fill="#ef4444"
                  opacity={i === hoverIdx ? 1 : 0.9}
                />
                <rect
                  x={cx - barWidth / 2}
                  y={Math.min(yScale(d.fcf), yScale(0))}
                  width={barWidth}
                  height={Math.abs(yScale(d.fcf) - yScale(0))}
                  fill="#22d3ee"
                  opacity={i === hoverIdx ? 1 : 0.9}
                />
                <rect
                  x={cx + barWidth / 2 + 1}
                  y={Math.min(yScale(d.cash), yScale(0))}
                  width={barWidth}
                  height={Math.abs(yScale(d.cash) - yScale(0))}
                  fill="#60a5fa"
                  opacity={i === hoverIdx ? 1 : 0.9}
                />
                <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hoverIdx != null && data[hoverIdx] && (
          <div className="dv-fin-tooltip">
            <strong>{data[hoverIdx].label}</strong>
            <div>
              Debt: <strong>{abbrev(data[hoverIdx].debt)}</strong>
            </div>
            <div>
              FCF: <strong>{abbrev(data[hoverIdx].fcf)}</strong>
            </div>
            <div>
              Cash: <strong>{abbrev(data[hoverIdx].cash)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EarningsPanel({ annual, quarterly }: { annual: IncomeStatementRow[]; quarterly: IncomeStatementRow[] }) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const data = [...source].reverse();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="dv-fin-panel">
        <div className="dv-fin-panel__header">
          <h3>Earnings per share</h3>
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
        </div>
        <div className="dv-empty">No {period} data.</div>
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const pad = { top: 28, right: 16, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const epses = data.map((d) => Number(d.eps_diluted ?? d.eps ?? 0));
  const yMax = Math.max(1, ...epses);
  const yMin = Math.min(0, ...epses);
  const yRange = yMax - yMin || 1;
  const yScale = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  const groupWidth = innerW / Math.max(data.length, 1);

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Earnings per share</h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Legend items={[{ color: "#34d399", label: "EPS diluted" }]} />
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="dv-fin-svg"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {[yMax, yMax / 2, 0].filter((v, i, a) => a.indexOf(v) === i).map((v, i) => (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" />
              <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="10" fill="rgba(161,161,170,0.9)">
                ${v.toFixed(2)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + i * groupWidth + groupWidth / 2;
            return (
              <g key={d.date} onMouseEnter={() => setHoverIdx(i)}>
                <rect
                  x={cx - groupWidth / 2}
                  y={pad.top}
                  width={groupWidth}
                  height={innerH}
                  fill={i === hoverIdx ? "rgba(255,255,255,0.04)" : "transparent"}
                />
                <circle cx={cx} cy={yScale(epses[i])} r={i === hoverIdx ? 8 : 6} fill="#34d399" opacity={i === hoverIdx ? 1 : 0.9} />
                <text x={cx} y={yScale(epses[i]) - 10} textAnchor="middle" fontSize="9" fill="rgba(229,229,231,0.9)">
                  ${epses[i].toFixed(2)}
                </text>
                <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
                  {period === "annual"
                    ? (d.fiscal_year || d.date).slice(0, 4)
                    : `${d.date.slice(0, 4)} Q${Math.ceil((new Date(d.date).getMonth() + 1) / 3)}`}
                </text>
              </g>
            );
          })}
        </svg>
        {hoverIdx != null && data[hoverIdx] && (
          <div className="dv-fin-tooltip">
            <strong>
              {period === "annual"
                ? (data[hoverIdx].fiscal_year || data[hoverIdx].date).slice(0, 4)
                : `${data[hoverIdx].date.slice(0, 4)} Q${Math.ceil((new Date(data[hoverIdx].date).getMonth() + 1) / 3)}`}
            </strong>
            <div>
              EPS: <strong>${epses[hoverIdx].toFixed(2)}</strong>
            </div>
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

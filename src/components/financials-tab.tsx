"use client";

import { useState } from "react";
import Link from "next/link";
import { PremiumLock } from "@/components/premium-lock";
import type { IncomeStatementRow, BalanceSheetRow, CashFlowRow } from "@/lib/data";

function abbrev(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  const n = Number(v);
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function periodLabel(row: { date: string; fiscal_year: string | null }, period: Period): string {
  if (period === "annual") return (row.fiscal_year || row.date).slice(0, 4);
  const d = new Date(row.date);
  return `${row.date.slice(0, 4)} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

type Period = "annual" | "quarterly";

export type FinancialsTabProps = {
  symbol: string;
  annual: {
    income: IncomeStatementRow[];
    balance: BalanceSheetRow[];
    cashFlow: CashFlowRow[];
  };
  quarterly: {
    income: IncomeStatementRow[];
    balance: BalanceSheetRow[];
    cashFlow: CashFlowRow[];
  };
  isPremium?: boolean;
};

export function FinancialsTab({ symbol, annual, quarterly, isPremium }: FinancialsTabProps) {
  const noData =
    annual.income.length === 0 &&
    annual.balance.length === 0 &&
    annual.cashFlow.length === 0 &&
    quarterly.income.length === 0 &&
    quarterly.balance.length === 0 &&
    quarterly.cashFlow.length === 0;

  if (noData) {
    return (
      <section className="dv-section">
        <h2 className="dv-section__title">Financials — {symbol}</h2>
        <div className="dv-empty">No financials data available for {symbol} yet.</div>
      </section>
    );
  }

  return (
    <section className="dv-section">
      <h2 className="dv-section__title">Financials — {symbol}</h2>
      <div className="dv-fin-grid">
        <IncomeChart symbol={symbol} annual={annual.income} quarterly={quarterly.income} isPremium={isPremium} />
        <BalanceSheetChart symbol={symbol} annual={annual.balance} quarterly={quarterly.balance} isPremium={isPremium} />
        <CashFlowChart symbol={symbol} annual={annual.cashFlow} quarterly={quarterly.cashFlow} isPremium={isPremium} />
      </div>
    </section>
  );
}

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

function SeeAllLink({ href, isPremium }: { href: string; isPremium?: boolean }) {
  if (!isPremium) {
    // Free users: button is fully visible, but clicking opens the upgrade
    // prompt rather than navigating to the detail page.
    return (
      <PremiumLock isPremium={false} inline noBlur>
        <span className="dv-fin-seeall">See all →</span>
      </PremiumLock>
    );
  }
  return (
    <Link href={href} className="dv-fin-seeall">
      See all →
    </Link>
  );
}

// ---------- Chart 1: Income statement ----------

function IncomeChart({
  symbol,
  annual,
  quarterly,
  isPremium,
}: {
  symbol: string;
  annual: IncomeStatementRow[];
  quarterly: IncomeStatementRow[];
  isPremium?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const data = [...source].reverse();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 720;
  const height = 280;
  const pad = { top: 28, right: 56, bottom: 36, left: 64 };
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

  const groupW = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.min(28, groupW * 0.32);

  const marginPath = data
    .map((_, i) => `${i === 0 ? "M" : "L"}${(pad.left + i * groupW + groupW / 2).toFixed(1)},${marginYScale(margins[i]).toFixed(1)}`)
    .join(" ");

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Income statement</h3>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <Legend
            items={[
              { color: "#3b82f6", label: "Revenue" },
              { color: "#22d3ee", label: "Net income" },
              { color: "#f59e0b", label: "Profit margin %" },
            ]}
          />
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
          <SeeAllLink href={`/stocks/${symbol}/financials/income`} isPremium={isPremium} />
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
            {[yMax, (yMax + yMin) / 2, yMin]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((v, i) => (
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
              const cx = pad.left + i * groupW + groupW / 2;
              const rev = revenues[i];
              const ni = netIncomes[i];
              const hover = i === hoverIdx;
              return (
                <g key={i} onMouseEnter={() => setHoverIdx(i)}>
                  <rect
                    x={cx - groupW / 2}
                    y={pad.top}
                    width={groupW}
                    height={innerH}
                    fill={hover ? "rgba(255,255,255,0.04)" : "transparent"}
                  />
                  <rect
                    x={cx - barW - 2}
                    y={Math.min(yScale(rev), yScale(0))}
                    width={barW}
                    height={Math.abs(yScale(rev) - yScale(0))}
                    fill="#3b82f6"
                    opacity={hover ? 1 : 0.92}
                  />
                  <rect
                    x={cx + 2}
                    y={Math.min(yScale(ni), yScale(0))}
                    width={barW}
                    height={Math.abs(yScale(ni) - yScale(0))}
                    fill="#22d3ee"
                    opacity={hover ? 1 : 0.92}
                  />
                  <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
                    {periodLabel(d, period)}
                  </text>
                </g>
              );
            })}
            <path d={marginPath} fill="none" stroke="#f59e0b" strokeWidth={2} />
            {data.map((_, i) => {
              const cx = pad.left + i * groupW + groupW / 2;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={marginYScale(margins[i])}
                  r={i === hoverIdx ? 5 : 3.5}
                  fill="#f59e0b"
                  stroke="#0a0a0a"
                  strokeWidth={1.2}
                />
              );
            })}
          </svg>
          {hoverIdx != null && data[hoverIdx] && (
            <div className="dv-fin-tooltip">
              <strong>{periodLabel(data[hoverIdx], period)}</strong>
              <div>Revenue: <strong>{abbrev(revenues[hoverIdx])}</strong></div>
              <div>Net income: <strong>{abbrev(netIncomes[hoverIdx])}</strong></div>
              <div>Profit margin: <strong>{margins[hoverIdx].toFixed(2)}%</strong></div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ---------- Chart 2: Balance sheet ----------

function BalanceSheetChart({
  symbol,
  annual,
  quarterly,
  isPremium,
}: {
  symbol: string;
  annual: BalanceSheetRow[];
  quarterly: BalanceSheetRow[];
  isPremium?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const data = [...source].reverse();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 720;
  const height = 280;
  const pad = { top: 28, right: 16, bottom: 36, left: 64 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const assets = data.map((d) => Number(d.total_assets ?? 0));
  const liabilities = data.map((d) => Number(d.total_liabilities ?? 0));

  const yMax = Math.max(1, ...assets, ...liabilities);
  const yScale = (v: number) => pad.top + (1 - v / yMax) * innerH;

  const groupW = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.min(32, groupW * 0.38);

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Balance sheet</h3>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <Legend
            items={[
              { color: "#10b981", label: "Total assets" },
              { color: "#ef4444", label: "Total liabilities" },
            ]}
          />
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
          <SeeAllLink href={`/stocks/${symbol}/financials/balance-sheet`} isPremium={isPremium} />
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
            {[yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0].map((v, i) => (
              <g key={i}>
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
            {data.map((d, i) => {
              const cx = pad.left + i * groupW + groupW / 2;
              const a = assets[i];
              const l = liabilities[i];
              const hover = i === hoverIdx;
              return (
                <g key={i} onMouseEnter={() => setHoverIdx(i)}>
                  <rect
                    x={cx - groupW / 2}
                    y={pad.top}
                    width={groupW}
                    height={innerH}
                    fill={hover ? "rgba(255,255,255,0.04)" : "transparent"}
                  />
                  <rect
                    x={cx - barW - 2}
                    y={yScale(a)}
                    width={barW}
                    height={Math.max(1, yScale(0) - yScale(a))}
                    fill="#10b981"
                    opacity={hover ? 1 : 0.92}
                  />
                  <rect
                    x={cx + 2}
                    y={yScale(l)}
                    width={barW}
                    height={Math.max(1, yScale(0) - yScale(l))}
                    fill="#ef4444"
                    opacity={hover ? 1 : 0.92}
                  />
                  <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
                    {periodLabel(d, period)}
                  </text>
                </g>
              );
            })}
          </svg>
          {hoverIdx != null && data[hoverIdx] && (
            <div className="dv-fin-tooltip">
              <strong>{periodLabel(data[hoverIdx], period)}</strong>
              <div>Total assets: <strong>{abbrev(assets[hoverIdx])}</strong></div>
              <div>Total liabilities: <strong>{abbrev(liabilities[hoverIdx])}</strong></div>
              <div>
                Equity: <strong>{abbrev(assets[hoverIdx] - liabilities[hoverIdx])}</strong>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ---------- Chart 3: Cash flow ----------

function CashFlowChart({
  symbol,
  annual,
  quarterly,
  isPremium,
}: {
  symbol: string;
  annual: CashFlowRow[];
  quarterly: CashFlowRow[];
  isPremium?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const source = period === "annual" ? annual : quarterly;
  const data = [...source].reverse();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 720;
  const height = 280;
  const pad = { top: 28, right: 16, bottom: 36, left: 64 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  // Each row may have either the verbose names or the alias `operating_cash_flow`.
  // Prefer the activity totals because they include investing + financing.
  const operating = data.map((d) =>
    Number(d.net_cash_provided_by_operating_activities ?? d.operating_cash_flow ?? 0)
  );
  const investing = data.map((d) => Number(d.net_cash_provided_by_investing_activities ?? 0));
  const financing = data.map((d) => Number(d.net_cash_provided_by_financing_activities ?? 0));

  const allVals = [...operating, ...investing, ...financing];
  const yMax = Math.max(1, ...allVals);
  const yMin = Math.min(0, ...allVals);
  const yRange = yMax - yMin || 1;
  const yScale = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  const groupW = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.min(22, groupW * 0.26);

  return (
    <div className="dv-fin-panel">
      <div className="dv-fin-panel__header">
        <h3>Cash flow</h3>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <Legend
            items={[
              { color: "#22d3ee", label: "Operating" },
              { color: "#a78bfa", label: "Investing" },
              { color: "#f97316", label: "Financing" },
            ]}
          />
          <PeriodToggle value={period} onChange={setPeriod} hasQuarterly={quarterly.length > 0} />
          <SeeAllLink href={`/stocks/${symbol}/financials/cash-flow`} isPremium={isPremium} />
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
            {[yMax, yMax / 2, 0, yMin / 2, yMin]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((v, i) => (
                <g key={i}>
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
            {data.map((d, i) => {
              const cx = pad.left + i * groupW + groupW / 2;
              const o = operating[i];
              const inv = investing[i];
              const fin = financing[i];
              const hover = i === hoverIdx;
              return (
                <g key={i} onMouseEnter={() => setHoverIdx(i)}>
                  <rect
                    x={cx - groupW / 2}
                    y={pad.top}
                    width={groupW}
                    height={innerH}
                    fill={hover ? "rgba(255,255,255,0.04)" : "transparent"}
                  />
                  <rect
                    x={cx - barW * 1.5 - 2}
                    y={Math.min(yScale(o), yScale(0))}
                    width={barW}
                    height={Math.max(1, Math.abs(yScale(o) - yScale(0)))}
                    fill="#22d3ee"
                    opacity={hover ? 1 : 0.92}
                  />
                  <rect
                    x={cx - barW / 2}
                    y={Math.min(yScale(inv), yScale(0))}
                    width={barW}
                    height={Math.max(1, Math.abs(yScale(inv) - yScale(0)))}
                    fill="#a78bfa"
                    opacity={hover ? 1 : 0.92}
                  />
                  <rect
                    x={cx + barW / 2 + 2}
                    y={Math.min(yScale(fin), yScale(0))}
                    width={barW}
                    height={Math.max(1, Math.abs(yScale(fin) - yScale(0)))}
                    fill="#f97316"
                    opacity={hover ? 1 : 0.92}
                  />
                  <text x={cx} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(161,161,170,0.9)">
                    {periodLabel(d, period)}
                  </text>
                </g>
              );
            })}
          </svg>
          {hoverIdx != null && data[hoverIdx] && (
            <div className="dv-fin-tooltip">
              <strong>{periodLabel(data[hoverIdx], period)}</strong>
              <div>Operating: <strong>{abbrev(operating[hoverIdx])}</strong></div>
              <div>Investing: <strong>{abbrev(investing[hoverIdx])}</strong></div>
              <div>Financing: <strong>{abbrev(financing[hoverIdx])}</strong></div>
              <div>Free cash flow: <strong>{abbrev(Number(data[hoverIdx].free_cash_flow ?? 0))}</strong></div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

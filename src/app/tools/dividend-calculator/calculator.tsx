"use client";

import { useMemo, useState } from "react";

// Interactive dividend calculator: current income + yield, plus an optional
// multi-year projection with dividend growth and DRIP (reinvestment).
export function DividendCalculator() {
  const [shares, setShares] = useState(100);
  const [price, setPrice] = useState(50);
  const [dps, setDps] = useState(2); // annual dividend per share
  const [growth, setGrowth] = useState(5); // annual dividend growth %
  const [years, setYears] = useState(20);
  const [reinvest, setReinvest] = useState(true);

  const current = useMemo(() => {
    const invested = shares * price;
    const annual = shares * dps;
    const yieldPct = price > 0 ? (dps / price) * 100 : 0;
    return { invested, annual, monthly: annual / 12, quarterly: annual / 4, yieldPct };
  }, [shares, price, dps]);

  const projection = useMemo(() => {
    let s = shares;
    let d = dps;
    let cumulative = 0;
    const pts: Array<{ year: number; shares: number; value: number; income: number; cumulative: number }> = [
      { year: 0, shares: s, value: s * price, income: s * d, cumulative: 0 },
    ];
    for (let y = 1; y <= years; y++) {
      const income = s * d;
      cumulative += income;
      if (reinvest && price > 0) s += income / price;
      d *= 1 + growth / 100;
      pts.push({ year: y, shares: s, value: s * price, income: s * d, cumulative });
    }
    return pts;
  }, [shares, price, dps, growth, years, reinvest]);

  const final = projection[projection.length - 1];
  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <>
      <div className="dv-card-grid" style={{ gridTemplateColumns: "1fr 1.5fr" }}>
        <div className="dv-stat-card" style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <h3 style={{ margin: 0 }}>Inputs</h3>
          <NumField label="Number of shares" value={shares} onChange={setShares} />
          <NumField label="Share price ($)" value={price} onChange={setPrice} step={0.01} />
          <NumField label="Annual dividend per share ($)" value={dps} onChange={setDps} step={0.01} />
          <NumField label="Annual dividend growth (%)" value={growth} onChange={setGrowth} step={0.1} />
          <NumField label="Years to project" value={years} onChange={setYears} />
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.9rem" }}>
            <input type="checkbox" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} />
            <span style={{ color: "var(--text-secondary)" }}>Reinvest dividends (DRIP)</span>
          </label>
        </div>

        <div className="dv-stat-card" style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <h3 style={{ margin: 0 }}>Today</h3>
          <div className="dv-card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <Out label="Investment value" value={money(current.invested)} />
            <Out label="Dividend yield" value={`${current.yieldPct.toFixed(2)}%`} />
            <Out label="Annual income" value={money(current.annual)} />
            <Out label="Monthly income" value={money(current.monthly)} />
            <Out label="Quarterly income" value={money(current.quarterly)} />
          </div>
          <h3 style={{ margin: "0.5rem 0 0" }}>
            After {years} years {reinvest ? "(with DRIP)" : "(no reinvestment)"}
          </h3>
          <div className="dv-card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <Out label="Portfolio value" value={money(final.value)} />
            <Out label="Annual income" value={money(final.income)} />
            <Out label="Total dividends received" value={money(final.cumulative)} />
            <Out label="Shares owned" value={Math.round(final.shares).toLocaleString()} />
          </div>
        </div>
      </div>

      <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
        <div className="dv-table-scroll" style={{ maxHeight: 360 }}>
          <table className="dv-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="dv-th--num">Shares</th>
                <th className="dv-th--num">Portfolio value</th>
                <th className="dv-th--num">Annual income</th>
                <th className="dv-th--num">Cumulative dividends</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((p) => (
                <tr key={p.year}>
                  <td>{p.year}</td>
                  <td className="dv-td--num">{Math.round(p.shares).toLocaleString()}</td>
                  <td className="dv-td--num">{money(p.value)}</td>
                  <td className="dv-td--num">{money(p.income)}</td>
                  <td className="dv-td--num">{money(p.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ marginTop: "0.6rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
        Projection assumes a constant share price and a constant annual dividend-growth rate, with
        dividends reinvested at the current price when DRIP is on. Real results vary with price and payout changes.
      </p>
    </>
  );
}

function Out({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value" style={{ fontSize: "1.25rem" }}>{value}</p>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="login-input"
      />
    </label>
  );
}

"use client";

import { useMemo, useState } from "react";

export function CompoundingCalculator() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [yieldPct, setYieldPct] = useState(4);
  const [growthPct, setGrowthPct] = useState(6);
  const [years, setYears] = useState(20);

  const results = useMemo(() => {
    const totalReturn = (yieldPct + growthPct) / 100;
    const monthlyRate = totalReturn / 12;
    let balance = initial;
    let totalContrib = initial;
    const points: Array<{ year: number; balance: number; contributed: number; income: number }> = [
      { year: 0, balance, contributed: totalContrib, income: 0 },
    ];
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + monthly;
      }
      totalContrib += monthly * 12;
      const income = balance * (yieldPct / 100);
      points.push({ year: y, balance, contributed: totalContrib, income });
    }
    return points;
  }, [initial, monthly, yieldPct, growthPct, years]);

  const final = results[results.length - 1];

  return (
    <div className="dv-card-grid" style={{ gridTemplateColumns: "1fr 1.5fr" }}>
      <div className="dv-stat-card" style={{ display: "grid", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>Inputs</h3>
        <NumField label="Initial investment ($)" value={initial} onChange={setInitial} />
        <NumField label="Monthly contribution ($)" value={monthly} onChange={setMonthly} />
        <NumField label="Dividend yield (%)" value={yieldPct} onChange={setYieldPct} step={0.1} />
        <NumField label="Annual price growth (%)" value={growthPct} onChange={setGrowthPct} step={0.1} />
        <NumField label="Years" value={years} onChange={setYears} />
      </div>
      <div className="dv-stat-card" style={{ display: "grid", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>Projection</h3>
        <div>
          <p className="dv-stat-card__label">Final portfolio value</p>
          <p className="dv-stat-card__value">${Math.round(final.balance).toLocaleString()}</p>
        </div>
        <div>
          <p className="dv-stat-card__label">Total contributed</p>
          <p className="dv-stat-card__value">${Math.round(final.contributed).toLocaleString()}</p>
        </div>
        <div>
          <p className="dv-stat-card__label">Annual dividend income (year {years})</p>
          <p className="dv-stat-card__value">${Math.round(final.income).toLocaleString()}</p>
        </div>
        <div className="dv-table-wrap" style={{ marginTop: "0.5rem" }}>
          <div className="dv-table-scroll" style={{ maxHeight: 300 }}>
            <table className="dv-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="dv-th--num">Balance</th>
                  <th className="dv-th--num">Contributed</th>
                  <th className="dv-th--num">Annual income</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr key={p.year}>
                    <td>{p.year}</td>
                    <td className="dv-td--num">${Math.round(p.balance).toLocaleString()}</td>
                    <td className="dv-td--num">${Math.round(p.contributed).toLocaleString()}</td>
                    <td className="dv-td--num">${Math.round(p.income).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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

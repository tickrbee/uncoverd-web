"use client";

import { useMemo, useState } from "react";

export function PayoutEstimator() {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState(100);
  const [annualDiv, setAnnualDiv] = useState(2.5);
  const [growthPct, setGrowthPct] = useState(5);
  const [years, setYears] = useState(10);

  const rows = useMemo(() => {
    const result: { year: number; dividendPerShare: number; totalIncome: number }[] = [];
    let dps = annualDiv;
    for (let y = 1; y <= years; y++) {
      const totalIncome = dps * shares;
      result.push({ year: y, dividendPerShare: dps, totalIncome });
      dps = dps * (1 + growthPct / 100);
    }
    return result;
  }, [annualDiv, shares, growthPct, years]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="dv-card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Field label="Ticker (optional)">
          <input
            type="text"
            value={ticker}
            placeholder="e.g. JNJ"
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="login-input"
          />
        </Field>
        <Field label="Shares owned">
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
            className="login-input"
          />
        </Field>
        <Field label="Current annual dividend / share">
          <input
            type="number"
            step="0.01"
            value={annualDiv}
            onChange={(e) => setAnnualDiv(parseFloat(e.target.value) || 0)}
            className="login-input"
          />
        </Field>
        <Field label="Expected dividend growth (%)">
          <input
            type="number"
            step="0.1"
            value={growthPct}
            onChange={(e) => setGrowthPct(parseFloat(e.target.value) || 0)}
            className="login-input"
          />
        </Field>
        <Field label="Years to project">
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value, 10) || 1)}
            className="login-input"
          />
        </Field>
      </div>

      <div className="dv-table-wrap">
        <div className="dv-table-scroll">
          <table className="dv-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="dv-th--num">Dividend / share</th>
                <th className="dv-th--num">Total annual income</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td className="dv-td--num">${r.dividendPerShare.toFixed(2)}</td>
                  <td className="dv-td--num">${r.totalIncome.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}

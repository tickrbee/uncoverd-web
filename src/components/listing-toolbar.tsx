"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { StockRow } from "@/lib/data";
import { useLocale } from "@/lib/use-locale";
import { chromeStrings } from "@/lib/ui-i18n";
import { tHeader } from "@/lib/page-header-i18n";

export type SecurityType = "stocks" | "etfs" | "active-etfs" | "funds";

// Chips: a single unified "ETFs" entry covers passive, active, and funds.
// Legacy `active-etfs` and `funds` SecurityType values still resolve correctly
// via URLs but are no longer offered as separate chips.
const SECURITY_TYPES: { key: SecurityType }[] = [
  { key: "stocks" },
  { key: "etfs" },
];

export function ListingToolbar({
  active = "stocks",
  rows,
  isPremium = false,
  csvFilename = "uncoverd-list.csv",
  links,
  hideSecurityType = false,
}: {
  active?: SecurityType;
  rows: StockRow[];
  isPremium?: boolean;
  csvFilename?: string;
  // Optional per-page overrides for any chip.
  links?: Partial<Record<SecurityType, string>>;
  // Hide the Stocks / ETFs / Active ETFs / Funds chips on curated pages
  // (Picks, Growers, Best X) where the security type doesn't apply.
  hideSecurityType?: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const chrome = chromeStrings(useLocale());
  const securityLabel = (key: SecurityType) =>
    key === "etfs" ? chrome.securityEtfs : chrome.securityStocks;

  // Default behavior: preserve full page context (path + all current query
  // params), just change the `type` query param so each chip keeps you on the
  // same page (sector / industry / picks / calendar / payout-changes) but
  // changes the security class.
  function defaultHrefFor(key: SecurityType): string {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (key === "stocks") next.delete("type");
    else next.set("type", key);
    // Page changed → reset pagination
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function hrefFor(key: SecurityType): string {
    return links?.[key] ?? defaultHrefFor(key);
  }

  function downloadCsv() {
    if (!isPremium) {
      window.location.href = "/pricing";
      return;
    }
    const header = [
      "symbol",
      "name",
      "sector",
      "industry",
      "currency",
      "price",
      "change_percent",
      "market_cap",
      "dividend_yield",
      "annual_dividend",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const cells = [
        r.symbol,
        (r.name ?? "").replace(/,/g, " "),
        (r.sector ?? "").replace(/,/g, " "),
        (r.industry ?? "").replace(/,/g, " "),
        r.currency ?? "",
        r.price ?? "",
        r.change_percent ?? "",
        r.market_cap ?? "",
        r.dividend_yield ?? "",
        r.annual_dividend ?? "",
      ];
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="dv-toolbar">
        {!hideSecurityType && (
          <>
            <div className="dv-toolbar__section">
              <span className="dv-toolbar__label">{chrome.filterBySecurityType}</span>
              <div className="dv-toolbar__chips">
                {SECURITY_TYPES.map((t) => (
                  <Link
                    key={t.key}
                    href={hrefFor(t.key)}
                    className={`dv-pill ${active === t.key ? "dv-pill--active" : ""}`}
                  >
                    {securityLabel(t.key)}
                  </Link>
                ))}
              </div>
            </div>
            <div className="dv-toolbar__divider" />
          </>
        )}

        {hideSecurityType && (
          <span className="dv-toolbar__label" style={{ marginRight: "auto" }}>
            &nbsp;
          </span>
        )}
        <button
          type="button"
          className="dv-icon-circle"
          aria-label="All filters"
          onClick={() => setFilterOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>

        <button
          type="button"
          className={`dv-icon-circle dv-icon-circle--filled ${isPremium ? "" : "dv-icon-circle--locked"}`}
          aria-label={isPremium ? "Download CSV" : "Download (Premium)"}
          title={isPremium ? "Download as CSV" : "Premium feature — upgrade to download"}
          onClick={downloadCsv}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>

      {filterOpen && <FilterPanel onClose={() => setFilterOpen(false)} />}
    </>
  );
}

type FilterState = {
  sector: string;
  minMarketCap: string;
  minYield: string;
  maxYield: string;
  minPayoutRatio: string;
  maxPayoutRatio: string;
  minPE: string;
  maxPE: string;
  minConsecutiveIncreases: string;
  min5yCAGR: string;
  minYtdReturn: string;
  min1yReturn: string;
  min5yReturn: string;
  maxFrom52wHigh: string;
  frequency: string;
};

const EMPTY: FilterState = {
  sector: "",
  minMarketCap: "",
  minYield: "",
  maxYield: "",
  minPayoutRatio: "",
  maxPayoutRatio: "",
  minPE: "",
  maxPE: "",
  minConsecutiveIncreases: "",
  min5yCAGR: "",
  minYtdReturn: "",
  min1yReturn: "",
  min5yReturn: "",
  maxFrom52wHigh: "",
  frequency: "",
};

function FilterPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const [s, setS] = useState<FilterState>(EMPTY);

  function update<K extends keyof FilterState>(k: K, v: FilterState[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function apply() {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) {
      if (v) params.set(k, v);
    }
    router.push(`/screener${params.toString() ? `?${params.toString()}` : ""}`);
    onClose();
  }

  return (
    <div className="dv-modal-backdrop" onClick={onClose}>
      <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dv-modal__header">
          <h2>{tHeader("All Filters", locale)}</h2>
          <button type="button" onClick={onClose} className="dv-modal__close" aria-label="Close">
            ×
          </button>
        </div>
        <div className="dv-modal__body">
          <Section title="Overview">
            <Field label="Min Yield (%)">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 4"
                value={s.minYield}
                onChange={(e) => update("minYield", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Max Yield (%)">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 12"
                value={s.maxYield}
                onChange={(e) => update("maxYield", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="AUM / Market Cap">
              <select
                value={s.minMarketCap}
                onChange={(e) => update("minMarketCap", e.target.value)}
                className="login-input"
              >
                <option value="">{tHeader("Any size", locale)}</option>
                <option value="100000000">$100M+</option>
                <option value="500000000">$500M+</option>
                <option value="1000000000">$1B+</option>
                <option value="10000000000">$10B+</option>
                <option value="50000000000">$50B+</option>
                <option value="200000000000">$200B+</option>
              </select>
            </Field>
            <Field label="Sector">
              <select value={s.sector} onChange={(e) => update("sector", e.target.value)} className="login-input">
                <option value="">{tHeader("All sectors", locale)}</option>
                <option value="financials">{tHeader("Financials", locale)}</option>
                <option value="real-estate">{tHeader("Real Estate", locale)}</option>
                <option value="communications">{tHeader("Communications", locale)}</option>
                <option value="consumer-discretionary">{tHeader("Consumer Discretionary", locale)}</option>
                <option value="consumer-staples">{tHeader("Consumer Staples", locale)}</option>
                <option value="energy">{tHeader("Energy", locale)}</option>
                <option value="health-care">{tHeader("Health Care", locale)}</option>
                <option value="industrials">{tHeader("Industrials", locale)}</option>
                <option value="technology">{tHeader("Technology", locale)}</option>
                <option value="materials">{tHeader("Materials", locale)}</option>
                <option value="utilities">{tHeader("Utilities", locale)}</option>
              </select>
            </Field>
            <Field label="Frequency">
              <select value={s.frequency} onChange={(e) => update("frequency", e.target.value)} className="login-input">
                <option value="">{tHeader("Any", locale)}</option>
                <option value="Monthly">{tHeader("Monthly", locale)}</option>
                <option value="Quarterly">{tHeader("Quarterly", locale)}</option>
                <option value="Semi-Annual">{tHeader("Semi-Annual", locale)}</option>
                <option value="Annual">{tHeader("Annual", locale)}</option>
              </select>
            </Field>
          </Section>

          <Section title="Dividend Growth">
            <Field label="Min Consecutive Increases (years)">
              <input
                type="number"
                step="1"
                placeholder="e.g. 10"
                value={s.minConsecutiveIncreases}
                onChange={(e) => update("minConsecutiveIncreases", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Min 5Y CAGR (%)">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 5"
                value={s.min5yCAGR}
                onChange={(e) => update("min5yCAGR", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Min Payout Ratio (%)">
              <input
                type="number"
                step="1"
                placeholder="e.g. 20"
                value={s.minPayoutRatio}
                onChange={(e) => update("minPayoutRatio", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Max Payout Ratio (%)">
              <input
                type="number"
                step="1"
                placeholder="e.g. 80"
                value={s.maxPayoutRatio}
                onChange={(e) => update("maxPayoutRatio", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Min P/E">
              <input
                type="number"
                step="0.1"
                value={s.minPE}
                onChange={(e) => update("minPE", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Max P/E">
              <input
                type="number"
                step="0.1"
                value={s.maxPE}
                onChange={(e) => update("maxPE", e.target.value)}
                className="login-input"
              />
            </Field>
          </Section>

          <Section title="Returns">
            <Field label="Min YTD Return (%)">
              <input
                type="number"
                step="0.1"
                value={s.minYtdReturn}
                onChange={(e) => update("minYtdReturn", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Min 1-Year Return (%)">
              <input
                type="number"
                step="0.1"
                value={s.min1yReturn}
                onChange={(e) => update("min1yReturn", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Min 5-Year Return (%)">
              <input
                type="number"
                step="0.1"
                value={s.min5yReturn}
                onChange={(e) => update("min5yReturn", e.target.value)}
                className="login-input"
              />
            </Field>
            <Field label="Max % from 52-Week High">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. -10"
                value={s.maxFrom52wHigh}
                onChange={(e) => update("maxFrom52wHigh", e.target.value)}
                className="login-input"
              />
            </Field>
          </Section>
        </div>
        <div className="dv-modal__footer">
          <button type="button" onClick={() => setS(EMPTY)} className="btn btn--ghost">
            {tHeader("Reset", locale)}
          </button>
          <button type="button" onClick={apply} className="btn">
            {tHeader("Apply filters", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const locale = useLocale();
  return (
    <div className="dv-modal__section" style={{ marginBottom: "1.25rem" }}>
      <h3>{tHeader(title, locale)}</h3>
      <div className="dv-modal__grid">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const locale = useLocale();
  return (
    <label style={{ display: "grid", gap: "0.4rem", fontSize: "0.82rem" }}>
      <span style={{ color: "var(--text-secondary)" }}>{tHeader(label, locale)}</span>
      {children}
    </label>
  );
}

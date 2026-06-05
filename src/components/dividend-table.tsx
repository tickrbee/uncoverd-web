"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WatchButton } from "@/components/watch-button";
import { usePremiumStatus } from "@/components/use-premium-status";
import { PremiumLock } from "@/components/premium-lock";
import { th } from "@/lib/table-i18n";
import { tabLabel } from "@/lib/ui-i18n";
import { useLocale } from "@/lib/use-locale";
import { formatCurrency, formatPercent, formatDate, tickerHref } from "@/lib/format";
import type { StockRow, StockRating, DividendEvent, StockExtras } from "@/lib/types";

export type ColumnView =
  | "overview"
  | "payout"
  | "growth"
  | "returns"
  | "ratings"
  | "income"
  | "income-risk"
  | "buy-reco"
  | "upside"
  | "etf-overview"
  | "etf-coverage"
  | "etf-holders"
  | "future-payers";

type SortKey =
  | "symbol"
  | "price"
  | "change_percent"
  | "market_cap"
  | "dividend_yield"
  | "annual_dividend"
  | "rating"
  | "sector"
  | "industry"
  | "ex_date"
  | "frequency"
  | "payment_date"
  | "consecutive_increases"
  | "div_cagr_1y"
  | "div_cagr_5y"
  | "growth_score"
  | "value_score"
  | "profit_score"
  | "momentum_score"
  | "health_score"
  | "composite_total"
  | "pe_ratio"
  | "net_debt_to_ebitda"
  | "payout_ratio"
  | "return_ytd"
  | "return_1y"
  | "return_3y"
  | "return_5y"
  | "return_10y"
  | "pct_off_52w_high"
  | "avg_recovery_days"
  // RowMeta-driven sort keys (etf-coverage, etf-holders views)
  | "rank"
  | "etf_count"
  | "total_market_value"
  | "weight_percentage"
  | "position_market_value"
  | "shares_held"
  // StockRow direct fields used by the new ETF views
  | "aum"
  | "expense_ratio"
  | "asset_class"
  | "etf_category"
  | "etf_company"
  // Future-payers view (potential dividend initiators)
  | "net_income"
  | "free_cash_flow"
  | "fcf_margin";

// Optional per-row meta available to cell renderers — currently used by the
// ETF-coverage view to render the ETF-count + position-value columns.
export type RowMeta = {
  rank?: number;
  // Top-held heatmap
  etf_count?: number;
  total_market_value?: number;
  max_etf_count?: number;
  // Per-ETF holder of a stock (used on /etfs/holders/[ticker])
  weight_percentage?: number;
  position_market_value?: number;
  shares_held?: number;
  // Future-payers view (used on /lists/potential-payers)
  net_income?: number;
  free_cash_flow?: number;
  fcf_margin?: number;
};

type Column = {
  header: string;
  className?: string;
  sortKey?: SortKey;
  cell: (
    row: StockRow,
    rating?: StockRating,
    isPremium?: boolean,
    div?: DividendEvent,
    extras?: StockExtras,
    meta?: RowMeta,
  ) => React.ReactNode;
};

// Wrap a numeric cell so free users see it blurred and clicking opens the
// upgrade popup. Used for the Returns view + Days-to-Recover etc.
function gatedNumber(node: React.ReactNode, isPremium: boolean | undefined): React.ReactNode {
  if (isPremium) return node;
  return (
    <PremiumLock isPremium={false} inline>
      {node}
    </PremiumLock>
  );
}

// Premium-only metric cell. Free users see a blurred placeholder so the table
// reads as "full but locked" instead of a sea of empty "—" (the underlying data
// is never sent to them — the placeholder is a fixed dummy). Premium users get
// the real value via render().
function premiumMetric(isPremium: boolean | undefined, render: () => React.ReactNode): React.ReactNode {
  if (isPremium) return render();
  return (
    <PremiumLock isPremium={false} inline>
      <span>00.00%</span>
    </PremiumLock>
  );
}

function priceCell(row: StockRow): React.ReactNode {
  const changeColor =
    row.change_percent == null ? "" : row.change_percent >= 0 ? "dv-change--pos" : "dv-change--neg";
  return (
    <>
      {formatCurrency(row.price, { currency: row.currency })}
      {row.change_percent != null && (
        <div className={`dv-ticker__meta ${changeColor}`}>
          {row.change_percent >= 0 ? "+" : ""}
          {row.change_percent.toFixed(2)}%
        </div>
      )}
    </>
  );
}

// A forward dividend is "Declared" when the company has announced its next
// ex-dividend date (in the future); otherwise the forward figure is our
// projection from dividend history, shown as "Estimated".
function dividendIsEstimated(row: StockRow): boolean {
  const d = row.next_ex_dividend_date;
  return !d || d < new Date().toISOString().slice(0, 10);
}

function EstimatedFlag({ row }: { row: StockRow }): React.ReactNode {
  if (row.annual_dividend == null) return <span className="dv-muted">—</span>;
  const est = dividendIsEstimated(row);
  return (
    <span className={`dv-est ${est ? "dv-est--yes" : "dv-est--no"}`}>
      {est ? "Estimated" : "Declared"}
    </span>
  );
}

function nameCell(row: StockRow): React.ReactNode {
  // Identity is locked per-LIST, not per-user: premium-only lists (Model
  // Portfolios, payout-changes) scrub the row server-side via redactRowsForFree
  // (symbol → "PRM-N", name → "Premium content"), and we detect that scrub here.
  // Free listing views (screener, high-yield, sectors, growers, monthly) send
  // real rows, so everyone sees the ticker + name. Ratings stay gated separately.
  const gated = row.symbol.startsWith("PRM-");
  if (gated) {
    return (
      <PremiumLock isPremium={false} inline>
        <span className="dv-ticker">
          <span className="dv-ticker__name">{row.symbol}</span>
          <span className="dv-ticker__meta">{row.name ?? "Company name"}</span>
        </span>
      </PremiumLock>
    );
  }
  const href = tickerHref(row.symbol, row.is_etf, row.is_fund);
  return (
    <Link href={href} className="dv-ticker">
      <span className="dv-ticker__name">{row.symbol}</span>
      <span className="dv-ticker__meta">{row.name ?? ""}</span>
    </Link>
  );
}

const COLUMN_VIEWS: Record<ColumnView, Column[]> = {
  // OVERVIEW matches dividend.com's overview tab:
  // Name | Price | Market Cap | Yield FWD | Ex-Div Date | Amount | Rating | Sector
  overview: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "Market Cap",
      className: "dv-th--num",
      sortKey: "market_cap",
      cell: (r) => formatCurrency(r.market_cap, { abbreviate: true, currency: r.currency }),
    },
    {
      header: "Yield (FWD)",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => formatPercent(r.dividend_yield),
    },
    {
      header: "Ex-Div Date",
      sortKey: "ex_date",
      cell: (_r, _rat, _p, div) => (div ? formatDate(div.date) : "—"),
    },
    {
      header: "Amount",
      className: "dv-th--num",
      sortKey: "annual_dividend",
      cell: (r, _rat, _p, div) =>
        div ? formatCurrency(div.dividend, { currency: r.currency }) : formatCurrency(r.annual_dividend, { currency: r.currency }),
    },
    {
      header: "Rating",
      className: "dv-th--num",
      sortKey: "rating",
      cell: (_r, rating, isPremium) => <RatingBadge rating={rating} isPremium={!!isPremium} />,
    },
    {
      header: "Fwd Dividend",
      className: "dv-th--num",
      sortKey: "annual_dividend",
      cell: (r) => formatCurrency(r.annual_dividend, { currency: r.currency }),
    },
    { header: "Estimated?", cell: (r) => <EstimatedFlag row={r} /> },
    { header: "Sector", sortKey: "sector", cell: (r) => r.sector ?? "—" },
  ],
  // PAYOUT — focused on income metrics: Price | Yield | Amount | Frequency | Ex-Div | Payment | Rating
  payout: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    { header: "Yield (FWD)", className: "dv-th--num", sortKey: "dividend_yield", cell: (r) => formatPercent(r.dividend_yield) },
    {
      header: "Amount",
      className: "dv-th--num",
      sortKey: "annual_dividend",
      cell: (r, _rat, _p, div) =>
        div ? formatCurrency(div.dividend, { currency: r.currency }) : formatCurrency(r.annual_dividend, { currency: r.currency }),
    },
    {
      header: "Frequency",
      sortKey: "frequency",
      cell: (_r, _rat, _p, div) => div?.frequency ?? "—",
    },
    {
      header: "Ex-Div",
      sortKey: "ex_date",
      cell: (_r, _rat, _p, div) => (div ? formatDate(div.date) : "—"),
    },
    {
      header: "Payment",
      sortKey: "payment_date",
      cell: (_r, _rat, _p, div) => (div?.payment_date ? formatDate(div.payment_date) : "—"),
    },
    {
      header: "Days to Recover",
      className: "dv-th--num",
      sortKey: "avg_recovery_days",
      cell: (r, _rat, ip) => {
        if (r.avg_recovery_days == null) return "—";
        const days = r.avg_recovery_days;
        const color =
          days <= 5
            ? "var(--positive)"
            : days <= 15
            ? "#34d399"
            : days <= 40
            ? "#fbbf24"
            : "var(--negative)";
        const node = <span style={{ color }}>{Math.round(days)} d</span>;
        return gatedNumber(node, ip);
      },
    },
    {
      header: "Rating",
      className: "dv-th--num",
      sortKey: "rating",
      cell: (_r, rating, isPremium) => <RatingBadge rating={rating} isPremium={!!isPremium} />,
    },
  ],
  // DIV GROWTH (matches dividend.com):
  // Name | Yield FWD DIV | Consec Increases | 1Y CAGR | 5Y CAGR | EPS G FY1 | P/E FY1 | Net Debt/EBITDA | Payout Ratio
  growth: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    {
      header: "Yield FWD Div",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => (
        <>
          {formatPercent(r.dividend_yield)}
          <div className="dv-ticker__meta">{formatCurrency(r.annual_dividend, { currency: r.currency })}</div>
        </>
      ),
    },
    {
      header: "Consec Increases",
      className: "dv-th--num",
      sortKey: "consecutive_increases",
      cell: (_r, _rating, ip, _div, ex) => premiumMetric(ip, () => (ex?.consecutiveIncreases != null ? `${ex.consecutiveIncreases} yrs` : "—")),
    },
    {
      header: "1Y Div CAGR",
      className: "dv-th--num",
      sortKey: "div_cagr_1y",
      cell: (_r, _rating, ip, _div, ex) => premiumMetric(ip, () => (ex?.divCagr1y != null ? formatPercent(Number(ex.divCagr1y)) : "—")),
    },
    {
      header: "5Y Div CAGR",
      className: "dv-th--num",
      sortKey: "div_cagr_5y",
      cell: (_r, _rating, ip, _div, ex) => premiumMetric(ip, () => (ex?.divCagr5y != null ? formatPercent(Number(ex.divCagr5y)) : "—")),
    },
    {
      header: "EPS Growth",
      className: "dv-th--num",
      sortKey: "growth_score",
      cell: (_r, rating, ip) =>
        premiumMetric(ip, () => (rating?.growth_score != null ? <ScoreCell score={rating.growth_score} isPremium /> : "—")),
    },
    {
      header: "P/E",
      className: "dv-th--num",
      sortKey: "pe_ratio",
      cell: (_r, _rating, ip, _div, ex) => premiumMetric(ip, () => (ex?.peRatio != null ? ex.peRatio.toFixed(2) : "—")),
    },
    {
      header: "Net Debt/EBITDA",
      className: "dv-th--num",
      sortKey: "net_debt_to_ebitda",
      cell: (_r, _rating, ip, _div, ex) => premiumMetric(ip, () => (ex?.netDebtToEbitda != null ? ex.netDebtToEbitda.toFixed(2) : "—")),
    },
    {
      header: "Payout Ratio",
      className: "dv-th--num",
      sortKey: "payout_ratio",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () => (ex?.payoutRatio != null ? formatPercent(ex.payoutRatio * 100) : "—")),
    },
  ],
  // RETURNS (matches dividend.com):
  // Name | Price/NAV | Yield | YTD | 1Y | 3Y CAGR | 5Y CAGR | 10Y CAGR | % Off 52w High
  returns: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "Yield FWD Div",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => formatPercent(r.dividend_yield),
    },
    {
      header: "YTD",
      className: "dv-th--num",
      sortKey: "return_ytd",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () =>
          ex?.returnYtd == null ? "—" : (
            <span className={ex.returnYtd >= 0 ? "dv-change--pos" : "dv-change--neg"}>
              {ex.returnYtd >= 0 ? "+" : ""}
              {ex.returnYtd.toFixed(2)}%
            </span>
          ),
        ),
    },
    {
      header: "1Y",
      className: "dv-th--num",
      sortKey: "return_1y",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () =>
          ex?.return1y == null ? "—" : (
            <span className={ex.return1y >= 0 ? "dv-change--pos" : "dv-change--neg"}>
              {ex.return1y >= 0 ? "+" : ""}
              {ex.return1y.toFixed(2)}%
            </span>
          ),
        ),
    },
    {
      header: "3Y CAGR",
      className: "dv-th--num",
      sortKey: "return_3y",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () => (ex?.return3y == null ? "—" : formatPercent(ex.return3y))),
    },
    {
      header: "5Y CAGR",
      className: "dv-th--num",
      sortKey: "return_5y",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () => (ex?.return5y == null ? "—" : formatPercent(ex.return5y))),
    },
    {
      header: "10Y CAGR",
      className: "dv-th--num",
      sortKey: "return_10y",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () => (ex?.return10y == null ? "—" : formatPercent(ex.return10y))),
    },
    {
      header: "% Off 52w High",
      className: "dv-th--num",
      sortKey: "pct_off_52w_high",
      cell: (_r, _rating, ip, _div, ex) =>
        premiumMetric(ip, () =>
          ex?.pctOff52wHigh == null ? "—" : (
            <span className={ex.pctOff52wHigh >= 0 ? "dv-change--pos" : "dv-change--neg"}>
              {ex.pctOff52wHigh.toFixed(2)}%
            </span>
          ),
        ),
    },
  ],
  // INCOME — matches dividend.com:
  // Name | 1Y CAGR | 5Y CAGR | Consec Increases | Yield FWD Div | Yield Attractiveness (Premium)
  income: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    {
      header: "1Y Div CAGR",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.divCagr1y != null ? formatPercent(Number(ex.divCagr1y)) : "—"),
    },
    {
      header: "5Y Div CAGR",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.divCagr5y != null ? formatPercent(Number(ex.divCagr5y)) : "—"),
    },
    {
      header: "Consec Increases",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.consecutiveIncreases != null ? `${ex.consecutiveIncreases} yrs` : "—"),
    },
    {
      header: "Yield FWD Div",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => (
        <>
          {formatPercent(r.dividend_yield)}
          <div className="dv-ticker__meta">{formatCurrency(r.annual_dividend, { currency: r.currency })}</div>
        </>
      ),
    },
    {
      header: "Yield Attractiveness",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.value_score != null ? <ScoreCell score={rating.value_score} isPremium={!!isPremium} /> : "—",
    },
  ],
  // INCOME RISK — matches dividend.com:
  // Name | Payout Ratio | EPS Growth | P/E | Reliability | Earnings Growth | Uptrend (3 ratings premium-blurred)
  "income-risk": [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    {
      header: "Payout Ratio",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) =>
        ex?.payoutRatio != null ? formatPercent(ex.payoutRatio * 100) : "—",
    },
    {
      header: "EPS Growth",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.growth_score != null ? <ScoreCell score={rating.growth_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "P/E",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.peRatio != null ? ex.peRatio.toFixed(2) : "—"),
    },
    {
      header: "Reliability",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.health_score != null ? <ScoreCell score={rating.health_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Earnings Growth",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.profit_score != null ? <ScoreCell score={rating.profit_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Uptrend",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.momentum_score != null ? <ScoreCell score={rating.momentum_score} isPremium={!!isPremium} /> : "—",
    },
  ],
  // BUY RECO — Composite verdict + key metrics
  "buy-reco": [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "Verdict",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) => <RatingBadge rating={rating} isPremium={!!isPremium} />,
    },
    {
      header: "Yield FWD Div",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => formatPercent(r.dividend_yield),
    },
    {
      header: "P/E",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.peRatio != null ? ex.peRatio.toFixed(2) : "—"),
    },
    {
      header: "Composite",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.composite_total != null ? (
          <ScoreCell score={rating.composite_total} isPremium={!!isPremium} />
        ) : (
          "—"
        ),
    },
    { header: "Sector", sortKey: "sector", cell: (r) => r.sector ?? "—" },
  ],
  // UPSIDE — % off 52w high + momentum + relative-strength proxy
  upside: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "% Off 52w High",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) =>
        ex?.pctOff52wHigh != null ? (
          <span className={ex.pctOff52wHigh >= 0 ? "dv-change--pos" : "dv-change--neg"}>
            {ex.pctOff52wHigh.toFixed(2)}%
          </span>
        ) : (
          "—"
        ),
    },
    {
      header: "1Y Return",
      className: "dv-th--num",
      cell: (_r, _rating, _ip, _div, ex) =>
        ex?.return1y != null ? (
          <span className={ex.return1y >= 0 ? "dv-change--pos" : "dv-change--neg"}>
            {ex.return1y >= 0 ? "+" : ""}
            {ex.return1y.toFixed(2)}%
          </span>
        ) : (
          "—"
        ),
    },
    {
      header: "Momentum",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.momentum_score != null ? <ScoreCell score={rating.momentum_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Composite",
      className: "dv-th--num",
      cell: (_r, rating, isPremium) =>
        rating?.composite_total != null ? (
          <ScoreCell score={rating.composite_total} isPremium={!!isPremium} />
        ) : (
          "—"
        ),
    },
  ],
  // ETF-OVERVIEW — distinct from stock overview because ETFs don't have
  // per-stock fundamentals (P/E, payout ratio) but have expense ratio, AUM,
  // holdings count and asset class.
  "etf-overview": [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "AUM",
      className: "dv-th--num",
      sortKey: "market_cap",
      cell: (r) =>
        r.aum != null
          ? formatCurrency(r.aum, { abbreviate: true, currency: r.currency })
          : formatCurrency(r.market_cap, { abbreviate: true, currency: r.currency }),
    },
    {
      header: "Yield (FWD)",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => formatPercent(r.dividend_yield),
    },
    {
      header: "Expense Ratio",
      className: "dv-th--num",
      sortKey: "pe_ratio",
      cell: (r) => (r.expense_ratio != null ? `${r.expense_ratio.toFixed(2)}%` : "—"),
    },
    {
      header: "Holdings",
      className: "dv-th--num",
      sortKey: "consecutive_increases",
      cell: (r) => (r.holdings_count != null ? r.holdings_count.toLocaleString() : "—"),
    },
    {
      header: "Asset Class",
      cell: (r) => r.asset_class ?? "—",
    },
    {
      header: "Issuer",
      cell: (r) => r.etf_company ?? "—",
    },
  ],
  // FUTURE-PAYERS — used by /lists/potential-payers. Each row is a profitable
  // non-dividend stock; meta carries the financials snapshot (net income,
  // free cash flow, FCF margin) used to rank them.
  "future-payers": [
    {
      header: "Rank",
      className: "dv-th--num",
      sortKey: "rank",
      cell: (_r, _rt, _p, _d, _e, meta) => (meta?.rank != null ? meta.rank : "—"),
    },
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Sector", sortKey: "sector", cell: (r) => r.sector ?? "—" },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "Market cap",
      className: "dv-th--num",
      sortKey: "market_cap",
      cell: (r) => formatCurrency(r.market_cap, { abbreviate: true, currency: r.currency }),
    },
    {
      header: "Net income (FY)",
      className: "dv-th--num",
      sortKey: "net_income",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.net_income != null ? formatCurrency(meta.net_income, { abbreviate: true }) : "—",
    },
    {
      header: "Free cash flow (FY)",
      className: "dv-th--num",
      sortKey: "free_cash_flow",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.free_cash_flow != null
          ? formatCurrency(meta.free_cash_flow, { abbreviate: true })
          : "—",
    },
    {
      header: "FCF margin",
      className: "dv-th--num",
      sortKey: "fcf_margin",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.fcf_margin != null ? `${meta.fcf_margin.toFixed(1)}%` : "—",
    },
  ],
  // ETF-HOLDERS — used by /etfs/holders/[ticker] as the default tab. Each row
  // is an ETF that holds the target stock; meta supplies the per-ETF position
  // info (weight in the ETF, position market value, shares held).
  "etf-holders": [
    {
      header: "Rank",
      className: "dv-th--num",
      sortKey: "rank",
      cell: (_r, _rt, _p, _d, _e, meta) => (meta?.rank != null ? meta.rank : "—"),
    },
    { header: "ETF", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    {
      header: "Weight in ETF",
      className: "dv-th--num",
      sortKey: "weight_percentage",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.weight_percentage != null ? `${meta.weight_percentage.toFixed(2)}%` : "—",
    },
    {
      header: "Position value",
      className: "dv-th--num",
      sortKey: "position_market_value",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.position_market_value != null
          ? formatCurrency(meta.position_market_value, { abbreviate: true })
          : "—",
    },
    {
      header: "Shares held",
      className: "dv-th--num",
      sortKey: "shares_held",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.shares_held != null ? meta.shares_held.toLocaleString() : "—",
    },
    {
      header: "ETF AUM",
      className: "dv-th--num",
      sortKey: "aum",
      cell: (r) => (r.aum != null ? formatCurrency(r.aum, { abbreviate: true }) : "—"),
    },
    {
      header: "Expense Ratio",
      className: "dv-th--num",
      sortKey: "expense_ratio",
      cell: (r) => (r.expense_ratio != null ? `${r.expense_ratio.toFixed(2)}%` : "—"),
    },
    { header: "Asset Class", sortKey: "asset_class", cell: (r) => r.asset_class ?? "—" },
  ],
  // ETF-COVERAGE — used by /etfs/top-held to show the basket-exposure data
  // (count of ETFs holding the stock, coverage bar, total position value)
  // alongside price + yield. Coverage meta comes from the page via RowMeta.
  "etf-coverage": [
    {
      header: "Rank",
      className: "dv-th--num",
      sortKey: "rank",
      cell: (_r, _rt, _p, _d, _e, meta) => (meta?.rank != null ? meta.rank : "—"),
    },
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    { header: "Price", className: "dv-th--num", sortKey: "price", cell: (r) => priceCell(r) },
    {
      header: "Yield (FWD)",
      className: "dv-th--num",
      sortKey: "dividend_yield",
      cell: (r) => formatPercent(r.dividend_yield),
    },
    {
      header: "ETFs holding it",
      className: "dv-th--num",
      sortKey: "etf_count",
      cell: (_r, _rt, _p, _d, _e, meta) =>
        meta?.etf_count != null ? meta.etf_count.toLocaleString() : "—",
    },
    {
      header: "Coverage",
      sortKey: "etf_count",
      cell: (_r, _rt, _p, _d, _e, meta) => {
        if (meta?.etf_count == null || !meta.max_etf_count) return "—";
        const pct = (meta.etf_count / meta.max_etf_count) * 100;
        return (
          <div
            style={{
              minWidth: 180,
              background: "rgba(255,255,255,0.05)",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #064e3b 0%, #34d399 100%)",
              }}
            />
          </div>
        );
      },
    },
    {
      header: "Position value",
      className: "dv-th--num",
      sortKey: "total_market_value",
      cell: (r, _rt, _p, _d, _e, meta) =>
        meta?.total_market_value != null
          ? formatCurrency(meta.total_market_value, { abbreviate: true, currency: r.currency })
          : "—",
    },
    {
      header: "Rating",
      className: "dv-th--num",
      sortKey: "rating",
      cell: (_r, rating, isPremium) => <RatingBadge rating={rating} isPremium={!!isPremium} />,
    },
  ],
  ratings: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r) },
    {
      header: "Overall",
      className: "dv-th--num",
      sortKey: "composite_total",
      cell: (_r, rating, isPremium) => <RatingBadge rating={rating} isPremium={!!isPremium} />,
    },
    {
      header: "Value",
      className: "dv-th--num",
      sortKey: "value_score",
      cell: (_r, rating, ip) =>
        premiumMetric(ip, () => (rating?.value_score != null ? <ScoreCell score={rating.value_score} isPremium /> : "—")),
    },
    {
      header: "Growth",
      className: "dv-th--num",
      sortKey: "growth_score",
      cell: (_r, rating, ip) =>
        premiumMetric(ip, () => (rating?.growth_score != null ? <ScoreCell score={rating.growth_score} isPremium /> : "—")),
    },
    {
      header: "Profit",
      className: "dv-th--num",
      sortKey: "profit_score",
      cell: (_r, rating, ip) =>
        premiumMetric(ip, () => (rating?.profit_score != null ? <ScoreCell score={rating.profit_score} isPremium /> : "—")),
    },
    {
      header: "Momentum",
      className: "dv-th--num",
      sortKey: "momentum_score",
      cell: (_r, rating, ip) =>
        premiumMetric(ip, () => (rating?.momentum_score != null ? <ScoreCell score={rating.momentum_score} isPremium /> : "—")),
    },
    {
      header: "Health",
      className: "dv-th--num",
      sortKey: "health_score",
      cell: (_r, rating, ip) =>
        premiumMetric(ip, () => (rating?.health_score != null ? <ScoreCell score={rating.health_score} isPremium /> : "—")),
    },
  ],
};

export type DividendTableOptions = {
  rows: StockRow[];
  ratings?: Map<string, StockRating>;
  upcomingDividends?: Map<string, DividendEvent>;
  extras?: Map<string, StockExtras>;
  // Optional per-row meta — currently used by the etf-coverage view to show
  // ETF count + coverage bar + total position value.
  meta?: Map<string, RowMeta>;
  isPremium?: boolean;
  view?: ColumnView;
  // When true, the page rendered the free/gated version (no server auth read,
  // so it's CDN-cacheable) and the table fetches the real premium data
  // client-side for paying users. When false/omitted (e.g. server-gated pages
  // like the model portfolios), the table uses the props as-is.
  revealPremium?: boolean;
  // Identity-gated lists (model portfolios, best-of) scrub their row identities
  // server-side, so they can't be un-scrubbed from symbols alone. They pass an
  // endpoint that re-runs the list server-side and returns the REAL rows (plus
  // ratings/extras/upcoming) for paying users. Requires revealPremium.
  revealRowsEndpoint?: string;
};

export function DividendTable({
  rows: rowsProp,
  ratings: ratingsProp,
  upcomingDividends: upcomingProp,
  extras: extrasProp,
  meta,
  isPremium: isPremiumProp,
  view = "overview",
  revealPremium = false,
  revealRowsEndpoint,
}: DividendTableOptions) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const locale = useLocale();

  // Premium reveal — paying users fetch ratings/extras/upcoming for the visible
  // rows and the table un-blurs. Free users + bots keep the cached free render.
  const [revealed, setRevealed] = useState<{
    rows?: StockRow[];
    ratings: Map<string, StockRating>;
    extras: Map<string, StockExtras>;
    upcoming: Map<string, DividendEvent>;
  } | null>(null);
  const symbolsKey = useMemo(() => rowsProp.map((r) => r.symbol).join(","), [rowsProp]);
  useEffect(() => {
    if (!revealPremium) return;
    // Two reveal modes:
    //  - rows endpoint: identity-gated lists (model portfolios / best-of) whose
    //    row identities are scrubbed server-side; the endpoint returns the REAL
    //    rows (+ ratings/extras/upcoming) for paying users.
    //  - symbols endpoint: normal lists where identities are already free and
    //    only the ratings/extras columns need revealing for the visible rows.
    let url: string | null;
    if (revealRowsEndpoint) {
      url = revealRowsEndpoint;
    } else {
      const syms = rowsProp.map((r) => r.symbol).filter((s) => s && !s.startsWith("PRM-"));
      url = syms.length ? `/api/lists/premium?symbols=${encodeURIComponent(syms.join(","))}` : null;
    }
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.isPremium) return;
        setRevealed({
          rows: Array.isArray(d.rows) ? (d.rows as StockRow[]) : undefined,
          ratings: new Map(Object.entries(d.ratings ?? {})) as Map<string, StockRating>,
          extras: new Map(Object.entries(d.extras ?? {})) as Map<string, StockExtras>,
          upcoming: new Map(Object.entries(d.upcoming ?? {})) as Map<string, DividendEvent>,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealPremium, revealRowsEndpoint, symbolsKey]);

  // Effective values: revealed premium data when present, else the (gated) props.
  const rows = revealed?.rows ?? rowsProp;
  const ratings = revealed?.ratings ?? ratingsProp;
  const extras = revealed?.extras ?? extrasProp;
  const upcomingDividends = revealed?.upcoming ?? upcomingProp;
  const isPremium = revealed != null ? true : isPremiumProp;

  // A returning paying user is known-premium before paint (localStorage hint),
  // but the row/rating data is still being fetched. Mark that window so the
  // gated cells render as a quiet loading dim instead of the "locked" blur +
  // unlock hint — otherwise premium users see a false paywall flash that then
  // pops to data. Free users (knownPremium=false) keep the upsell blur.
  const { isPremium: knownPremium } = usePremiumStatus();
  const premiumLoading = revealPremium && knownPremium && revealed === null;

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const key = sort.key;
      const getVal = (r: StockRow): number | string => {
        const rating = ratings?.get(r.symbol);
        const div = upcomingDividends?.get(r.symbol);
        const ex = extras?.get(r.symbol);
        const m = meta?.get(r.symbol);
        switch (key) {
          // String fields
          case "symbol":
            return r.symbol;
          case "sector":
            return r.sector ?? "";
          case "industry":
            return r.industry ?? "";
          case "frequency":
            return div?.frequency ?? "";
          case "ex_date":
            return div?.date ?? "";
          case "payment_date":
            return div?.payment_date ?? "";
          // Rating-derived numeric fields
          case "rating":
          case "composite_total":
            return rating?.composite_total ?? -Infinity;
          case "value_score":
            return rating?.value_score ?? -Infinity;
          case "growth_score":
            return rating?.growth_score ?? -Infinity;
          case "profit_score":
            return rating?.profit_score ?? -Infinity;
          case "momentum_score":
            return rating?.momentum_score ?? -Infinity;
          case "health_score":
            return rating?.health_score ?? -Infinity;
          // Extras-derived numeric fields
          case "consecutive_increases":
            return ex?.consecutiveIncreases ?? -Infinity;
          case "div_cagr_1y":
            return ex?.divCagr1y != null ? Number(ex.divCagr1y) : -Infinity;
          case "div_cagr_5y":
            return ex?.divCagr5y != null ? Number(ex.divCagr5y) : -Infinity;
          case "pe_ratio":
            return ex?.peRatio ?? -Infinity;
          case "net_debt_to_ebitda":
            return ex?.netDebtToEbitda ?? -Infinity;
          case "payout_ratio":
            return ex?.payoutRatio ?? -Infinity;
          case "return_ytd":
            return ex?.returnYtd ?? -Infinity;
          case "return_1y":
            return ex?.return1y ?? -Infinity;
          case "return_3y":
            return ex?.return3y ?? -Infinity;
          case "return_5y":
            return ex?.return5y ?? -Infinity;
          case "return_10y":
            return ex?.return10y ?? -Infinity;
          case "pct_off_52w_high":
            return ex?.pctOff52wHigh ?? -Infinity;
          case "avg_recovery_days":
            // For days-to-recover lower is better, but we keep the comparator
            // standard (ascending = lower first) and let the user toggle dir.
            return r.avg_recovery_days ?? Infinity;
          // RowMeta-driven (etf-coverage + etf-holders views)
          case "rank":
            return m?.rank ?? Infinity;
          case "etf_count":
            return m?.etf_count ?? -Infinity;
          case "total_market_value":
            return m?.total_market_value ?? -Infinity;
          case "weight_percentage":
            return m?.weight_percentage ?? -Infinity;
          case "position_market_value":
            return m?.position_market_value ?? -Infinity;
          case "shares_held":
            return m?.shares_held ?? -Infinity;
          // StockRow optional ETF-specific fields
          case "aum":
            return r.aum ?? -Infinity;
          case "expense_ratio":
            return r.expense_ratio ?? -Infinity;
          case "asset_class":
            return r.asset_class ?? "";
          case "etf_category":
            return r.etf_category ?? "";
          case "etf_company":
            return r.etf_company ?? "";
          // Future-payers (RowMeta-driven)
          case "net_income":
            return m?.net_income ?? -Infinity;
          case "free_cash_flow":
            return m?.free_cash_flow ?? -Infinity;
          case "fcf_margin":
            return m?.fcf_margin ?? -Infinity;
          // StockRow primitive fields (price, change_percent, market_cap, etc.)
          default: {
            const v = (r as unknown as Record<string, number | null | undefined>)[key];
            return v == null ? -Infinity : v;
          }
        }
      };
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      if (av === bv) return 0;
      return av < bv ? -1 * dir : 1 * dir;
    });
  }, [rows, sort, ratings, upcomingDividends, extras, meta]);

  if (!rows || rows.length === 0) {
    return <div className="dv-empty">No matching stocks found.</div>;
  }

  const cols = COLUMN_VIEWS[view];
  const asOf = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

  function onHeaderClick(key: SortKey | undefined) {
    if (!key) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null; // third click resets
    });
  }

  return (
    <div className={`dv-table-wrap${premiumLoading ? " dv-premium-loading" : ""}`}>
      <div className="dv-table-scroll">
        <table className="dv-table">
          <thead>
            <tr>
              {cols.map((c, idx) => {
                const isSorted = sort && c.sortKey === sort.key;
                const arrow = !c.sortKey ? "" : isSorted ? (sort!.dir === "desc" ? " ↓" : " ↑") : " ⇅";
                return (
                  <th
                    key={c.header}
                    className={c.className}
                    onClick={() => onHeaderClick(c.sortKey)}
                    style={c.sortKey ? { cursor: "pointer", userSelect: "none" } : undefined}
                    aria-sort={isSorted ? (sort!.dir === "desc" ? "descending" : "ascending") : undefined}
                  >
                    {th(c.header, locale)}
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7em" }}>{arrow}</span>
                    {idx === 0 && (
                      <div
                        style={{
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          textTransform: "none",
                          letterSpacing: 0,
                          fontSize: "0.7rem",
                          marginTop: "0.15rem",
                        }}
                      >
                        {th("As of", locale)} {asOf}
                      </div>
                    )}
                  </th>
                );
              })}
              <th>{th("Watch", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const rating = ratings?.get(row.symbol);
              const div = upcomingDividends?.get(row.symbol);
              const ex = extras?.get(row.symbol);
              const m = meta?.get(row.symbol);
              return (
                <tr key={row.symbol}>
                  {cols.map((c) => (
                    <td key={c.header} className={c.className?.replace("dv-th--num", "dv-td--num")}>
                      {c.cell(row, rating, isPremium ?? undefined, div, ex, m)}
                    </td>
                  ))}
                  <td>
                    <WatchButton symbol={row.symbol} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type DividendCalRow = {
  symbol: string;
  name?: string | null;
  exDate: string;
  paymentDate?: string;
  declarationDate?: string;
  recordDate?: string;
  dividend: number;
  frequency?: string;
};

export function CalendarTable({
  rows,
  dateLabel = "Ex-Date",
  showFrequency = true,
}: {
  rows: DividendCalRow[];
  dateLabel?: string;
  showFrequency?: boolean;
}) {
  const locale = useLocale();
  if (!rows || rows.length === 0) {
    return <div className="dv-empty">—</div>;
  }

  return (
    <div className="dv-table-wrap">
      <div className="dv-table-scroll">
        <table className="dv-table">
          <thead>
            <tr>
              <th>{th("Name", locale)}</th>
              <th>{th("Declaration", locale)}</th>
              <th>{th(dateLabel, locale)}</th>
              <th>{th("Payment Date", locale)}</th>
              {showFrequency && <th>{th("Frequency", locale)}</th>}
              <th className="dv-th--num">{th("Dividend", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.symbol}-${row.exDate}-${idx}`}>
                <td>
                  <Link href={tickerHref(row.symbol)} className="dv-ticker">
                    <span className="dv-ticker__name">{row.symbol}</span>
                    {row.name && <span className="dv-ticker__meta">{row.name}</span>}
                  </Link>
                </td>
                <td>{formatDate(row.declarationDate)}</td>
                <td>{formatDate(row.exDate)}</td>
                <td>{formatDate(row.paymentDate)}</td>
                {showFrequency && <td>{row.frequency ?? "—"}</td>}
                <td className="dv-td--num">{formatCurrency(row.dividend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Composite_total scale = 7-20 (sum of 5 component scores each 1-5).
// Grades: A- (19-20), B+ (17-18), B (14-16), C+ (12-13), C (10-11), D (8-9), F (7).
function colorForCompositeTotal(score: number): string {
  if (score >= 17) return "var(--positive)";
  if (score >= 14) return "#34d399";
  if (score >= 12) return "#fbbf24";
  return "var(--negative)";
}

// Per-component scores are 1-5.
function colorForScore5(score: number): string {
  if (score >= 4) return "var(--positive)";
  if (score >= 3) return "#fbbf24";
  return "var(--negative)";
}

function RatingBadge({ rating, isPremium }: { rating?: StockRating; isPremium: boolean }) {
  // Free users show a BLURRED *decoy* grade (not an empty "—") so the column reads
  // as locked-content, with a hover unlock. IMPORTANT: never render the real grade
  // here even if a `rating` is passed — a free page may pass server-side ratings,
  // and the real value would otherwise sit in the DOM under a removable CSS blur.
  if (!isPremium) {
    return (
      <PremiumLock isPremium={false} inline>
        <span style={{ color: "var(--positive)", fontWeight: 700 }}>B+</span>
      </PremiumLock>
    );
  }
  if (!rating || rating.composite_total == null) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }
  const color = colorForCompositeTotal(rating.composite_total);
  return (
    <span style={{ color, fontWeight: 700 }}>
      {rating.composite_grade ?? rating.composite_total.toFixed(0)}
    </span>
  );
}

function ScoreCell({ score, isPremium }: { score: number; isPremium: boolean }) {
  if (!isPremium) {
    // Decoy, never the real per-pillar score (see RatingBadge note).
    return (
      <PremiumLock isPremium={false} inline>
        <span style={{ color: "var(--positive)" }}>4/5</span>
      </PremiumLock>
    );
  }
  const color = colorForScore5(score);
  return <span style={{ color, fontWeight: 600 }}>{score.toFixed(0)}/5</span>;
}

// Two preset tab sets:
//  - "screener"   → Overview / Payout / Div Growth / Returns / Ratings
//  - "calendar"   → Overview / Payout / Income / Income Risk / Returns
//                   (used on payout-changes & ex-div/declaration calendars)
const TAB_PRESETS: Record<"screener" | "calendar" | "etf" | "etf-coverage" | "etf-holders" | "future-payers", { key: ColumnView; label: string }[]> = {
  screener: [
    { key: "overview", label: "Overview" },
    { key: "payout", label: "Payout" },
    { key: "growth", label: "Div Growth" },
    { key: "returns", label: "Returns" },
    { key: "ratings", label: "Ratings" },
  ],
  calendar: [
    { key: "overview", label: "Overview" },
    { key: "payout", label: "Payout" },
    { key: "income", label: "Income" },
    { key: "income-risk", label: "Income Risk" },
    { key: "returns", label: "Returns" },
  ],
  etf: [
    { key: "etf-overview", label: "Overview" },
    { key: "payout", label: "Distributions" },
    { key: "returns", label: "Returns" },
  ],
  // /etfs/top-held: starts with the heatmap columns (rank + ETF count +
  // coverage bar + position value), then standard dividend-stock views.
  "etf-coverage": [
    { key: "etf-coverage", label: "Heatmap" },
    { key: "payout", label: "Payout" },
    { key: "growth", label: "Div Growth" },
    { key: "returns", label: "Returns" },
    { key: "ratings", label: "Ratings" },
  ],
  // /etfs/holders/[ticker]: shows per-ETF holding info first (weight, position
  // value, shares), then standard ETF columns so users can compare the holding
  // funds by AUM, expense ratio, returns, etc.
  "etf-holders": [
    { key: "etf-holders", label: "Holders" },
    { key: "etf-overview", label: "ETF Overview" },
    { key: "payout", label: "Distributions" },
    { key: "returns", label: "Returns" },
  ],
  // /lists/potential-payers: financial-ready columns first, then returns and
  // ratings. Overview / Payout / Div Growth omitted on purpose — these
  // companies don't pay yet so those columns would all be em-dashes.
  "future-payers": [
    { key: "future-payers", label: "Future Income" },
    { key: "returns", label: "Returns" },
    { key: "ratings", label: "Ratings" },
  ],
};

export function ColumnTabs({
  active,
  baseHref,
  preset = "screener",
}: {
  active: ColumnView;
  baseHref: string;
  preset?: "screener" | "calendar" | "etf" | "etf-coverage" | "etf-holders" | "future-payers";
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const locale = useLocale();
  const tabs = TAB_PRESETS[preset];

  // Preserve all current URL params (country, type, sector, sort, etc.) so
  // switching views never resets the user's other selections. Resets page=1.
  function hrefFor(key: ColumnView): string {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (key === "overview") next.delete("view");
    else next.set("view", key);
    next.delete("page");
    const qs = next.toString();
    const base = baseHref || pathname;
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <div className="dv-tabs">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={hrefFor(t.key)}
          className={`dv-tab ${active === t.key ? "dv-tab--active" : ""}`}
        >
          {tabLabel(t.label, locale)}
        </Link>
      ))}
    </div>
  );
}

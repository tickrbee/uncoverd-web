"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WatchButton } from "@/components/watch-button";
import { PremiumLock } from "@/components/premium-lock";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
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
  | "etf-overview";

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
  | "avg_recovery_days";

type Column = {
  header: string;
  className?: string;
  sortKey?: SortKey;
  cell: (
    row: StockRow,
    rating?: StockRating,
    isPremium?: boolean,
    div?: DividendEvent,
    extras?: StockExtras
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

function nameCell(row: StockRow, isPremium?: boolean): React.ReactNode {
  const href = row.is_etf || row.is_fund ? `/etfs/symbol/${row.symbol}` : `/stocks/${row.symbol}`;
  // Free users: both the ticker symbol AND the company name are blurred.
  // Clicking either opens the upgrade prompt. The cell is fully gated so the
  // listing is browse-able but every identifier is paywalled.
  if (!isPremium) {
    return (
      <PremiumLock isPremium={false} inline>
        <span className="dv-ticker">
          <span className="dv-ticker__name">{row.symbol}</span>
          <span className="dv-ticker__meta">{row.name ?? "Company name"}</span>
        </span>
      </PremiumLock>
    );
  }
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
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
    { header: "Sector", sortKey: "sector", cell: (r) => r.sector ?? "—" },
  ],
  // PAYOUT — focused on income metrics: Price | Yield | Amount | Frequency | Ex-Div | Payment | Rating
  payout: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
      cell: (_r, _rating, _ip, _div, ex) => (ex?.consecutiveIncreases != null ? `${ex.consecutiveIncreases} yrs` : "—"),
    },
    {
      header: "1Y Div CAGR",
      className: "dv-th--num",
      sortKey: "div_cagr_1y",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.divCagr1y != null ? formatPercent(Number(ex.divCagr1y)) : "—"),
    },
    {
      header: "5Y Div CAGR",
      className: "dv-th--num",
      sortKey: "div_cagr_5y",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.divCagr5y != null ? formatPercent(Number(ex.divCagr5y)) : "—"),
    },
    {
      header: "EPS Growth",
      className: "dv-th--num",
      sortKey: "growth_score",
      cell: (_r, rating, isPremium) =>
        rating?.growth_score != null ? <ScoreCell score={rating.growth_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "P/E",
      className: "dv-th--num",
      sortKey: "pe_ratio",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.peRatio != null ? ex.peRatio.toFixed(2) : "—"),
    },
    {
      header: "Net Debt/EBITDA",
      className: "dv-th--num",
      sortKey: "net_debt_to_ebitda",
      cell: (_r, _rating, _ip, _div, ex) => (ex?.netDebtToEbitda != null ? ex.netDebtToEbitda.toFixed(2) : "—"),
    },
    {
      header: "Payout Ratio",
      className: "dv-th--num",
      sortKey: "payout_ratio",
      cell: (_r, _rating, _ip, _div, ex) =>
        ex?.payoutRatio != null ? formatPercent(ex.payoutRatio * 100) : "—",
    },
  ],
  // RETURNS (matches dividend.com):
  // Name | Price/NAV | Yield | YTD | 1Y | 3Y CAGR | 5Y CAGR | 10Y CAGR | % Off 52w High
  returns: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
        ex?.returnYtd == null ? (
          "—"
        ) : (
          gatedNumber(
            <span className={ex.returnYtd >= 0 ? "dv-change--pos" : "dv-change--neg"}>
              {ex.returnYtd >= 0 ? "+" : ""}
              {ex.returnYtd.toFixed(2)}%
            </span>,
            ip,
          )
        ),
    },
    {
      header: "1Y",
      className: "dv-th--num",
      sortKey: "return_1y",
      cell: (_r, _rating, ip, _div, ex) =>
        ex?.return1y == null ? (
          "—"
        ) : (
          gatedNumber(
            <span className={ex.return1y >= 0 ? "dv-change--pos" : "dv-change--neg"}>
              {ex.return1y >= 0 ? "+" : ""}
              {ex.return1y.toFixed(2)}%
            </span>,
            ip,
          )
        ),
    },
    {
      header: "3Y CAGR",
      className: "dv-th--num",
      sortKey: "return_3y",
      cell: (_r, _rating, ip, _div, ex) =>
        ex?.return3y == null ? "—" : gatedNumber(formatPercent(ex.return3y), ip),
    },
    {
      header: "5Y CAGR",
      className: "dv-th--num",
      sortKey: "return_5y",
      cell: (_r, _rating, ip, _div, ex) =>
        ex?.return5y == null ? "—" : gatedNumber(formatPercent(ex.return5y), ip),
    },
    {
      header: "10Y CAGR",
      className: "dv-th--num",
      sortKey: "return_10y",
      cell: (_r, _rating, ip, _div, ex) =>
        ex?.return10y == null ? "—" : gatedNumber(formatPercent(ex.return10y), ip),
    },
    {
      header: "% Off 52w High",
      className: "dv-th--num",
      sortKey: "pct_off_52w_high",
      cell: (_r, _rating, ip, _div, ex) =>
        ex?.pctOff52wHigh == null ? (
          "—"
        ) : (
          gatedNumber(
            <span className={ex.pctOff52wHigh >= 0 ? "dv-change--pos" : "dv-change--neg"}>
              {ex.pctOff52wHigh.toFixed(2)}%
            </span>,
            ip,
          )
        ),
    },
  ],
  // INCOME — matches dividend.com:
  // Name | 1Y CAGR | 5Y CAGR | Consec Increases | Yield FWD Div | Yield Attractiveness (Premium)
  income: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
      cell: (r) => (r.expense_ratio != null ? `${(r.expense_ratio * 100).toFixed(2)}%` : "—"),
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
  ratings: [
    { header: "Name", sortKey: "symbol", cell: (r, _rt, p) => nameCell(r, p) },
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
      cell: (_r, rating, isPremium) =>
        rating?.value_score != null ? <ScoreCell score={rating.value_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Growth",
      className: "dv-th--num",
      sortKey: "growth_score",
      cell: (_r, rating, isPremium) =>
        rating?.growth_score != null ? <ScoreCell score={rating.growth_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Profit",
      className: "dv-th--num",
      sortKey: "profit_score",
      cell: (_r, rating, isPremium) =>
        rating?.profit_score != null ? <ScoreCell score={rating.profit_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Momentum",
      className: "dv-th--num",
      sortKey: "momentum_score",
      cell: (_r, rating, isPremium) =>
        rating?.momentum_score != null ? <ScoreCell score={rating.momentum_score} isPremium={!!isPremium} /> : "—",
    },
    {
      header: "Health",
      className: "dv-th--num",
      sortKey: "health_score",
      cell: (_r, rating, isPremium) =>
        rating?.health_score != null ? <ScoreCell score={rating.health_score} isPremium={!!isPremium} /> : "—",
    },
  ],
};

export type DividendTableOptions = {
  rows: StockRow[];
  ratings?: Map<string, StockRating>;
  upcomingDividends?: Map<string, DividendEvent>;
  extras?: Map<string, StockExtras>;
  isPremium?: boolean;
  view?: ColumnView;
};

export function DividendTable({
  rows,
  ratings,
  upcomingDividends,
  extras,
  isPremium,
  view = "overview",
}: DividendTableOptions) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const key = sort.key;
      const getVal = (r: StockRow): number | string => {
        const rating = ratings?.get(r.symbol);
        const div = upcomingDividends?.get(r.symbol);
        const ex = extras?.get(r.symbol);
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
  }, [rows, sort, ratings, upcomingDividends, extras]);

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
    <div className="dv-table-wrap">
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
                    {c.header}
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
                        As of {asOf}
                      </div>
                    )}
                  </th>
                );
              })}
              <th>Watch</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const rating = ratings?.get(row.symbol);
              const div = upcomingDividends?.get(row.symbol);
              const ex = extras?.get(row.symbol);
              return (
                <tr key={row.symbol}>
                  {cols.map((c) => (
                    <td key={c.header} className={c.className?.replace("dv-th--num", "dv-td--num")}>
                      {c.cell(row, rating, isPremium ?? undefined, div, ex)}
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
  if (!rows || rows.length === 0) {
    return <div className="dv-empty">No upcoming events in this range.</div>;
  }

  return (
    <div className="dv-table-wrap">
      <div className="dv-table-scroll">
        <table className="dv-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Declaration</th>
              <th>{dateLabel}</th>
              <th>Payment Date</th>
              {showFrequency && <th>Frequency</th>}
              <th className="dv-th--num">Dividend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.symbol}-${row.exDate}-${idx}`}>
                <td>
                  <Link href={`/stocks/${row.symbol}`} className="dv-ticker">
                    <span className="dv-ticker__name">{row.symbol}</span>
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
  if (!rating || rating.composite_total == null) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }
  if (!isPremium) {
    return (
      <PremiumLock isPremium={false} inline>
        <span style={{ color: "var(--positive)", fontWeight: 700 }}>
          {rating.composite_grade ?? "A+"}
        </span>
      </PremiumLock>
    );
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
    return (
      <PremiumLock isPremium={false} inline>
        <span style={{ color: "var(--positive)" }}>{score.toFixed(0)}/5</span>
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
const TAB_PRESETS: Record<"screener" | "calendar" | "etf", { key: ColumnView; label: string }[]> = {
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
};

export function ColumnTabs({
  active,
  baseHref,
  preset = "screener",
}: {
  active: ColumnView;
  baseHref: string;
  preset?: "screener" | "calendar" | "etf";
}) {
  const pathname = usePathname();
  const params = useSearchParams();
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
          {t.label}
        </Link>
      ))}
    </div>
  );
}

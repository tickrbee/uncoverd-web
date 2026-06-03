import Link from "next/link";
import { formatDate, formatCurrency, formatPercent, tickerHref } from "@/lib/format";
import { th } from "@/lib/table-i18n";
import type { PayoutChangeEvent } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

// Presentational payout-change table, shared by the server-rendered free kinds
// and the client-revealed premium kinds (GatedPayoutEvents). No hooks, so it
// renders fine in either context.
export function PayoutEventsTable({
  events,
  showPrevious,
  showPctChange,
  locale,
  noEventsLabel,
}: {
  events: PayoutChangeEvent[];
  showPrevious: boolean;
  showPctChange: boolean;
  locale: Locale;
  noEventsLabel: string;
}) {
  return (
    <div className="dv-table-wrap">
      <div className="dv-table-scroll">
        <table className="dv-table">
          <thead>
            <tr>
              <th>{th("Name", locale)}</th>
              <th>{th("Declaration", locale)}</th>
              <th>{th("Ex-Date", locale)}</th>
              <th>{th("Payment Date", locale)}</th>
              <th>{th("Frequency", locale)}</th>
              <th className="dv-th--num">{th("Dividend", locale)}</th>
              {showPrevious && <th className="dv-th--num">{th("Previous", locale)}</th>}
              {showPctChange && <th className="dv-th--num">{th("Change", locale)}</th>}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6 + (showPrevious ? 1 : 0) + (showPctChange ? 1 : 0)}>{noEventsLabel}</td>
              </tr>
            ) : (
              events.map((d, i) => (
                <tr key={`${d.symbol}-${d.date}-${i}`}>
                  <td>
                    <Link href={tickerHref(d.symbol)} className="dv-ticker">
                      <span className="dv-ticker__name">{d.symbol}</span>
                      <span className="dv-ticker__meta">{d.name ?? ""}</span>
                    </Link>
                  </td>
                  <td>{formatDate(d.declaration_date)}</td>
                  <td>{formatDate(d.date)}</td>
                  <td>{formatDate(d.payment_date)}</td>
                  <td>{d.frequency ?? "—"}</td>
                  <td className="dv-td--num">{formatCurrency(d.dividend)}</td>
                  {showPrevious && (
                    <td className="dv-td--num">
                      {d.previousDividend != null ? formatCurrency(d.previousDividend) : "—"}
                    </td>
                  )}
                  {showPctChange && (
                    <td className="dv-td--num">
                      {d.pctChange != null ? (
                        <span className={d.pctChange >= 0 ? "dv-change--pos" : "dv-change--neg"}>
                          {d.pctChange >= 0 ? "+" : ""}
                          {formatPercent(d.pctChange)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

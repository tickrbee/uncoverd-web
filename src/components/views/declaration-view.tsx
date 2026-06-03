"use client";

import Link from "next/link";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import { Pager } from "@/components/pager";
import { formatDate, formatCurrency, tickerHref } from "@/lib/format";
import type { PayoutChangeEvent } from "@/lib/data";
import { useLocale } from "@/lib/use-locale";
import { th } from "@/lib/table-i18n";
import { DECLARATION_RANGE_LABELS, declarationHeader, declarationSummary, declarationEmpty } from "@/lib/ui-i18n";

export type DeclarationItem = {
  symbol: string;
  name: string | null;
  frequency: string | null;
  declaration_date: string | null;
  date: string | null;
  payment_date: string | null;
  dividend: number;
};

type RangeKey = "week" | "month" | "quarter";

// Client-rendered so the whole declaration calendar (header, range chips,
// table headers, empty/summary) follows the cookie language. The server page
// just fetches and passes serializable data.
export function DeclarationView({
  items,
  csvEvents,
  page,
  totalPages,
  total,
  rangeKey,
}: {
  items: DeclarationItem[];
  csvEvents: PayoutChangeEvent[];
  page: number;
  totalPages: number;
  total: number;
  rangeKey: RangeKey;
}) {
  const locale = useLocale();
  const ranges = DECLARATION_RANGE_LABELS[locale];
  const header = declarationHeader(locale, ranges[rangeKey]);
  const base = "/calendar/declaration";

  return (
    <main className="dv-page">
      <header className="dv-page-header">
        <p className="dv-eyebrow">{header.eyebrow}</p>
        <h1>{header.title}</h1>
        <p>{header.description}</p>
      </header>

      <div className="dv-filters">
        {(["week", "month", "quarter"] as RangeKey[]).map((k) => (
          <Link key={k} href={`${base}?range=${k}`} className={`dv-chip ${rangeKey === k ? "dv-chip--active" : ""}`}>
            {ranges[k]}
          </Link>
        ))}
      </div>

      <PayoutChangesToolbar events={csvEvents} csvFilename="uncoverd-declarations.csv" hideSecurityType />

      {items.length === 0 ? (
        <div className="dv-empty">{declarationEmpty(locale)}</div>
      ) : (
        <div className="dv-table-wrap">
          <div className="dv-table-scroll">
            <table className="dv-table">
              <thead>
                <tr>
                  <th>{th("Name", locale)}</th>
                  <th>{th("Frequency", locale)}</th>
                  <th>{th("Declared", locale)}</th>
                  <th>{th("Ex-Div Date", locale)}</th>
                  <th>{th("Pay Date", locale)}</th>
                  <th className="dv-th--num">{th("Amount", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d, i) => (
                  <tr key={`${d.symbol}-${d.date}-${i}`}>
                    <td>
                      <Link href={tickerHref(d.symbol)} className="dv-ticker">
                        <span className="dv-ticker__name">{d.symbol}</span>
                        <span className="dv-ticker__meta">{d.name ?? ""}</span>
                      </Link>
                    </td>
                    <td>{d.frequency ?? "—"}</td>
                    <td style={{ background: "rgba(52,211,153,0.08)" }}>{formatDate(d.declaration_date)}</td>
                    <td>{formatDate(d.date)}</td>
                    <td>{formatDate(d.payment_date)}</td>
                    <td className="dv-td--num">{formatCurrency(d.dividend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {declarationSummary(locale, total, page, totalPages)}
      </p>
      <Pager page={page} totalPages={totalPages} baseHref={`${base}?range=${rangeKey}`} />
    </main>
  );
}

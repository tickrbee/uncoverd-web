import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import { Pager } from "@/components/pager";
import {
  dividendCalendar,
  isoToday,
  isoDaysFromNow,
  formatDate,
  formatCurrency,
  recoveryDaysBySymbols,
  type DividendEvent,
  type PayoutChangeEvent,
} from "@/lib/data";
import { getBackendClient } from "@/lib/supabase/admin";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Ex-Dividend Calendar",
  description: "Upcoming ex-dividend dates so you can capture every dividend payout.",
};

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const RANGES = {
  week: { label: "This Week", days: 7 },
  month: { label: "This Month", days: 30 },
  year: { label: "This Year", days: 365 },
} as const;

type RangeKey = keyof typeof RANGES;

// Lookup company names + prior-payment dividend (for the "Amount Change" column)
async function enrich(events: DividendEvent[]) {
  if (events.length === 0) return { names: new Map(), priors: new Map() };
  const symbols = Array.from(new Set(events.map((e) => e.symbol)));
  const sb = getBackendClient();
  const [{ data: tickers }, { data: priors }] = await Promise.all([
    sb.from("tickers").select("symbol,name").in("symbol", symbols),
    sb
      .from("dividends")
      .select("symbol,date,dividend,frequency")
      .in("symbol", symbols)
      .lt("date", isoToday())
      .order("date", { ascending: false })
      .limit(symbols.length * 4),
  ]);
  const names = new Map<string, string>();
  for (const r of (tickers as { symbol: string; name: string | null }[]) ?? []) {
    if (r.name) names.set(r.symbol, r.name);
  }
  const priorMap = new Map<string, number>();
  const freqMap = new Map<string, string>();
  for (const r of (priors as { symbol: string; date: string; dividend: number; frequency: string | null }[]) ?? []) {
    if (!priorMap.has(r.symbol)) {
      priorMap.set(r.symbol, Number(r.dividend));
      if (r.frequency) freqMap.set(r.symbol, r.frequency);
    }
  }
  return { names, priors: priorMap, freqs: freqMap };
}

const PAGE_SIZE = 100;

export default async function ExDividendCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey: RangeKey = sp.range && sp.range in RANGES ? (sp.range as RangeKey) : "week";
  const days = RANGES[rangeKey].days;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  let allItems: DividendEvent[] = [];
  try {
    // Cap at 5000 to avoid timeouts even on This Year. Pagination shows 100 at a time.
    allItems = await dividendCalendar(isoToday(), isoDaysFromNow(days), 5000);
  } catch (e) {
    console.error(e);
  }
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const items = allItems.slice(startIdx, startIdx + PAGE_SIZE);
  const { names, priors, freqs } = (await enrich(items)) as {
    names: Map<string, string>;
    priors: Map<string, number>;
    freqs: Map<string, string>;
  };
  const premium = await getPremiumStatus();
  const recoveryMap = await recoveryDaysBySymbols(items.map((d) => d.symbol));

  const csvEvents: PayoutChangeEvent[] = items.map((d) => ({
    symbol: d.symbol,
    name: names.get(d.symbol) ?? null,
    date: d.date,
    payment_date: d.payment_date,
    declaration_date: d.declaration_date,
    dividend: d.dividend,
    previousDividend: priors.get(d.symbol) ?? null,
    pctChange: priors.has(d.symbol) && priors.get(d.symbol)! > 0
      ? ((d.dividend - priors.get(d.symbol)!) / priors.get(d.symbol)!) * 100
      : null,
    frequency: d.frequency ?? freqs.get(d.symbol) ?? null,
  }));

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Calendar"
          title={`Ex-Dividend Dates — ${RANGES[rangeKey].label}`}
          description="In order to capture or receive a dividend, investors must own the stock on or before the ex-dividend date."
        />

        <div className="dv-filters">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/calendar/ex-dividend?range=${k}`}
              className={`dv-chip ${rangeKey === k ? "dv-chip--active" : ""}`}
            >
              {RANGES[k].label}
            </Link>
          ))}
        </div>

        <PayoutChangesToolbar events={csvEvents} isPremium={premium.isPremium} csvFilename="uncoverd-ex-dividend.csv" />

        <p style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {total.toLocaleString()} events · Page {page} of {totalPages}
        </p>

        {items.length === 0 ? (
          <div className="dv-empty">No ex-dividend events in this range.</div>
        ) : (
          <div className="dv-table-wrap">
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Frequency</th>
                    <th>Declared</th>
                    <th>Ex-Div Date</th>
                    <th>Pay Date</th>
                    <th className="dv-th--num">Amount</th>
                    <th className="dv-th--num">Days to Recover</th>
                    <th className="dv-th--num">Previous</th>
                    <th className="dv-th--num">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d, i) => {
                    const prev = priors.get(d.symbol) ?? null;
                    const pctChange =
                      prev != null && prev > 0 ? ((d.dividend - prev) / prev) * 100 : null;
                    const recovery = recoveryMap.get(d.symbol) ?? null;
                    return (
                      <tr key={`${d.symbol}-${d.date}-${i}`}>
                        <td>
                          <Link href={`/stocks/${d.symbol}`} className="dv-ticker">
                            <span className="dv-ticker__name">{d.symbol}</span>
                            <span className="dv-ticker__meta">{names.get(d.symbol) ?? ""}</span>
                          </Link>
                        </td>
                        <td>{d.frequency ?? freqs.get(d.symbol) ?? "—"}</td>
                        <td>{formatDate(d.declaration_date)}</td>
                        <td style={{ background: "rgba(52,211,153,0.08)" }}>{formatDate(d.date)}</td>
                        <td>{formatDate(d.payment_date)}</td>
                        <td className="dv-td--num">{formatCurrency(d.dividend)}</td>
                        <td className="dv-td--num">
                          {recovery != null ? (
                            <span
                              style={{
                                color:
                                  recovery <= 5
                                    ? "var(--positive)"
                                    : recovery <= 15
                                    ? "#34d399"
                                    : recovery <= 40
                                    ? "#fbbf24"
                                    : "var(--negative)",
                              }}
                            >
                              {recovery} days
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td className="dv-td--num">{prev != null ? formatCurrency(prev) : "—"}</td>
                        <td className="dv-td--num">
                          {pctChange != null ? (
                            <span className={pctChange >= 0 ? "dv-change--pos" : "dv-change--neg"}>
                              {pctChange >= 0 ? "+" : ""}
                              {pctChange.toFixed(2)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pager
          page={page}
          totalPages={totalPages}
          baseHref={`/calendar/ex-dividend?range=${rangeKey}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

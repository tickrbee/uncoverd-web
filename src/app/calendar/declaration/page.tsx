import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import { Pager } from "@/components/pager";
import {
  declarationCalendar,
  isoDaysFromNow,
  isoToday,
  formatDate,
  formatCurrency,
  type DividendEvent,
  type PayoutChangeEvent,
} from "@/lib/data";
import { getBackendClient } from "@/lib/supabase/admin";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Declaration Date Calendar",
  description: "Track recent dividend declarations and get ready for upcoming payouts.",
};

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const RANGES = {
  week: { label: "Last Week", daysBack: 7 },
  month: { label: "Last Month", daysBack: 30 },
  quarter: { label: "Last Three Months", daysBack: 90 },
} as const;

type RangeKey = keyof typeof RANGES;

async function enrichWithNames(events: DividendEvent[]) {
  if (events.length === 0) return new Map<string, string>();
  const symbols = Array.from(new Set(events.map((e) => e.symbol)));
  const sb = getBackendClient();
  const { data } = await sb.from("tickers").select("symbol,name").in("symbol", symbols);
  const map = new Map<string, string>();
  for (const r of (data as { symbol: string; name: string | null }[]) ?? []) {
    if (r.name) map.set(r.symbol, r.name);
  }
  return map;
}

const PAGE_SIZE = 100;

export default async function DeclarationCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey: RangeKey = sp.range && sp.range in RANGES ? (sp.range as RangeKey) : "month";
  const daysBack = RANGES[rangeKey].daysBack;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  let allItems: DividendEvent[] = [];
  try {
    allItems = await declarationCalendar(isoDaysFromNow(-daysBack), isoToday(), 5000);
  } catch (e) {
    console.error(e);
  }
  allItems = allItems.filter((d) => d.declaration_date);
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const items = allItems.slice(startIdx, startIdx + PAGE_SIZE);
  const names = await enrichWithNames(items);
  const premium = await getPremiumStatus();

  const csvEvents: PayoutChangeEvent[] = items.map((d) => ({
    symbol: d.symbol,
    name: names.get(d.symbol) ?? null,
    date: d.date,
    payment_date: d.payment_date,
    declaration_date: d.declaration_date,
    dividend: d.dividend,
    previousDividend: null,
    pctChange: null,
    frequency: d.frequency ?? null,
  }));

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Calendar"
          title={`Declaration Dates — ${RANGES[rangeKey].label}`}
          description="Track recent dividend declarations and get ready for upcoming payouts."
        />

        <div className="dv-filters">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/calendar/declaration?range=${k}`}
              className={`dv-chip ${rangeKey === k ? "dv-chip--active" : ""}`}
            >
              {RANGES[k].label}
            </Link>
          ))}
        </div>

        <PayoutChangesToolbar events={csvEvents} isPremium={premium.isPremium} csvFilename="uncoverd-declarations.csv" />

        {items.length === 0 ? (
          <div className="dv-empty">No declarations in this range.</div>
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
                  </tr>
                </thead>
                <tbody>
                  {items.map((d, i) => (
                    <tr key={`${d.symbol}-${d.date}-${i}`}>
                      <td>
                        <Link href={`/stocks/${d.symbol}`} className="dv-ticker">
                          <span className="dv-ticker__name">{d.symbol}</span>
                          <span className="dv-ticker__meta">{names.get(d.symbol) ?? ""}</span>
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
          {total.toLocaleString()} declarations · Page {page} of {totalPages}
        </p>
        <Pager
          page={page}
          totalPages={totalPages}
          baseHref={`/calendar/declaration?range=${rangeKey}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DeclarationView, type DeclarationItem } from "@/components/views/declaration-view";
import {
  declarationCalendar,
  isoDaysFromNow,
  isoToday,
  type DividendEvent,
  type PayoutChangeEvent,
} from "@/lib/data";
import { getBackendClient } from "@/lib/supabase/admin";
import { getPremiumStatus } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Declaration Date Calendar",
  description:
    "Track recent dividend declarations across thousands of stocks and ETFs, with amounts and ex-dates, so you're ready for upcoming payouts. Updated daily on uncoverd.",
  alternates: { canonical: "/calendar/declaration" },
};

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 } as const;
type RangeKey = keyof typeof RANGES;
const PAGE_SIZE = 30;

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

export default async function DeclarationCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey: RangeKey = sp.range && sp.range in RANGES ? (sp.range as RangeKey) : "month";
  const daysBack = RANGES[rangeKey];
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

  const rows: DeclarationItem[] = items.map((d) => ({
    symbol: d.symbol,
    name: names.get(d.symbol) ?? null,
    frequency: d.frequency ?? null,
    declaration_date: d.declaration_date,
    date: d.date,
    payment_date: d.payment_date,
    dividend: d.dividend,
  }));

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
      <DeclarationView
        items={rows}
        csvEvents={csvEvents}
        isPremium={premium.isPremium}
        page={page}
        totalPages={totalPages}
        total={total}
        rangeKey={rangeKey}
      />
      <SiteFooter />
    </>
  );
}

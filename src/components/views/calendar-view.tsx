import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import { Pager } from "@/components/pager";
import {
  isoToday,
  isoDaysFromNow,
  formatDate,
  formatCurrency,
  recoveryDaysBySymbols,
  type DividendEvent,
  type PayoutChangeEvent,
} from "@/lib/data";
import { cachedDividendCalendar as dividendCalendar } from "@/lib/cached-data";
import { tickerHref } from "@/lib/format";
import { getBackendClient } from "@/lib/supabase/admin";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { th } from "@/lib/table-i18n";
import { calendarHeader, CALENDAR_RANGE_LABELS, calendarSummary, calendarEmpty } from "@/lib/ui-i18n";

const PAGE_SIZE = 30;
const RANGE_DAYS = { week: 7, month: 30, year: 365 } as const;
type RangeKey = keyof typeof RANGE_DAYS;

const CALENDAR_PATH: Record<Locale, string> = {
  en: "/calendar/ex-dividend",
  fr: "/fr/calendrier-dividendes",
  de: "/de/dividendenkalender",
  it: "/it/calendario-dividendi",
  es: "/es/proximos-dividendos",
};

export type CalendarSearch = { range?: string; page?: string };

async function enrich(events: DividendEvent[]) {
  if (events.length === 0) return { names: new Map(), priors: new Map(), freqs: new Map() };
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

// Shared, locale-aware ex-dividend calendar — identical to the English
// /calendar/ex-dividend page, only translated.
export async function CalendarView({ locale, sp }: { locale: Locale; sp: CalendarSearch }) {
  const basePath = CALENDAR_PATH[locale];
  const ranges = CALENDAR_RANGE_LABELS[locale];
  const rangeKey: RangeKey = sp.range && sp.range in RANGE_DAYS ? (sp.range as RangeKey) : "week";
  const days = RANGE_DAYS[rangeKey];
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const header = calendarHeader(locale, ranges[rangeKey]);

  let allItems: DividendEvent[] = [];
  try {
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
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />

        <div className="dv-filters">
          {(Object.keys(RANGE_DAYS) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`${basePath}?range=${k}`}
              className={`dv-chip ${rangeKey === k ? "dv-chip--active" : ""}`}
            >
              {ranges[k]}
            </Link>
          ))}
        </div>

        <PayoutChangesToolbar events={csvEvents} csvFilename="uncoverd-ex-dividend.csv" />

        <p style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {calendarSummary(locale, total, page, totalPages)}
        </p>

        {items.length === 0 ? (
          <div className="dv-empty">{calendarEmpty(locale)}</div>
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
                    <th className="dv-th--num">{th("Days to Recover", locale)}</th>
                    <th className="dv-th--num">{th("Previous", locale)}</th>
                    <th className="dv-th--num">{th("Change", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d, i) => {
                    const prev = priors.get(d.symbol) ?? null;
                    const pctChange = prev != null && prev > 0 ? ((d.dividend - prev) / prev) * 100 : null;
                    const recovery = recoveryMap.get(d.symbol) ?? null;
                    return (
                      <tr key={`${d.symbol}-${d.date}-${i}`}>
                        <td>
                          <Link href={tickerHref(d.symbol)} className="dv-ticker">
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
                                  recovery <= 5 ? "var(--positive)" : recovery <= 15 ? "#34d399" : recovery <= 40 ? "#fbbf24" : "var(--negative)",
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

        <Pager page={page} totalPages={totalPages} baseHref={`${basePath}?range=${rangeKey}`} />
      </main>
      <SiteFooter />
    </>
  );
}

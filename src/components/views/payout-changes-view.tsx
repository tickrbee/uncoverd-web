import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { PremiumGate } from "@/components/premium-gate";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import {
  formatDate,
  formatCurrency,
  formatPercent,
  type PayoutChangeKind,
} from "@/lib/data";
import { cachedPayoutChanges as payoutChanges } from "@/lib/cached-data";
import { getPremiumStatus } from "@/lib/premium";
import { PAYOUTS } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { th } from "@/lib/table-i18n";
import { payoutHeader, payoutChrome } from "@/lib/ui-i18n";

// Which kinds are gated behind Premium (mirrors the English page).
const PAYOUT_PREMIUM: Record<PayoutChangeKind, boolean> = {
  increasing: true, decreasing: true, initiating: true, suspending: false, special: true,
};

export async function PayoutChangesView({
  locale,
  slug, // canonical English kind (e.g. "increasing")
}: {
  locale: Locale;
  slug: string;
}) {
  const taxo = PAYOUTS.find((p) => p.key === slug);
  if (!taxo) notFound();
  const kind = slug as PayoutChangeKind;
  const label = locale === "en" ? taxo.label.en : taxo.label[locale];
  const header = payoutHeader(locale, kind, label);
  const chrome = payoutChrome(locale);
  const isPremiumKind = PAYOUT_PREMIUM[kind];

  const events = await payoutChanges(kind, 200);
  const premium = await getPremiumStatus();

  const showPctChange = kind === "increasing" || kind === "decreasing";
  const showPrevious = showPctChange || kind === "suspending";

  const content = (
    <>
      <PayoutChangesToolbar
        events={events}
        isPremium={premium.isPremium}
        csvFilename={`uncoverd-${slug}.csv`}
      />
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
                  <td colSpan={6 + (showPrevious ? 1 : 0) + (showPctChange ? 1 : 0)}>
                    {chrome.noEvents}
                  </td>
                </tr>
              ) : (
                events.map((d, i) => (
                  <tr key={`${d.symbol}-${d.date}-${i}`}>
                    <td>
                      <Link href={`/stocks/${d.symbol}`} className="dv-ticker">
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
    </>
  );

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
        {isPremiumKind ? (
          <PremiumGate title={`${label}${chrome.premiumTitleSuffix}`} description={chrome.premiumDesc}>
            {content}
          </PremiumGate>
        ) : (
          content
        )}
      </main>
      <SiteFooter />
    </>
  );
}

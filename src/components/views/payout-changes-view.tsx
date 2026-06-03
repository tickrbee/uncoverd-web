import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import { PayoutEventsTable } from "@/components/payout-events-table";
import { GatedPayoutEvents } from "@/components/gated-payout-events";
import { type PayoutChangeKind, type PayoutChangeEvent } from "@/lib/data";
import { cachedPayoutChanges as payoutChanges } from "@/lib/cached-data";
import { PAYOUTS } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
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

  const showPctChange = kind === "increasing" || kind === "decreasing";
  const showPrevious = showPctChange || kind === "suspending";

  // Premium kinds: no server fetch and no auth read — the events stay off the
  // wire and the client gate reveals them for paying users (so the page is
  // CDN-cacheable). Free kind (suspending) renders server-side.
  const events: PayoutChangeEvent[] = isPremiumKind ? [] : await payoutChanges(kind, 200);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
        {isPremiumKind ? (
          <GatedPayoutEvents
            kind={kind}
            label={label}
            slug={slug}
            showPrevious={showPrevious}
            showPctChange={showPctChange}
          />
        ) : (
          <>
            <PayoutChangesToolbar events={events} csvFilename={`uncoverd-${slug}.csv`} />
            <PayoutEventsTable
              events={events}
              showPrevious={showPrevious}
              showPctChange={showPctChange}
              locale={locale}
              noEventsLabel={chrome.noEvents}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

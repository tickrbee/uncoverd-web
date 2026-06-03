"use client";

import { useEffect, useState } from "react";
import { usePremiumStatus } from "@/components/use-premium-status";
import { useLocale } from "@/lib/use-locale";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import { PayoutEventsTable } from "@/components/payout-events-table";
import { PremiumPrompt } from "@/components/premium-lock";
import type { PayoutChangeEvent } from "@/lib/data";
import { payoutChrome } from "@/lib/ui-i18n";

// Client-side gate for the premium payout-change feeds. Free users (and bots)
// see only the upgrade prompt — the events never reach the wire. Paying users
// fetch the events from the reveal endpoint and the table fills in. This keeps
// the feed Premium-only WITHOUT a server auth read (so the page is cacheable).
export function GatedPayoutEvents({
  kind,
  label,
  slug,
  showPrevious,
  showPctChange,
}: {
  kind: string;
  label: string;
  slug: string;
  showPrevious: boolean;
  showPctChange: boolean;
}) {
  const { isPremium, loading } = usePremiumStatus();
  const locale = useLocale();
  const chrome = payoutChrome(locale);
  const [events, setEvents] = useState<PayoutChangeEvent[] | null>(null);

  useEffect(() => {
    if (!isPremium) return;
    let alive = true;
    fetch(`/api/payout-changes/premium?kind=${encodeURIComponent(kind)}&limit=200`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.isPremium && Array.isArray(d.events)) setEvents(d.events as PayoutChangeEvent[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isPremium, kind]);

  if (loading) {
    return <div className="dv-empty">Loading…</div>;
  }
  if (!isPremium) {
    return <PremiumPrompt title={`${label}${chrome.premiumTitleSuffix}`} description={chrome.premiumDesc} />;
  }
  return (
    <>
      <PayoutChangesToolbar events={events ?? []} csvFilename={`uncoverd-${slug}.csv`} />
      <PayoutEventsTable
        events={events ?? []}
        showPrevious={showPrevious}
        showPctChange={showPctChange}
        locale={locale}
        noEventsLabel={events === null ? "Loading…" : chrome.noEvents}
      />
    </>
  );
}

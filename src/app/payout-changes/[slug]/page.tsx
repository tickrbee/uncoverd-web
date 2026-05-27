import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PremiumGate } from "@/components/premium-gate";
import { PayoutChangesToolbar } from "@/components/payout-changes-toolbar";
import {
  payoutChanges,
  formatDate,
  formatCurrency,
  formatPercent,
  type PayoutChangeKind,
} from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const revalidate = 1800;

const PAYOUT_CHANGES: Record<PayoutChangeKind, { label: string; description: string; premium: boolean }> = {
  increasing: {
    label: "Increasing Dividend",
    description: "Companies whose latest dividend was higher than their previous payment.",
    premium: true,
  },
  decreasing: {
    label: "Decreasing Dividend",
    description: "Companies whose latest dividend was lower than their previous payment.",
    premium: true,
  },
  initiating: {
    label: "Initiating Dividend",
    description: "Companies that have just started paying a dividend for the first time.",
    premium: true,
  },
  suspending: {
    label: "Suspending Dividend",
    description: "Companies that have skipped an expected dividend payment or paid $0.",
    premium: false,
  },
  special: {
    label: "Special Dividend",
    description: "Companies paying one-time special dividends in addition to regular payouts.",
    premium: true,
  },
};

export async function generateStaticParams() {
  return Object.keys(PAYOUT_CHANGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = PAYOUT_CHANGES[slug as PayoutChangeKind];
  if (!item) return { title: "Payout Changes" };
  return { title: item.label, description: item.description };
}

export default async function PayoutChangePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kind = slug as PayoutChangeKind;
  const item = PAYOUT_CHANGES[kind];
  if (!item) notFound();

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
                <th>Name</th>
                <th>Declaration</th>
                <th>Ex-Date</th>
                <th>Payment Date</th>
                <th>Frequency</th>
                <th className="dv-th--num">Dividend</th>
                {showPrevious && <th className="dv-th--num">Previous</th>}
                {showPctChange && <th className="dv-th--num">Change</th>}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6 + (showPrevious ? 1 : 0) + (showPctChange ? 1 : 0)}>
                    No matching events found.
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
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="Payout Changes" title={item.label} description={item.description} />
        {item.premium ? (
          <PremiumGate
            title={`${item.label} — Premium`}
            description="Detailed payout change tracking is part of the Premium dividend research suite."
          >
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

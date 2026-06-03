"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PayoutChangeEvent } from "@/lib/types";
import { usePremiumStatus } from "@/components/use-premium-status";

const SECURITY_TYPES = [
  { key: "stocks", label: "Stocks" },
  { key: "etfs", label: "ETFs" },
];

export function PayoutChangesToolbar({
  events,
  isPremium = false,
  csvFilename = "uncoverd-payout-changes.csv",
  hideSecurityType = false,
}: {
  events: PayoutChangeEvent[];
  isPremium?: boolean;
  csvFilename?: string;
  hideSecurityType?: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  // Detect premium client-side so pages that render this toolbar don't have to
  // read the auth cookie on the server (which would block CDN caching). OR'd
  // with any server-passed prop so existing premium pages still work.
  const { isPremium: clientPremium } = usePremiumStatus();
  const canDownload = isPremium || clientPremium;

  // Preserve current path + params, only swap ?type=
  function hrefForType(key: string): string {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (key === "stocks") next.delete("type");
    else next.set("type", key);
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }
  const activeType = params?.get("type") ?? "stocks";

  function downloadCsv() {
    if (!canDownload) {
      window.location.href = "/pricing";
      return;
    }
    const lines = [
      "symbol,name,declaration,ex_date,payment_date,frequency,dividend,previous,pct_change",
    ];
    for (const e of events) {
      lines.push(
        [
          e.symbol,
          (e.name ?? "").replace(/,/g, " "),
          e.declaration_date ?? "",
          e.date,
          e.payment_date ?? "",
          e.frequency ?? "",
          e.dividend,
          e.previousDividend ?? "",
          e.pctChange?.toFixed(2) ?? "",
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dv-toolbar">
      {!hideSecurityType && (
        <>
          <div className="dv-toolbar__section">
            <span className="dv-toolbar__label">Filter by Security Type</span>
            <div className="dv-toolbar__chips">
              {SECURITY_TYPES.map((t) => (
                <Link
                  key={t.key}
                  href={hrefForType(t.key)}
                  className={`dv-pill ${activeType === t.key ? "dv-pill--active" : ""}`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="dv-toolbar__divider" />
        </>
      )}
      <button
        type="button"
        className="dv-icon-circle"
        aria-label="All filters"
        onClick={() => setFilterOpen(!filterOpen)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>
      <button
        type="button"
        className={`dv-icon-circle dv-icon-circle--filled ${canDownload ? "" : "dv-icon-circle--locked"}`}
        aria-label={canDownload ? "Download CSV" : "Download (Premium)"}
        onClick={downloadCsv}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      </button>
    </div>
  );
}

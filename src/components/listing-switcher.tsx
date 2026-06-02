"use client";

// TradingView-style listing switcher. The same company trades under many ticker
// variations across exchanges/currencies; this dropdown makes that explicit —
// the user understands it's one company and can jump between listings (the price
// chart + currency change per listing, fundamentals are the same company).
// Rendered only when a company has more than one listing.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type SwitcherListing = {
  symbol: string;
  exchange: string | null;
  currency: string | null;
};

export function ListingSwitcher({
  listings,
  current,
}: {
  listings: SwitcherListing[];
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (listings.length < 2) return null;

  const cur = listings.find((l) => l.symbol === current);
  const label = cur
    ? `${cur.symbol}${cur.exchange ? ` · ${cur.exchange}` : ""}${cur.currency ? ` · ${cur.currency}` : ""}`
    : current;

  return (
    <div className="listing-switcher" ref={ref}>
      <button
        type="button"
        className="listing-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="listing-switcher__menu" role="listbox">
          <div className="listing-switcher__head">
            <span>Symbol</span>
            <span>Exchange</span>
            <span>Currency</span>
          </div>
          {listings.map((l) => (
            <button
              key={l.symbol}
              type="button"
              role="option"
              aria-selected={l.symbol === current}
              className={`listing-switcher__row${l.symbol === current ? " is-active" : ""}`}
              onClick={() => {
                setOpen(false);
                if (l.symbol !== current) router.push(`/stocks/${l.symbol}`);
              }}
            >
              <span className="listing-switcher__sym">{l.symbol}</span>
              <span className="listing-switcher__exch">{l.exchange ?? "OTC"}</span>
              <span className="listing-switcher__cur">{l.currency ?? "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

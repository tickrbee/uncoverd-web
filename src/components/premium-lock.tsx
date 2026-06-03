"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Premium-gated content. Non-premium users see the children blurred and
 * unselectable; clicking opens a small upgrade prompt overlay (NOT a redirect).
 * Premium users see the children as-is.
 */
export function PremiumLock({
  isPremium,
  children,
  blurClassName = "dv-lock--blur",
  inline = false,
  noBlur = false,
}: {
  isPremium?: boolean;
  children: React.ReactNode;
  blurClassName?: string;
  inline?: boolean;
  // When true, the children are NOT blurred — used to gate buttons/links
  // whose visibility is fine but where the action should still trigger the
  // upgrade prompt instead of navigating.
  noBlur?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (isPremium) return <>{children}</>;

  const Tag = inline ? "span" : "div";

  return (
    <>
      <Tag
        className="dv-lock"
        onClick={(e) => {
          // Stop the click from bubbling to wrapping links/buttons.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        // Prevent text selection of blurred content (no-op when not blurred).
        onMouseDown={noBlur ? undefined : (e) => e.preventDefault()}
        onCopy={noBlur ? undefined : (e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label="Premium content — click to unlock"
      >
        {/* Blur lives on an inner element so the hover unlock hint stays crisp. */}
        <span className={noBlur ? undefined : blurClassName}>{children}</span>
        {!noBlur && (
          <span className="dv-lock__hint" aria-hidden="true">🔓</span>
        )}
      </Tag>
      {open && <UpgradePrompt onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Bigger variant: a centered Premium teaser card for full-content gates
 * (Ratings panel, See-all financials, Capture Strategy). Differs from
 * PremiumLock in that the surrounding layout is preserved (no blurred copy).
 */
export function PremiumPrompt({
  title,
  description,
  ctaHref = "/pricing",
}: {
  title: string;
  description: string;
  ctaHref?: string;
}) {
  return (
    <div className="dv-premium-gate">
      <span className="dv-premium-badge">Premium</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="dv-premium-gate__actions">
        <Link href={ctaHref} className="btn">
          See Premium Plans
        </Link>
      </div>
    </div>
  );
}

function UpgradePrompt({ onClose }: { onClose: () => void }) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="dv-lock-popup-backdrop" onClick={onClose}>
      <div
        className="dv-lock-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dv-lock-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="dv-lock-popup__close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className="dv-lock-popup__badge">uncoverd Premium</div>
        <h2 id="dv-lock-popup-title" className="dv-lock-popup__title">
          Unlock every dividend payer.
        </h2>
        <p className="dv-lock-popup__text">
          Full ratings, returns history, capture-strategy data and the complete payout
          calendar &mdash; for less than half the price of dividend.com.
        </p>
        <div className="dv-lock-popup__actions">
          <button type="button" className="dv-lock-popup__secondary" onClick={onClose}>
            No thanks
          </button>
          <Link href="/pricing" className="dv-lock-popup__primary">
            See plans
          </Link>
        </div>
      </div>
    </div>
  );
}

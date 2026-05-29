"use client";

import { useState } from "react";

/**
 * Reddit-share button that pre-populates a title + URL. Posts that include
 * concrete data and a link convert well on r/dividends, r/DividendInvesting,
 * r/ETFs, r/investing. We don't auto-post (Reddit bans bots) — the user
 * clicks through to the submit page with title + url pre-filled.
 */
export function RedditShareButton({
  title,
  path,
  subreddits = ["dividends", "DividendInvesting", "ETFs", "investing"],
}: {
  title: string;
  path: string;
  subreddits?: string[];
}) {
  const [open, setOpen] = useState(false);
  const url = `https://uncoverd.org${path}`;

  function submitTo(sub: string) {
    const params = new URLSearchParams({ title, url });
    window.open(`https://www.reddit.com/r/${sub}/submit?${params.toString()}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="dv-share-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.085.222-.085.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.916 0 1.546-.184 1.924-.561.085-.085.223-.085.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918zm13.202-.93c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-5-.794c0-.96-.78-1.741-1.74-1.741-.474 0-.902.19-1.217.498-1.179-.795-2.748-1.301-4.483-1.361l.974-3.183 2.811.658c.026.671.572 1.211 1.249 1.211.69 0 1.25-.56 1.25-1.25s-.56-1.25-1.25-1.25c-.491 0-.913.286-1.115.699l-3.114-.729c-.103-.024-.207.03-.245.131l-1.083 3.543c-1.694.083-3.219.59-4.373 1.376-.314-.306-.741-.495-1.213-.495-.96 0-1.74.78-1.74 1.74 0 .654.362 1.222.895 1.521-.011.097-.017.196-.017.298 0 2.626 3.181 4.741 7.105 4.741s7.105-2.115 7.105-4.741c0-.092-.005-.183-.014-.272.555-.293.939-.874.939-1.545zm-4.382.93c-.508 0-.922.412-.922.919 0 .506.414.918.922.918s.922-.412.922-.918c0-.507-.414-.919-.922-.919z" />
        </svg>
        Share to Reddit
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 0.4rem)",
            right: 0,
            background: "#0a0a0a",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 50,
            minWidth: 220,
            padding: "0.4rem 0",
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {subreddits.map((sub) => (
            <button
              key={sub}
              type="button"
              role="menuitem"
              onClick={() => submitTo(sub)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                padding: "0.55rem 0.95rem",
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              r/{sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

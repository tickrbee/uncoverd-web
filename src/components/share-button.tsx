"use client";

import { useState, useEffect, useRef } from "react";

// Reusable share button: opens a small popover with social-share intents
// + a "Download PNG" action that fetches the OG image route and triggers
// a browser download. Used by /compare and /alternatives.
//
// The PNG download is what the user actually wants — a single-click way
// to get a shareable image they can drop into chat/email/social without
// the friction of "right click, save image as". OG endpoints are already
// PNG; we just turn the URL into a download via the `download` attribute
// + a Blob fetch for cross-origin safety.

type Props = {
  // OG image URL (already includes query params). Same route is used as
  // the meta-tag og:image and as the download source.
  ogImageUrl: string;
  // Public URL of the page being shared (for share intents).
  shareUrl: string;
  // Plain-text title for the social intent.
  shareText: string;
  // File name for the downloaded PNG.
  downloadFileName?: string;
  // Optional button label override.
  label?: string;
};

export function ShareButton({
  ogImageUrl,
  shareUrl,
  shareText,
  downloadFileName = "uncoverd-share.png",
  label = "Share",
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked in some browsers — silent */
    }
  }

  async function downloadPng(): Promise<void> {
    setDownloading(true);
    try {
      const res = await fetch(ogImageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fall back to opening the OG image in a new tab — the user can
      // still save it via the browser's image save action.
      window.open(ogImageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;

  return (
    <div className="dv-share-wrap" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ShareIcon />
        <span>{label}</span>
      </button>
      {open && (
        <div role="menu" className="dv-share-popover">
          <a
            role="menuitem"
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dv-share-popover__item"
            onClick={() => setOpen(false)}
          >
            <BrandIcon name="x" />
            <span>Share on X</span>
          </a>
          <a
            role="menuitem"
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dv-share-popover__item"
            onClick={() => setOpen(false)}
          >
            <BrandIcon name="linkedin" />
            <span>Share on LinkedIn</span>
          </a>
          <a
            role="menuitem"
            href={redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dv-share-popover__item"
            onClick={() => setOpen(false)}
          >
            <BrandIcon name="reddit" />
            <span>Share on Reddit</span>
          </a>
          <button
            type="button"
            role="menuitem"
            className="dv-share-popover__item"
            onClick={downloadPng}
            disabled={downloading}
          >
            <DownloadIcon />
            <span>{downloading ? "Preparing PNG…" : "Download PNG"}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="dv-share-popover__item"
            onClick={copyLink}
          >
            <LinkIcon />
            <span>{copied ? "Copied!" : "Copy link"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
    </svg>
  );
}
function BrandIcon({ name }: { name: "x" | "linkedin" | "reddit" }) {
  if (name === "x") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.875l-5.367-7.014L4.667 22H1.41l8.078-9.226L1 2h7.044l4.852 6.4Zm-1.205 18h1.886L7.04 4H5.013Z" />
      </svg>
    );
  }
  if (name === "linkedin") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.66H9.37V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27ZM5.34 7.43A2.06 2.06 0 1 1 5.34 3.3a2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .78 0 1.74v20.51C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.74C24 .78 23.2 0 22.22 0Z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12Zm5.31 12.97a1.5 1.5 0 1 1-2.16 2.07c-.94.65-2.25 1.07-3.7 1.07-1.45 0-2.76-.42-3.7-1.07a1.5 1.5 0 1 1-2.16-2.07 1.5 1.5 0 0 1 .29-2.15c.45-1.78 2.84-3.14 5.74-3.14.13-.66.39-1.86.91-2.74.32-.55 1-.74 1.56-.39l.83.52a1.5 1.5 0 1 1-1.42 2.25c-.36.71-.6 1.65-.72 2.36 2.78.07 5.09 1.4 5.53 3.14a1.5 1.5 0 0 1 .29 2.15Zm-9.66-.78a1.07 1.07 0 1 0 2.13 0 1.07 1.07 0 0 0-2.13 0Zm6.42 0a1.07 1.07 0 1 0 2.14 0 1.07 1.07 0 0 0-2.14 0Z" />
    </svg>
  );
}

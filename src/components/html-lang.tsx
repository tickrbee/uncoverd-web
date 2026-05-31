"use client";

import { useEffect } from "react";

// The root layout renders <html lang="en">. Localized pages live under /fr,
// /de, etc. but can't render their own <html>, so this tiny client component
// updates document.documentElement.lang on mount. Google executes JS and reads
// the corrected value; hreflang + URL structure + content language are the
// primary signals regardless.
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [lang]);
  return null;
}

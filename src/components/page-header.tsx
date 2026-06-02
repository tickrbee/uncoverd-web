"use client";

import { useLocale } from "@/lib/use-locale";
import { tHeader } from "@/lib/page-header-i18n";

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
}) {
  // Translate client-side from the chosen language (cookie/path). Pages keep
  // passing English; localized /xx/ views already pass translated text, which
  // falls through unchanged. See page-header-i18n.ts.
  const locale = useLocale();
  return (
    <header className="dv-page-header">
      {eyebrow && <p className="dv-eyebrow">{tHeader(eyebrow, locale)}</p>}
      {meta && <p className="dv-page-header__meta">{meta}</p>}
      <h1>{tHeader(title, locale)}</h1>
      {description && <p>{tHeader(description, locale)}</p>}
    </header>
  );
}

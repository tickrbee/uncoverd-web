"use client";

// Shared stat card. Client so the label follows the chosen language (cookie/
// path) via the detail-page dictionary; the value is data and stays as-is.
import { useLocale } from "@/lib/use-locale";
import { dLabel } from "@/lib/detail-i18n";

export function Stat({ label, value }: { label: string; value: string }) {
  const locale = useLocale();
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{dLabel(label, locale)}</p>
      <p className="dv-stat-card__value">{value}</p>
    </div>
  );
}

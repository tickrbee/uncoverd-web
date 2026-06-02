"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { localeFromPath } from "@/lib/page-equivalents";
import { chromeStrings, LOCALE_MARKETS } from "@/lib/ui-i18n";

export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "EU", label: "European Union" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "JP", label: "Japan" },
  { code: "IN", label: "India" },
  { code: "CN", label: "China" },
  { code: "ALL", label: "All countries" },
];

export function CountryFilter({ active = "US" }: { active?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const locale = localeFromPath(pathname || "/");
  const chrome = chromeStrings(locale);
  const market = LOCALE_MARKETS[locale];
  const activeTier = params?.get("tier") ?? null;

  function hrefFor(code: string, tier?: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (code === "US") next.delete("country");
    else next.set("country", code);
    if (tier) next.set("tier", tier);
    else next.delete("tier");
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="dv-filters" aria-label="Filter by country">
      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginRight: "0.4rem", alignSelf: "center" }}>
        {chrome.country}
      </span>
      {/* On localized pages, surface the home market + a blue-chip (national
          index) approximation before the global country chips. */}
      {market && (
        <>
          <Link
            href={hrefFor(market.home.code)}
            className={`dv-chip ${active === market.home.code && !activeTier ? "dv-chip--active" : ""}`}
          >
            {market.home.label}
          </Link>
          <Link
            href={hrefFor(market.blueChip.code, "large")}
            className={`dv-chip ${active === market.blueChip.code && activeTier === "large" ? "dv-chip--active" : ""}`}
          >
            {market.blueChip.label}
          </Link>
        </>
      )}
      {COUNTRY_OPTIONS.map((c) => (
        <Link
          key={c.code}
          href={hrefFor(c.code)}
          className={`dv-chip ${active === c.code && !activeTier ? "dv-chip--active" : ""}`}
        >
          {c.code === "ALL" ? chrome.all : c.code === "EU" ? "EU" : c.code}
        </Link>
      ))}
    </div>
  );
}

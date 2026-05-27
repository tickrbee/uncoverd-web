"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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

  function hrefFor(code: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (code === "US") next.delete("country");
    else next.set("country", code);
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="dv-filters" aria-label="Filter by country">
      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginRight: "0.4rem", alignSelf: "center" }}>
        Country:
      </span>
      {COUNTRY_OPTIONS.map((c) => (
        <Link
          key={c.code}
          href={hrefFor(c.code)}
          className={`dv-chip ${active === c.code ? "dv-chip--active" : ""}`}
        >
          {c.code === "ALL" ? "All" : c.code === "EU" ? "EU" : c.code}
        </Link>
      ))}
    </div>
  );
}

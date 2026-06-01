"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPath, localeNavHref } from "@/lib/page-equivalents";

// Drop-in replacement for next/link in the header nav: keeps you in the current
// language by rewriting internal hrefs to their localized equivalent when one
// exists (e.g. on /fr, "/calendar/ex-dividend" → "/fr/calendrier-dividendes").
// Links to pages not yet localized stay English so they still work.
export function LocaleLink({
  href,
  children,
  ...rest
}: { href: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const locale = localeFromPath(usePathname() || "/");
  return (
    <Link href={localeNavHref(href, locale)} {...rest}>
      {children}
    </Link>
  );
}

"use client";

import { useLocale } from "@/lib/use-locale";
import { tHeader } from "@/lib/page-header-i18n";

// Tiny client helper to translate a literal English UI string by the chosen
// language (cookie/path). Use for hero/intro copy on bespoke pages that don't
// go through PageHeader: <T>Choose your subscription</T>. Unknown strings fall
// through to English.
export function T({ children }: { children: string }) {
  return <>{tHeader(children, useLocale())}</>;
}

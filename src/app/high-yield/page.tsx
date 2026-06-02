import type { Metadata } from "next";
import { HighYieldView, type HighYieldSearch } from "@/components/views/high-yield-view";
import { hreflangAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Yields Over 4% — High Dividend Stocks",
  description:
    "High-yield dividend stocks with forward yields above 4%, ranked by payout safety and uncoverd rating so you can spot quality income — not yield traps.",
  alternates: {
    canonical: "/high-yield",
    languages: hreflangAlternates({
      en: "/high-yield",
      fr: "/actions-haut-rendement",
      de: "/aktien-hohe-dividende",
      it: "/azioni-alto-rendimento",
      es: "/acciones-alta-rentabilidad",
    }),
  },
};

export const dynamic = "force-dynamic";

export default async function HighYieldPage({
  searchParams,
}: {
  searchParams: Promise<HighYieldSearch>;
}) {
  return <HighYieldView locale="en" sp={await searchParams} />;
}

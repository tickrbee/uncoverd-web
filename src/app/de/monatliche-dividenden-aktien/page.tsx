import type { Metadata } from "next";
import { MonthlyView, type MonthlySearch } from "@/components/views/monthly-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Aktien mit monatlicher Dividende 2026 (Liste) | uncoverd" },
  description: metaDescription(
    "Liste der Aktien mit monatlicher Dividende: REITs, BDCs und Fonds, die jeden Monat zahlen, nach Größe sortiert mit Rendite und Kurs.",
  ),
  alternates: { canonical: "/de/monatliche-dividenden-aktien" },
  openGraph: {
    title: "Aktien mit monatlicher Dividende 2026 (Liste)",
    description: "Aktien, die jeden Monat eine Dividende zahlen, mit Rendite und Kurs.",
    type: "website",
    url: localizedUrl("de", "/monatliche-dividenden-aktien"),
    locale: OG_LOCALE.de,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<MonthlySearch> }) {
  return <MonthlyView locale="de" sp={await searchParams} />;
}

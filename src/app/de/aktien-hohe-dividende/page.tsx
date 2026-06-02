import type { Metadata } from "next";
import { HighYieldView, type HighYieldSearch } from "@/components/views/high-yield-view";
import { OG_LOCALE, localizedUrl, hreflangAlternates } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Aktien mit hoher Dividende 2026 (Rendite > 4 %) | uncoverd" },
  description: metaDescription(
    "Aktien mit hoher Dividende und einer Rendite über 4 %, nach Rendite sortiert, mit Sektor und Kurs. Aktualisierte Marktdaten.",
  ),
  alternates: {
    canonical: "/de/aktien-hohe-dividende",
    languages: hreflangAlternates({
      en: "/high-yield",
      fr: "/actions-haut-rendement",
      de: "/aktien-hohe-dividende",
      it: "/azioni-alto-rendimento",
      es: "/acciones-alta-rentabilidad",
    }),
  },
  openGraph: {
    title: "Aktien mit hoher Dividende 2026 (Rendite > 4 %)",
    description: "Aktien mit hoher Dividendenrendite, nach Rendite sortiert.",
    type: "website",
    url: localizedUrl("de", "/aktien-hohe-dividende"),
    locale: OG_LOCALE.de,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<HighYieldSearch> }) {
  return <HighYieldView locale="de" sp={await searchParams} />;
}

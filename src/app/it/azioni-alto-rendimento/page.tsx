import type { Metadata } from "next";
import { HighYieldView, type HighYieldSearch } from "@/components/views/high-yield-view";
import { OG_LOCALE, localizedUrl, hreflangAlternates } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Azioni ad alto rendimento 2026 (dividendo > 4 %) | uncoverd" },
  description: metaDescription(
    "Azioni ad alto rendimento con dividendo superiore al 4 %, ordinate per rendimento, con settore e prezzo. Dati di mercato aggiornati.",
  ),
  alternates: {
    canonical: "/it/azioni-alto-rendimento",
    languages: hreflangAlternates({
      en: "/high-yield",
      fr: "/actions-haut-rendement",
      de: "/aktien-hohe-dividende",
      it: "/azioni-alto-rendimento",
      es: "/acciones-alta-rentabilidad",
    }),
  },
  openGraph: {
    title: "Azioni ad alto rendimento 2026 (dividendo > 4 %)",
    description: "Azioni con alto rendimento da dividendo, ordinate per rendimento.",
    type: "website",
    url: localizedUrl("it", "/azioni-alto-rendimento"),
    locale: OG_LOCALE.it,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<HighYieldSearch> }) {
  return <HighYieldView locale="it" sp={await searchParams} />;
}

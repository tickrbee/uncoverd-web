import type { Metadata } from "next";
import { HighYieldView, type HighYieldSearch } from "@/components/views/high-yield-view";
import { OG_LOCALE, localizedUrl, hreflangAlternates } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Actions à fort dividende 2026 (rendement > 4 %) | uncoverd" },
  description: metaDescription(
    "Actions à fort dividende avec un rendement supérieur à 4 %, classées par rendement, avec secteur et cours. Données de marché mises à jour.",
  ),
  alternates: {
    canonical: "/fr/actions-haut-rendement",
    languages: hreflangAlternates({
      en: "/high-yield",
      fr: "/actions-haut-rendement",
      de: "/aktien-hohe-dividende",
      it: "/azioni-alto-rendimento",
      es: "/acciones-alta-rentabilidad",
    }),
  },
  openGraph: {
    title: "Actions à fort dividende 2026 (rendement > 4 %)",
    description: "Les actions à haut rendement du dividende, classées par rendement.",
    type: "website",
    url: localizedUrl("fr", "/actions-haut-rendement"),
    locale: OG_LOCALE.fr,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<HighYieldSearch> }) {
  return <HighYieldView locale="fr" sp={await searchParams} />;
}

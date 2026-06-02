import type { Metadata } from "next";
import { MonthlyView, type MonthlySearch } from "@/components/views/monthly-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Actions à dividende mensuel 2026 (liste & PEA) | uncoverd" },
  description: metaDescription(
    "Liste des actions à dividende mensuel : REIT, BDC et fonds qui versent chaque mois, classés par taille avec rendement et cours. Conseils pour le PEA.",
  ),
  alternates: { canonical: "/fr/actions-dividende-mensuel" },
  openGraph: {
    title: "Actions à dividende mensuel 2026 (liste & PEA)",
    description: "Les actions qui versent un dividende chaque mois, avec rendement et cours.",
    type: "website",
    url: localizedUrl("fr", "/actions-dividende-mensuel"),
    locale: OG_LOCALE.fr,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<MonthlySearch> }) {
  return <MonthlyView locale="fr" sp={await searchParams} />;
}

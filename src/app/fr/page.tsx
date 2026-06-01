import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export const metadata: Metadata = {
  title: { absolute: "uncoverd — Recherche sur les dividendes & screener" },
  description: metaDescription(
    "Trouvez les meilleures actions à dividende avec le screener uncoverd : notes, portefeuilles modèles, calendrier des dividendes et palmarès du CAC 40.",
  ),
  alternates: { canonical: "/fr", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd — Recherche sur les dividendes",
    description: "Le meilleur outil d'actions à dividende : screener, calendrier, palmarès.",
    type: "website",
    url: localizedUrl("fr", "/"),
    locale: OG_LOCALE.fr,
  },
};

export default function FrHome() {
  return <HomeView locale="fr" />;
}

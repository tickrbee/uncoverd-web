import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export const metadata: Metadata = {
  title: { absolute: "uncoverd — Ricerca sui dividendi & screener" },
  description: metaDescription(
    "Trova le migliori azioni con dividendo con lo screener uncoverd: valutazioni, portafogli modello, calendario dividendi e classifica del FTSE MIB.",
  ),
  alternates: { canonical: "/it", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd — Ricerca sui dividendi",
    description: "Il miglior strumento per azioni a dividendo: screener, calendario, classifica.",
    type: "website",
    url: localizedUrl("it", "/"),
    locale: OG_LOCALE.it,
  },
};

export default function ItHome() {
  return <HomeView locale="it" />;
}

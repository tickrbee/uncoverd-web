import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export const metadata: Metadata = {
  title: { absolute: "uncoverd — Análisis de dividendos y screener" },
  description: metaDescription(
    "Encuentra las mejores acciones por dividendo con el screener de uncoverd: valoraciones, carteras modelo, calendario de dividendos y ranking del IBEX 35.",
  ),
  alternates: { canonical: "/es", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd — Análisis de dividendos",
    description: "La mejor herramienta de acciones por dividendo: screener, calendario, ranking.",
    type: "website",
    url: localizedUrl("es", "/"),
    locale: OG_LOCALE.es,
  },
};

export default function EsHome() {
  return <HomeView locale="es" />;
}

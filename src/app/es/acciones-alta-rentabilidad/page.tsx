import type { Metadata } from "next";
import { HighYieldView, type HighYieldSearch } from "@/components/views/high-yield-view";
import { OG_LOCALE, localizedUrl, hreflangAlternates } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Acciones de alta rentabilidad por dividendo 2026 (más del 4 %) | uncoverd" },
  description: metaDescription(
    "Acciones de alta rentabilidad con dividendo superior al 4 %, ordenadas por rentabilidad, con sector y precio. Datos de mercado actualizados.",
  ),
  alternates: {
    canonical: "/es/acciones-alta-rentabilidad",
    languages: hreflangAlternates({
      en: "/high-yield",
      fr: "/actions-haut-rendement",
      de: "/aktien-hohe-dividende",
      it: "/azioni-alto-rendimento",
      es: "/acciones-alta-rentabilidad",
    }),
  },
  openGraph: {
    title: "Acciones de alta rentabilidad por dividendo 2026 (más del 4 %)",
    description: "Acciones con alta rentabilidad por dividendo, ordenadas por rentabilidad.",
    type: "website",
    url: localizedUrl("es", "/acciones-alta-rentabilidad"),
    locale: OG_LOCALE.es,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<HighYieldSearch> }) {
  return <HighYieldView locale="es" sp={await searchParams} />;
}

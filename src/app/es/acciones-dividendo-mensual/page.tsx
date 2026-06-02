import type { Metadata } from "next";
import { MonthlyView, type MonthlySearch } from "@/components/views/monthly-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Acciones con dividendo mensual 2026 (lista) | uncoverd" },
  description: metaDescription(
    "Lista de acciones con dividendo mensual: REITs, BDCs y fondos que pagan cada mes, ordenados por tamaño con rentabilidad y precio.",
  ),
  alternates: { canonical: "/es/acciones-dividendo-mensual" },
  openGraph: {
    title: "Acciones con dividendo mensual 2026 (lista)",
    description: "Acciones que pagan dividendo cada mes, con rentabilidad y precio.",
    type: "website",
    url: localizedUrl("es", "/acciones-dividendo-mensual"),
    locale: OG_LOCALE.es,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<MonthlySearch> }) {
  return <MonthlyView locale="es" sp={await searchParams} />;
}

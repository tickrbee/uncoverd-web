import type { Metadata } from "next";
import { CalendarView, type CalendarSearch } from "@/components/views/calendar-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Próximos dividendos 2026: calendario y fechas | uncoverd" },
  description: metaDescription(
    "Próximos dividendos 2026: calendario de fechas ex-dividendo y de pago de acciones internacionales y del IBEX 35, con importe, rentabilidad y frecuencia.",
  ),
  alternates: { canonical: "/es/proximos-dividendos" },
  openGraph: {
    title: "Próximos dividendos 2026: calendario y fechas",
    description:
      "Calendario de próximas fechas ex-dividendo y de pago, con importe, rentabilidad y frecuencia.",
    type: "website",
    url: localizedUrl("es", "/proximos-dividendos"),
    locale: OG_LOCALE.es,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<CalendarSearch> }) {
  return <CalendarView locale="es" sp={await searchParams} />;
}

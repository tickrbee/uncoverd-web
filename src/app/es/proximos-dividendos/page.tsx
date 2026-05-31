import type { Metadata } from "next";
import {
  DividendCalendarService,
  type CalendarStrings,
} from "@/components/service/dividend-calendar-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const COVER = "https://images.pexels.com/photos/2504924/pexels-photo-2504924.jpeg";

const STRINGS: CalendarStrings = {
  h1: "Próximos dividendos 2026",
  intro: [
    "Consulta las próximas fechas de descuento del dividendo (fecha ex-dividendo) de acciones internacionales y del IBEX 35. Para cobrar un dividendo debes tener la acción el día anterior a su fecha ex-dividendo.",
    "La tabla muestra los próximos descuentos a 30 días, con el importe del dividendo, la rentabilidad y la frecuencia de pago. Haz clic en cualquier valor para ver su historial completo.",
  ],
  sectionTitle: "Próximas fechas ex-dividendo",
  th: {
    symbol: "Acción",
    exDate: "Ex-dividendo",
    payment: "Pago",
    amount: "Dividendo",
    yield: "Rentabilidad",
    frequency: "Frecuencia",
  },
  empty: "No hay próximos dividendos por el momento.",
  cta: [
    { label: "Screener de dividendos", href: "/screener" },
    { label: "Acciones con dividendo mensual", href: "/monthly" },
    { label: "Todas las acciones A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "¿Qué es la fecha ex-dividendo?",
      a: "Es la fecha a partir de la cual la acción cotiza sin derecho al próximo dividendo. Para cobrarlo debes tener la acción el día anterior a esa fecha.",
    },
    {
      q: "¿Cuándo se paga el dividendo?",
      a: "El pago suele producirse entre unos días y unas semanas después de la fecha ex-dividendo. La fecha concreta aparece en la tabla para cada acción.",
    },
    {
      q: "¿Hay un calendario de dividendos del IBEX 35?",
      a: "Este calendario incluye acciones internacionales, entre ellas los grandes valores del IBEX 35. Usa el screener para filtrar por rentabilidad y mercado.",
    },
  ],
};

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
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function ProximosDividendosPage() {
  return (
    <DividendCalendarService
      locale="es"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Calendario y documentos financieros sobre un escritorio"
    />
  );
}

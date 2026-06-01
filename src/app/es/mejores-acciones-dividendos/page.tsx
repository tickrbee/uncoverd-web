import type { Metadata } from "next";
import {
  DividendListService,
  type ListStrings,
} from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg";

const STRINGS: ListStrings = {
  h1: "Mejores acciones por dividendo (IBEX 35 y España)",
  intro: [
    "Descubre las mejores acciones por dividendo cotizadas en España, incluidos los valores del IBEX 35, ordenadas por rentabilidad. La rentabilidad por sí sola no basta: comprueba siempre que el dividendo esté cubierto por los beneficios.",
    "La tabla se actualiza automáticamente con datos de mercado. Haz clic en cualquier acción para ver su historial de dividendos, su pay-out y su valoración.",
  ],
  sectionTitle: "Ranking de acciones por dividendo en España",
  th: { symbol: "Acción", name: "Empresa", sector: "Sector", yield: "Rentabilidad", price: "Precio" },
  empty: "No hay acciones para mostrar por el momento.",
  cta: [
    { label: "Próximos dividendos", href: "/es/proximos-dividendos" },
    { label: "Screener de dividendos", href: "/screener" },
    { label: "Todas las acciones A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "¿Cuáles son las mejores acciones por dividendo del IBEX 35?",
      a: "Las mayores rentabilidades del IBEX 35 suelen estar en bancos, energía y telecomunicaciones. La tabla ordena los valores españoles por rentabilidad; prioriza los que tienen un dividendo bien cubierto.",
    },
    {
      q: "¿Una rentabilidad alta es siempre buena?",
      a: "No. Una rentabilidad muy alta suele indicar riesgo de recorte del dividendo. Fíjate en el pay-out y en la regularidad de los pagos antes de invertir.",
    },
    {
      q: "¿Con qué frecuencia pagan dividendos las empresas españolas?",
      a: "Muchas empresas del IBEX 35 pagan dos veces al año (dividendo a cuenta y complementario), y algunas ofrecen scrip dividend (en acciones).",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Mejores acciones por dividendo 2026 (IBEX 35) | uncoverd" },
  description: metaDescription(
    "Ranking de las mejores acciones por dividendo de España y del IBEX 35, ordenadas por rentabilidad, con sector y precio. Datos de mercado actualizados.",
  ),
  alternates: { canonical: "/es/mejores-acciones-dividendos" },
  openGraph: {
    title: "Mejores acciones por dividendo 2026 (IBEX 35)",
    description: "Ranking de acciones por dividendo en España, ordenadas por rentabilidad.",
    type: "website",
    url: localizedUrl("es", "/mejores-acciones-dividendos"),
    locale: OG_LOCALE.es,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function MejoresAccionesDividendosPage() {
  return (
    <DividendListService
      locale="es"
      query={{ country: "ES" }}
      strings={STRINGS}
      cover={COVER}
      coverAlt="Gráfico bursátil y datos financieros"
    />
  );
}

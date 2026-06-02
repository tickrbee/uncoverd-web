import type { Metadata } from "next";
import {
  DividendListService,
  type ListStrings,
} from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl, hreflangAlternates } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const revalidate = 3600;
const COVER = "https://images.pexels.com/photos/102152/pexels-photo-102152.jpeg";
const HREFLANG = hreflangAlternates({
  en: "/high-yield",
  fr: "/actions-haut-rendement",
  de: "/aktien-hohe-dividende",
  it: "/azioni-alto-rendimento",
  es: "/acciones-alta-rentabilidad",
});

const STRINGS: ListStrings = {
  h1: "Acciones de alta rentabilidad por dividendo (más del 4 %)",
  intro: [
    "Acciones internacionales con una rentabilidad por dividendo superior al 4 %, ordenadas de mayor a menor. Una rentabilidad alta es atractiva pero puede esconder un riesgo: comprueba siempre que el dividendo esté cubierto por los beneficios.",
    "Tabla actualizada con datos de mercado. Haz clic en una acción para ver su historial de dividendos y su calificación.",
  ],
  sectionTitle: "Acciones de alta rentabilidad, ordenadas por rentabilidad",
  th: { symbol: "Acción", name: "Empresa", sector: "Sector", yield: "Rentabilidad", price: "Precio" },
  empty: "No hay acciones que mostrar por el momento.",
  cta: [
    { label: "Calendario de dividendos", href: "/es/proximos-dividendos" },
    { label: "Mejores acciones por dividendo (IBEX 35)", href: "/es/mejores-acciones-dividendos" },
    { label: "Acciones de dividendo mensual", href: "/es/acciones-dividendo-mensual" },
  ],
  faqs: [
    {
      q: "¿Una rentabilidad alta es siempre buena?",
      a: "No necesariamente. Una rentabilidad muy alta puede indicar que el mercado espera un recorte del dividendo. Fíjate en el ratio de reparto (payout) y en la regularidad de los pagos antes de invertir buscando rentabilidad.",
    },
    {
      q: "¿Qué es una «trampa de dividendo»?",
      a: "Una acción cuya rentabilidad parece muy alta solo porque el precio se ha desplomado y cuyo dividendo corre el riesgo de ser recortado. Un dividendo cubierto por los beneficios es más sostenible que una rentabilidad récord.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Acciones de alta rentabilidad por dividendo 2026 (más del 4 %) | uncoverd" },
  description: metaDescription(
    "Acciones de alta rentabilidad con dividendo superior al 4 %, ordenadas por rentabilidad, con sector y precio. Datos de mercado actualizados.",
  ),
  alternates: { canonical: "/es/acciones-alta-rentabilidad", languages: HREFLANG },
  openGraph: {
    title: "Acciones de alta rentabilidad por dividendo 2026 (más del 4 %)",
    description: "Acciones con alta rentabilidad por dividendo, ordenadas por rentabilidad.",
    type: "website",
    url: localizedUrl("es", "/acciones-alta-rentabilidad"),
    locale: OG_LOCALE.es,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function AccionesAltaRentabilidadPage() {
  return (
    <DividendListService
      locale="es"
      query={{ minYieldPct: 4, minMarketCap: 2_000_000_000, country: "ALL" }}
      strings={STRINGS}
      cover={COVER}
      coverAlt="Gráfico bursátil y alta rentabilidad por dividendo"
    />
  );
}

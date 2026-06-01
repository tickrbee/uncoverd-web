import type { Metadata } from "next";
import { MonthlyDividendService } from "@/components/service/monthly-dividend-service";
import type { ListStrings } from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg";

const STRINGS: ListStrings = {
  h1: "Acciones con dividendo mensual",
  intro: [
    "Descubre las acciones que pagan dividendo cada mes — ideales para suavizar tus ingresos y reinvertir con más frecuencia. La mayoría son REITs, BDCs y fondos estadounidenses.",
    "Pagar mensualmente no es por sí solo una señal de calidad: comprueba siempre que el dividendo esté cubierto por los beneficios antes de comprar por la rentabilidad.",
  ],
  sectionTitle: "Acciones con dividendo mensual, ordenadas por tamaño",
  th: { symbol: "Acción", name: "Empresa", sector: "Sector", yield: "Rentabilidad", price: "Precio" },
  empty: "No hay acciones para mostrar por el momento.",
  cta: [
    { label: "Próximos dividendos", href: "/es/proximos-dividendos" },
    { label: "Mejores acciones por dividendo (IBEX 35)", href: "/es/mejores-acciones-dividendos" },
    { label: "Screener de dividendos", href: "/screener" },
  ],
  faqs: [
    {
      q: "¿Qué acciones pagan dividendo mensual?",
      a: "Sobre todo REITs, BDCs y algunos fondos, principalmente de EE. UU.: Realty Income (O), STAG Industrial (STAG) o Main Street Capital (MAIN) son ejemplos conocidos. La tabla de arriba lista los principales pagadores mensuales.",
    },
    {
      q: "¿Es mejor el dividendo mensual que el trimestral?",
      a: "Los pagos mensuales suavizan los ingresos y permiten reinvertir más a menudo, lo que acelera ligeramente la capitalización. La frecuencia por sí sola no hace más segura una acción: fíjate en la cobertura del dividendo.",
    },
    {
      q: "¿Se puede vivir de los dividendos mensuales?",
      a: "Con suficiente capital, sí. Para 2.000 € al mes con una rentabilidad del 6 % necesitarías unos 400.000 € invertidos. Diversifica entre varios valores para que un recorte no comprometa tus ingresos.",
    },
  ],
};

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
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function AccionesDividendoMensualPage() {
  return (
    <MonthlyDividendService
      locale="es"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Monedas e ingresos mensuales"
    />
  );
}

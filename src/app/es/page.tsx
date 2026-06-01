import type { Metadata } from "next";
import { LocaleLanding, type LandingLink } from "@/components/locale-landing";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const LINKS: LandingLink[] = [
  {
    href: "/es/proximos-dividendos",
    label: "Próximos dividendos",
    desc: "Próximas fechas ex-dividendo y de pago, con importe y rentabilidad.",
  },
  {
    href: "/es/mejores-acciones-dividendos",
    label: "Mejores acciones por dividendo (IBEX 35)",
    desc: "Ranking de acciones españolas ordenadas por rentabilidad.",
  },
  {
    href: "/es/acciones-dividendo-mensual",
    label: "Acciones con dividendo mensual",
    desc: "Las acciones que pagan dividendo cada mes.",
  },
  {
    href: "/es/blog",
    label: "Blog de dividendos",
    desc: "Guías y análisis para invertir en dividendos.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "uncoverd en español — Dividendos, calendario y acciones" },
  description: metaDescription(
    "Próximos dividendos, mejores acciones por dividendo del IBEX 35 y guías para invertir en dividendos — con datos de mercado en tiempo real.",
  ),
  alternates: { canonical: "/es", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd en español — Dividendos, calendario y acciones",
    description: "Próximos dividendos y mejores acciones por dividendo del IBEX 35.",
    type: "website",
    url: localizedUrl("es", "/"),
    locale: OG_LOCALE.es,
  },
};

export default function EsHome() {
  return (
    <LocaleLanding
      locale="es"
      title="Invertir en dividendos"
      tagline="uncoverd · Español"
      intro="Próximos dividendos, mejores acciones por dividendo del IBEX 35 y guías prácticas."
      links={LINKS}
      blogLabel="Últimos artículos"
    />
  );
}

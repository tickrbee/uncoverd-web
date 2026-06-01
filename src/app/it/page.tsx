import type { Metadata } from "next";
import { LocaleLanding, type LandingLink } from "@/components/locale-landing";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const LINKS: LandingLink[] = [
  {
    href: "/it/calendario-dividendi",
    label: "Calendario dividendi",
    desc: "Prossime date di stacco e pagamento, con importo e rendimento.",
  },
  {
    href: "/it/migliori-azioni-dividendi",
    label: "Migliori azioni con dividendo (FTSE MIB)",
    desc: "Classifica dei titoli italiani ordinati per rendimento.",
  },
  {
    href: "/it/azioni-dividendo-mensile",
    label: "Azioni con dividendo mensile",
    desc: "Le azioni che pagano un dividendo ogni mese.",
  },
  {
    href: "/it/blog",
    label: "Blog dividendi",
    desc: "Guide e analisi per investire nei dividendi.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "uncoverd in italiano — Dividendi, calendario & azioni" },
  description: metaDescription(
    "Calendario dividendi, migliori azioni con dividendo del FTSE MIB e guide per investire nei dividendi — con dati di mercato in tempo reale.",
  ),
  alternates: { canonical: "/it", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd in italiano — Dividendi, calendario & azioni",
    description: "Calendario dividendi e migliori azioni con dividendo del FTSE MIB.",
    type: "website",
    url: localizedUrl("it", "/"),
    locale: OG_LOCALE.it,
  },
};

export default function ItHome() {
  return (
    <LocaleLanding
      locale="it"
      title="Investire nei dividendi"
      tagline="uncoverd · Italiano"
      intro="Calendario dividendi, migliori azioni con dividendo del FTSE MIB e guide pratiche."
      links={LINKS}
      blogLabel="Ultimi articoli"
    />
  );
}

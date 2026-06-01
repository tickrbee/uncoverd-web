import type { Metadata } from "next";
import { LocaleLanding, type LandingLink } from "@/components/locale-landing";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const LINKS: LandingLink[] = [
  {
    href: "/de/dividendenkalender",
    label: "Dividendenkalender",
    desc: "Nächste Ex-Dividenden- und Zahltermine mit Höhe und Rendite.",
  },
  {
    href: "/de/beste-dividenden-aktien",
    label: "Beste Dividenden-Aktien (DAX)",
    desc: "Rangliste deutscher Aktien sortiert nach Rendite.",
  },
  {
    href: "/de/monatliche-dividenden-aktien",
    label: "Aktien mit monatlicher Dividende",
    desc: "Aktien, die jeden Monat eine Dividende zahlen.",
  },
  {
    href: "/de/blog",
    label: "Dividenden-Blog",
    desc: "Ratgeber und Analysen zum Dividenden-Investieren.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "uncoverd auf Deutsch — Dividenden, Kalender & Aktien" },
  description: metaDescription(
    "Dividendenkalender, beste Dividenden-Aktien aus dem DAX und Ratgeber zum Dividenden-Investieren — mit Echtzeit-Marktdaten.",
  ),
  alternates: { canonical: "/de", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd auf Deutsch — Dividenden, Kalender & Aktien",
    description: "Dividendenkalender und beste Dividenden-Aktien aus dem DAX.",
    type: "website",
    url: localizedUrl("de", "/"),
    locale: OG_LOCALE.de,
  },
};

export default function DeHome() {
  return (
    <LocaleLanding
      locale="de"
      title="Dividenden-Investieren"
      tagline="uncoverd · Deutsch"
      intro="Dividendenkalender, beste Dividenden-Aktien aus dem DAX und praktische Ratgeber."
      links={LINKS}
      blogLabel="Neueste Artikel"
    />
  );
}

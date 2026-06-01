import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 900;

export const metadata: Metadata = {
  title: { absolute: "uncoverd — Dividenden-Recherche & Screener" },
  description: metaDescription(
    "Finden Sie die besten Dividenden-Aktien mit dem uncoverd-Screener: Bewertungen, Musterportfolios, Dividendenkalender und DAX-Rangliste.",
  ),
  alternates: { canonical: "/de", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd — Dividenden-Recherche",
    description: "Das beste Dividenden-Aktien-Tool: Screener, Kalender, Rangliste.",
    type: "website",
    url: localizedUrl("de", "/"),
    locale: OG_LOCALE.de,
  },
};

export default function DeHome() {
  return <HomeView locale="de" />;
}

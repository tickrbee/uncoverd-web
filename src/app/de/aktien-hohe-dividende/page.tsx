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
  h1: "Aktien mit hoher Dividende (Rendite über 4 %)",
  intro: [
    "Internationale Aktien mit einer Dividendenrendite über 4 %, sortiert von der höchsten zur niedrigsten. Eine hohe Rendite ist attraktiv, kann aber ein Risiko verbergen: Prüfen Sie immer, ob die Dividende durch die Gewinne gedeckt ist.",
    "Tabelle auf Basis von Marktdaten aktualisiert. Klicken Sie auf eine Aktie, um ihre Dividendenhistorie und Bewertung zu sehen.",
  ],
  sectionTitle: "Aktien mit hoher Dividende, nach Rendite sortiert",
  th: { symbol: "Aktie", name: "Unternehmen", sector: "Sektor", yield: "Rendite", price: "Kurs" },
  empty: "Derzeit sind keine Aktien anzuzeigen.",
  cta: [
    { label: "Dividendenkalender", href: "/de/dividendenkalender" },
    { label: "Beste Dividenden-Aktien (DAX)", href: "/de/beste-dividenden-aktien" },
    { label: "Monatliche Dividenden-Aktien", href: "/de/monatliche-dividenden-aktien" },
  ],
  faqs: [
    {
      q: "Ist eine hohe Dividendenrendite immer gut?",
      a: "Nicht unbedingt. Eine sehr hohe Rendite kann ein Zeichen dafür sein, dass der Markt eine Dividendenkürzung erwartet. Achten Sie auf die Ausschüttungsquote und die Kontinuität der Zahlungen, bevor Sie auf Rendite setzen.",
    },
    {
      q: "Was ist eine „Dividendenfalle“?",
      a: "Eine Aktie, deren Rendite nur deshalb sehr hoch erscheint, weil der Kurs eingebrochen ist und deren Dividende gekürzt zu werden droht. Eine durch Gewinne gedeckte Dividende ist nachhaltiger als eine Rekordrendite.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Aktien mit hoher Dividende 2026 (Rendite > 4 %) | uncoverd" },
  description: metaDescription(
    "Aktien mit hoher Dividende und einer Rendite über 4 %, nach Rendite sortiert, mit Sektor und Kurs. Aktualisierte Marktdaten.",
  ),
  alternates: { canonical: "/de/aktien-hohe-dividende", languages: HREFLANG },
  openGraph: {
    title: "Aktien mit hoher Dividende 2026 (Rendite > 4 %)",
    description: "Aktien mit hoher Dividendenrendite, nach Rendite sortiert.",
    type: "website",
    url: localizedUrl("de", "/aktien-hohe-dividende"),
    locale: OG_LOCALE.de,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function AktienHoheDividendePage() {
  return (
    <DividendListService
      locale="de"
      query={{ minYieldPct: 4, minMarketCap: 2_000_000_000, country: "ALL" }}
      strings={STRINGS}
      cover={COVER}
      coverAlt="Börsenchart und hohe Dividendenrendite"
    />
  );
}

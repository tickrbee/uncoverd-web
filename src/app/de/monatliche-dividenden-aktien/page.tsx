import type { Metadata } from "next";
import { MonthlyDividendService } from "@/components/service/monthly-dividend-service";
import type { ListStrings } from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/7947742/pexels-photo-7947742.jpeg";

const STRINGS: ListStrings = {
  h1: "Aktien mit monatlicher Dividende",
  intro: [
    "Entdecken Sie Aktien, die jeden Monat eine Dividende zahlen — ideal, um den Einkommensstrom zu glätten und häufiger zu reinvestieren. Die meisten sind US-REITs, BDCs und Fonds.",
    "Eine monatliche Zahlung allein ist kein Qualitätsmerkmal: Prüfen Sie immer, ob die Dividende durch die Gewinne gedeckt ist, bevor Sie wegen der hohen Rendite kaufen.",
  ],
  sectionTitle: "Aktien mit monatlicher Dividende, nach Größe sortiert",
  th: { symbol: "Aktie", name: "Unternehmen", sector: "Sektor", yield: "Rendite", price: "Kurs" },
  empty: "Derzeit keine Aktien verfügbar.",
  cta: [
    { label: "Dividendenkalender", href: "/de/dividendenkalender" },
    { label: "Beste Dividenden-Aktien (DAX)", href: "/de/beste-dividenden-aktien" },
    { label: "Dividenden-Screener", href: "/screener" },
  ],
  faqs: [
    {
      q: "Welche Aktien zahlen eine monatliche Dividende?",
      a: "Vor allem REITs, BDCs und einige Fonds, überwiegend aus den USA: Realty Income (O), STAG Industrial (STAG) oder Main Street Capital (MAIN) sind bekannte Beispiele. Die Tabelle oben listet die größten monatlichen Zahler.",
    },
    {
      q: "Ist eine monatliche Dividende besser als eine vierteljährliche?",
      a: "Monatliche Zahlungen glätten den Einkommensstrom und erlauben häufigeres Reinvestieren, was den Zinseszins leicht beschleunigt. Die Häufigkeit allein macht eine Aktie aber nicht sicherer — achten Sie auf die Deckung der Dividende.",
    },
    {
      q: "Kann man von monatlichen Dividenden leben?",
      a: "Mit genügend Kapital ja. Für 2.000 € pro Monat bei 6 % Rendite bräuchten Sie rund 400.000 € investiert. Streuen Sie über mehrere Titel, damit eine Kürzung Ihr Einkommen nicht gefährdet.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Aktien mit monatlicher Dividende 2026 (Liste) | uncoverd" },
  description: metaDescription(
    "Liste der Aktien mit monatlicher Dividende: REITs, BDCs und Fonds, die jeden Monat zahlen, nach Größe sortiert mit Rendite und Kurs.",
  ),
  alternates: { canonical: "/de/monatliche-dividenden-aktien" },
  openGraph: {
    title: "Aktien mit monatlicher Dividende 2026 (Liste)",
    description: "Aktien, die jeden Monat eine Dividende zahlen, mit Rendite und Kurs.",
    type: "website",
    url: localizedUrl("de", "/monatliche-dividenden-aktien"),
    locale: OG_LOCALE.de,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function MonatlicheDividendenAktienPage() {
  return (
    <MonthlyDividendService
      locale="de"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Münzen und monatliches Einkommen"
    />
  );
}

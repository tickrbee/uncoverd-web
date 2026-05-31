import type { Metadata } from "next";
import {
  DividendListService,
  type ListStrings,
} from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/7947742/pexels-photo-7947742.jpeg";

const STRINGS: ListStrings = {
  h1: "Beste Dividenden-Aktien (DAX & Deutschland)",
  intro: [
    "Entdecken Sie die besten Dividenden-Aktien aus Deutschland, einschließlich der DAX-Werte, sortiert nach Rendite. Eine hohe Rendite allein genügt nicht — prüfen Sie immer, ob die Dividende durch die Gewinne gedeckt ist.",
    "Die Tabelle wird automatisch aus Marktdaten aktualisiert. Klicken Sie auf eine Aktie, um ihre Dividendenhistorie, Ausschüttungsquote und Bewertung zu sehen.",
  ],
  sectionTitle: "Rangliste der Dividenden-Aktien in Deutschland",
  th: { symbol: "Aktie", name: "Unternehmen", sector: "Sektor", yield: "Rendite", price: "Kurs" },
  empty: "Derzeit keine Aktien verfügbar.",
  cta: [
    { label: "Dividendenkalender", href: "/de/dividendenkalender" },
    { label: "Dividenden-Screener", href: "/screener" },
    { label: "Alle Aktien A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "Welche sind die besten Dividenden-Aktien im DAX?",
      a: "Die höchsten Renditen im DAX finden sich oft bei Versicherern, Autobauern und Versorgern. Die Tabelle sortiert deutsche Werte nach Rendite — bevorzugen Sie Aktien mit gut gedeckter Dividende.",
    },
    {
      q: "Ist eine hohe Dividendenrendite immer gut?",
      a: "Nein. Eine sehr hohe Rendite deutet oft auf ein Risiko einer Dividendenkürzung hin. Achten Sie auf die Ausschüttungsquote und die Beständigkeit der Zahlungen.",
    },
    {
      q: "Wie oft zahlen deutsche Aktien Dividende?",
      a: "Die meisten deutschen Unternehmen zahlen eine jährliche Dividende, in der Regel nach der Hauptversammlung im Frühjahr. Einige zahlen inzwischen quartalsweise.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Beste Dividenden-Aktien 2026 (DAX) | uncoverd" },
  description: metaDescription(
    "Rangliste der besten Dividenden-Aktien aus Deutschland und dem DAX, sortiert nach Rendite, mit Sektor und Kurs. Aktualisierte Marktdaten.",
  ),
  alternates: { canonical: "/de/beste-dividenden-aktien" },
  openGraph: {
    title: "Beste Dividenden-Aktien 2026 (DAX)",
    description: "Rangliste der Dividenden-Aktien in Deutschland, sortiert nach Rendite.",
    type: "website",
    url: localizedUrl("de", "/beste-dividenden-aktien"),
    locale: OG_LOCALE.de,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function BesteDividendenAktienPage() {
  return (
    <DividendListService
      locale="de"
      country="DE"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Börsenkurse und Finanzdaten"
    />
  );
}

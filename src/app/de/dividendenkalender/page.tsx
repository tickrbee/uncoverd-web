import type { Metadata } from "next";
import {
  DividendCalendarService,
  type CalendarStrings,
} from "@/components/service/dividend-calendar-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const COVER = "https://images.pexels.com/photos/29279352/pexels-photo-29279352.jpeg";

const STRINGS: CalendarStrings = {
  h1: "Dividendenkalender 2026",
  intro: [
    "Hier finden Sie die nächsten Ex-Dividenden-Termine internationaler Aktien und des DAX. Um eine Dividende zu erhalten, müssen Sie die Aktie am Tag vor dem Ex-Dividenden-Tag besitzen.",
    "Die Tabelle zeigt die kommenden Termine der nächsten 30 Tage mit Dividendenhöhe, Rendite und Auszahlungsrhythmus. Klicken Sie auf eine Aktie, um die vollständige Historie zu sehen.",
  ],
  sectionTitle: "Nächste Ex-Dividenden-Termine",
  th: {
    symbol: "Aktie",
    exDate: "Ex-Tag",
    payment: "Zahlung",
    amount: "Dividende",
    yield: "Rendite",
    frequency: "Rhythmus",
  },
  empty: "Derzeit keine anstehenden Termine.",
  cta: [
    { label: "Dividenden-Screener", href: "/screener" },
    { label: "Aktien mit monatlicher Dividende", href: "/monthly" },
    { label: "Alle Aktien A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "Was ist der Ex-Dividenden-Tag?",
      a: "Ab dem Ex-Dividenden-Tag wird die Aktie ohne Anspruch auf die nächste Dividende gehandelt. Um die Dividende zu erhalten, müssen Sie die Aktie am Tag davor besitzen.",
    },
    {
      q: "Wann wird die Dividende ausgezahlt?",
      a: "Die Auszahlung erfolgt in der Regel einige Tage bis Wochen nach dem Ex-Dividenden-Tag. Das genaue Datum steht für jede Aktie in der Tabelle.",
    },
    {
      q: "Gibt es einen Dividendenkalender für den DAX?",
      a: "Dieser Kalender umfasst internationale Aktien, einschließlich der großen DAX-Werte. Nutzen Sie den Screener, um nach Rendite und Markt zu filtern.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Dividendenkalender 2026: Ex-Dividenden-Termine | uncoverd" },
  description: metaDescription(
    "Dividendenkalender 2026: die nächsten Ex-Dividenden- und Zahltermine internationaler Aktien und des DAX, mit Dividendenhöhe, Rendite und Rhythmus.",
  ),
  alternates: { canonical: "/de/dividendenkalender" },
  openGraph: {
    title: "Dividendenkalender 2026: Ex-Dividenden-Termine",
    description:
      "Die nächsten Ex-Dividenden- und Zahltermine mit Dividendenhöhe, Rendite und Rhythmus.",
    type: "website",
    url: localizedUrl("de", "/dividendenkalender"),
    locale: OG_LOCALE.de,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function DividendenkalenderPage() {
  return (
    <DividendCalendarService
      locale="de"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Kalender und Finanzunterlagen auf einem Schreibtisch"
    />
  );
}

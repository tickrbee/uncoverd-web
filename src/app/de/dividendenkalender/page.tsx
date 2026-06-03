import type { Metadata } from "next";
import { CalendarView, type CalendarSearch } from "@/components/views/calendar-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

// CalendarView no longer reads the auth cookie, so ISR is fine here.
export const revalidate = 3600;

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
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<CalendarSearch> }) {
  return <CalendarView locale="de" sp={await searchParams} />;
}

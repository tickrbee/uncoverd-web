import type { Metadata } from "next";
import { CalendarView, type CalendarSearch } from "@/components/views/calendar-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

// CalendarView no longer reads the auth cookie, so ISR is fine here.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Calendrier des dividendes 2026 : dates de détachement | uncoverd" },
  description: metaDescription(
    "Calendrier des dividendes 2026 : prochaines dates de détachement et de versement des actions internationales et du CAC 40, avec montant, rendement et fréquence.",
  ),
  alternates: { canonical: "/fr/calendrier-dividendes" },
  openGraph: {
    title: "Calendrier des dividendes 2026 : dates de détachement",
    description:
      "Prochaines dates de détachement et de versement des dividendes, avec montant, rendement et fréquence.",
    type: "website",
    url: localizedUrl("fr", "/calendrier-dividendes"),
    locale: OG_LOCALE.fr,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<CalendarSearch> }) {
  return <CalendarView locale="fr" sp={await searchParams} />;
}

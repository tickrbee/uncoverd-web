import type { Metadata } from "next";
import { CalendarView, type CalendarSearch } from "@/components/views/calendar-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Calendario dividendi 2026: date di stacco | uncoverd" },
  description: metaDescription(
    "Calendario dividendi 2026: le prossime date di stacco e pagamento delle azioni internazionali e di Borsa Italiana, con importo, rendimento e frequenza.",
  ),
  alternates: { canonical: "/it/calendario-dividendi" },
  openGraph: {
    title: "Calendario dividendi 2026: date di stacco",
    description:
      "Le prossime date di stacco e pagamento dei dividendi, con importo, rendimento e frequenza.",
    type: "website",
    url: localizedUrl("it", "/calendario-dividendi"),
    locale: OG_LOCALE.it,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<CalendarSearch> }) {
  return <CalendarView locale="it" sp={await searchParams} />;
}

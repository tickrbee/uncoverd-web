import type { Metadata } from "next";
import { MonthlyView, type MonthlySearch } from "@/components/views/monthly-view";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Azioni con dividendo mensile 2026 (lista) | uncoverd" },
  description: metaDescription(
    "Lista di azioni con dividendo mensile: REIT, BDC e fondi che pagano ogni mese, ordinati per dimensione con rendimento e prezzo.",
  ),
  alternates: { canonical: "/it/azioni-dividendo-mensile" },
  openGraph: {
    title: "Azioni con dividendo mensile 2026 (lista)",
    description: "Azioni che pagano un dividendo ogni mese, con rendimento e prezzo.",
    type: "website",
    url: localizedUrl("it", "/azioni-dividendo-mensile"),
    locale: OG_LOCALE.it,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<MonthlySearch> }) {
  return <MonthlyView locale="it" sp={await searchParams} />;
}

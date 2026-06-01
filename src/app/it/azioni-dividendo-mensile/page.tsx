import type { Metadata } from "next";
import { MonthlyDividendService } from "@/components/service/monthly-dividend-service";
import type { ListStrings } from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/2504924/pexels-photo-2504924.jpeg";

const STRINGS: ListStrings = {
  h1: "Azioni con dividendo mensile",
  intro: [
    "Scopri le azioni che pagano un dividendo ogni mese — ideali per rendere più regolare il reddito e reinvestire più spesso. La maggior parte sono REIT, BDC e fondi statunitensi.",
    "Pagare mensilmente non è di per sé un segnale di qualità: verifica sempre che il dividendo sia coperto dagli utili prima di acquistare per il rendimento.",
  ],
  sectionTitle: "Azioni con dividendo mensile, ordinate per dimensione",
  th: { symbol: "Titolo", name: "Società", sector: "Settore", yield: "Rendimento", price: "Prezzo" },
  empty: "Nessun titolo da mostrare al momento.",
  cta: [
    { label: "Calendario dividendi", href: "/it/calendario-dividendi" },
    { label: "Migliori azioni con dividendo (FTSE MIB)", href: "/it/migliori-azioni-dividendi" },
    { label: "Screener dividendi", href: "/screener" },
  ],
  faqs: [
    {
      q: "Quali azioni pagano un dividendo mensile?",
      a: "Soprattutto REIT, BDC e alcuni fondi, principalmente statunitensi: Realty Income (O), STAG Industrial (STAG) o Main Street Capital (MAIN) sono esempi noti. La tabella in alto elenca i principali pagatori mensili.",
    },
    {
      q: "Il dividendo mensile è meglio di quello trimestrale?",
      a: "I pagamenti mensili rendono più regolare il reddito e permettono di reinvestire più spesso, accelerando leggermente la capitalizzazione. La sola frequenza non rende un titolo più sicuro: controlla la copertura del dividendo.",
    },
    {
      q: "Esistono ETF con dividendi mensili?",
      a: "Sì, diversi ETF (in particolare quelli con strategie covered-call o ad alto reddito) distribuiscono mensilmente. Verifica sempre rendimento e commissioni prima di investire.",
    },
  ],
};

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
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function AzioniDividendoMensilePage() {
  return (
    <MonthlyDividendService
      locale="it"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Monete e reddito mensile"
    />
  );
}

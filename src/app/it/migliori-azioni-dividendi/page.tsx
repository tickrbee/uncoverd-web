import type { Metadata } from "next";
import {
  DividendListService,
  type ListStrings,
} from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/2504924/pexels-photo-2504924.jpeg";

const STRINGS: ListStrings = {
  h1: "Migliori azioni con dividendo (FTSE MIB & Italia)",
  intro: [
    "Scopri le migliori azioni con dividendo quotate in Italia, compresi i titoli del FTSE MIB, ordinate per rendimento. Il rendimento da solo non basta: verifica sempre che il dividendo sia coperto dagli utili.",
    "La tabella si aggiorna automaticamente con i dati di mercato. Clicca su un titolo per vedere lo storico dei dividendi, il payout e la valutazione.",
  ],
  sectionTitle: "Classifica delle azioni con dividendo in Italia",
  th: { symbol: "Titolo", name: "Società", sector: "Settore", yield: "Rendimento", price: "Prezzo" },
  empty: "Nessun titolo da mostrare al momento.",
  cta: [
    { label: "Calendario dividendi", href: "/it/calendario-dividendi" },
    { label: "Screener dividendi", href: "/screener" },
    { label: "Tutte le azioni A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "Quali sono le migliori azioni con dividendo del FTSE MIB?",
      a: "I rendimenti più alti del FTSE MIB si trovano spesso tra banche, assicurazioni ed energia. La tabella ordina i titoli italiani per rendimento; privilegia quelli con un dividendo ben coperto.",
    },
    {
      q: "Un rendimento elevato è sempre positivo?",
      a: "No. Un rendimento molto alto segnala spesso il rischio di un taglio del dividendo. Controlla il payout e la regolarità dei pagamenti prima di investire.",
    },
    {
      q: "Con quale frequenza pagano i dividendi le società italiane?",
      a: "Molte società del FTSE MIB pagano un dividendo annuale, di solito dopo l'assemblea di primavera; alcune distribuiscono anche un acconto.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Migliori azioni con dividendo 2026 (FTSE MIB) | uncoverd" },
  description: metaDescription(
    "Classifica delle migliori azioni con dividendo in Italia e del FTSE MIB, ordinate per rendimento, con settore e prezzo. Dati di mercato aggiornati.",
  ),
  alternates: { canonical: "/it/migliori-azioni-dividendi" },
  openGraph: {
    title: "Migliori azioni con dividendo 2026 (FTSE MIB)",
    description: "Classifica delle azioni con dividendo in Italia, ordinate per rendimento.",
    type: "website",
    url: localizedUrl("it", "/migliori-azioni-dividendi"),
    locale: OG_LOCALE.it,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function MiglioriAzioniDividendiPage() {
  return (
    <DividendListService
      locale="it"
      country="IT"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Grafico di borsa e dati finanziari"
    />
  );
}

import type { Metadata } from "next";
import {
  DividendCalendarService,
  type CalendarStrings,
} from "@/components/service/dividend-calendar-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const COVER = "https://images.pexels.com/photos/9810172/pexels-photo-9810172.jpeg";

const STRINGS: CalendarStrings = {
  h1: "Calendario dividendi 2026",
  intro: [
    "Consulta le prossime date di stacco del dividendo (data ex-dividendo) delle azioni internazionali e di Borsa Italiana. Per incassare un dividendo devi possedere l'azione il giorno prima della data di stacco.",
    "La tabella mostra gli stacchi dei prossimi 30 giorni, con l'importo del dividendo, il rendimento e la frequenza di pagamento. Clicca su un titolo per vedere lo storico completo.",
  ],
  sectionTitle: "Prossime date di stacco",
  th: {
    symbol: "Titolo",
    exDate: "Stacco",
    payment: "Pagamento",
    amount: "Dividendo",
    yield: "Rendimento",
    frequency: "Frequenza",
  },
  empty: "Nessuno stacco in programma al momento.",
  cta: [
    { label: "Screener dividendi", href: "/screener" },
    { label: "Azioni con dividendo mensile", href: "/monthly" },
    { label: "Tutte le azioni A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "Cos'è la data di stacco del dividendo?",
      a: "È la data a partire dalla quale l'azione viene scambiata senza il diritto al prossimo dividendo. Per incassarlo devi possedere l'azione il giorno precedente a tale data.",
    },
    {
      q: "Quando viene pagato il dividendo?",
      a: "Il pagamento avviene di solito da pochi giorni ad alcune settimane dopo la data di stacco. La data precisa è indicata in tabella per ogni titolo.",
    },
    {
      q: "Esiste un calendario dei dividendi di Borsa Italiana?",
      a: "Questo calendario include azioni internazionali, tra cui i principali titoli di Borsa Italiana. Usa lo screener per filtrare per rendimento e mercato.",
    },
  ],
};

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
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function CalendarioDividendiPage() {
  return (
    <DividendCalendarService
      locale="it"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Calendario e documenti finanziari su una scrivania"
    />
  );
}

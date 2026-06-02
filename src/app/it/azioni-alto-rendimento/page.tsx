import type { Metadata } from "next";
import {
  DividendListService,
  type ListStrings,
} from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl, hreflangAlternates } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const revalidate = 3600;
const COVER = "https://images.pexels.com/photos/102152/pexels-photo-102152.jpeg";
const HREFLANG = hreflangAlternates({
  en: "/high-yield",
  fr: "/actions-haut-rendement",
  de: "/aktien-hohe-dividende",
  it: "/azioni-alto-rendimento",
  es: "/acciones-alta-rentabilidad",
});

const STRINGS: ListStrings = {
  h1: "Azioni ad alto rendimento (dividendo oltre il 4 %)",
  intro: [
    "Azioni internazionali con un rendimento da dividendo superiore al 4 %, ordinate dal più alto al più basso. Un rendimento elevato è attraente ma può nascondere un rischio: verifica sempre che il dividendo sia coperto dagli utili.",
    "Tabella aggiornata sui dati di mercato. Clicca su un'azione per vederne lo storico dei dividendi e il rating.",
  ],
  sectionTitle: "Azioni ad alto rendimento, ordinate per rendimento",
  th: { symbol: "Azione", name: "Società", sector: "Settore", yield: "Rendimento", price: "Prezzo" },
  empty: "Nessuna azione da mostrare al momento.",
  cta: [
    { label: "Calendario dei dividendi", href: "/it/calendario-dividendi" },
    { label: "Migliori azioni da dividendo (FTSE MIB)", href: "/it/migliori-azioni-dividendi" },
    { label: "Azioni a dividendo mensile", href: "/it/azioni-dividendo-mensile" },
  ],
  faqs: [
    {
      q: "Un rendimento elevato è sempre positivo?",
      a: "Non necessariamente. Un rendimento molto alto può segnalare che il mercato si aspetta un taglio del dividendo. Guarda il payout ratio e la regolarità dei pagamenti prima di puntare sul rendimento.",
    },
    {
      q: "Che cos'è una «trappola da rendimento»?",
      a: "Un'azione il cui rendimento appare molto alto solo perché il prezzo è crollato e il cui dividendo rischia di essere tagliato. Un dividendo coperto dagli utili è più sostenibile di un rendimento record.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Azioni ad alto rendimento 2026 (dividendo > 4 %) | uncoverd" },
  description: metaDescription(
    "Azioni ad alto rendimento con dividendo superiore al 4 %, ordinate per rendimento, con settore e prezzo. Dati di mercato aggiornati.",
  ),
  alternates: { canonical: "/it/azioni-alto-rendimento", languages: HREFLANG },
  openGraph: {
    title: "Azioni ad alto rendimento 2026 (dividendo > 4 %)",
    description: "Azioni con alto rendimento da dividendo, ordinate per rendimento.",
    type: "website",
    url: localizedUrl("it", "/azioni-alto-rendimento"),
    locale: OG_LOCALE.it,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function AzioniAltoRendimentoPage() {
  return (
    <DividendListService
      locale="it"
      query={{ minYieldPct: 4, minMarketCap: 2_000_000_000, country: "ALL" }}
      strings={STRINGS}
      cover={COVER}
      coverAlt="Grafico di borsa e alto rendimento da dividendo"
    />
  );
}

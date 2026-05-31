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
  h1: "Calendrier des dividendes 2026",
  intro: [
    "Retrouvez les prochaines dates de détachement (date ex-dividende) des actions internationales et du CAC 40. Pour percevoir un dividende, vous devez détenir l'action la veille de sa date de détachement.",
    "Le tableau ci-dessous liste les détachements à venir sur 30 jours, avec le montant du dividende, le rendement et la fréquence de versement. Cliquez sur une valeur pour voir son historique complet.",
  ],
  sectionTitle: "Prochaines dates de détachement",
  th: {
    symbol: "Action",
    exDate: "Détachement",
    payment: "Versement",
    amount: "Dividende",
    yield: "Rendement",
    frequency: "Fréquence",
  },
  empty: "Aucun détachement à venir pour le moment.",
  cta: [
    { label: "Screener de dividendes", href: "/screener" },
    { label: "Actions à dividende mensuel", href: "/monthly" },
    { label: "Toutes les actions A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "Qu'est-ce que la date de détachement du dividende ?",
      a: "C'est la date à partir de laquelle l'action se négocie sans le droit au prochain dividende. Pour toucher le dividende, il faut détenir l'action la veille de cette date.",
    },
    {
      q: "Quand le dividende est-il versé ?",
      a: "La date de versement intervient généralement quelques jours à quelques semaines après la date de détachement. Elle est indiquée dans le tableau pour chaque action.",
    },
    {
      q: "Comment voir le calendrier des dividendes du CAC 40 ?",
      a: "Ce calendrier couvre les actions internationales, dont les grandes valeurs françaises du CAC 40. Utilisez le screener pour filtrer par rendement et par marché.",
    },
  ],
};

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
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function CalendrierDividendesPage() {
  return (
    <DividendCalendarService
      locale="fr"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Calendrier financier posé sur un bureau"
    />
  );
}

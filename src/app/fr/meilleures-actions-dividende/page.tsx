import type { Metadata } from "next";
import {
  DividendListService,
  type ListStrings,
} from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/102152/pexels-photo-102152.jpeg";

const STRINGS: ListStrings = {
  h1: "Meilleures actions à dividende (CAC 40 & France)",
  intro: [
    "Découvrez les meilleures actions à dividende cotées en France, dont les valeurs du CAC 40, classées par rendement. Le rendement seul ne suffit pas : vérifiez toujours que le dividende est couvert par les bénéfices.",
    "Le tableau ci-dessous est mis à jour automatiquement à partir des données de marché. Cliquez sur une action pour voir son historique de dividendes, son ratio de distribution et sa note.",
  ],
  sectionTitle: "Palmarès des actions à dividende en France",
  th: { symbol: "Action", name: "Société", sector: "Secteur", yield: "Rendement", price: "Cours" },
  empty: "Aucune action à afficher pour le moment.",
  cta: [
    { label: "Calendrier des dividendes", href: "/fr/calendrier-dividendes" },
    { label: "Screener de dividendes", href: "/screener" },
    { label: "Toutes les actions A–Z", href: "/stocks" },
  ],
  faqs: [
    {
      q: "Quelles sont les meilleures actions à dividende du CAC 40 ?",
      a: "Les plus gros rendements du CAC 40 se trouvent souvent dans les banques, l'énergie et l'immobilier. Le tableau classe les valeurs françaises par rendement ; privilégiez celles dont le dividende est bien couvert.",
    },
    {
      q: "Un rendement élevé est-il toujours une bonne chose ?",
      a: "Non. Un rendement très élevé signale souvent un risque de baisse du dividende. Regardez le ratio de distribution et la régularité des versements avant d'investir.",
    },
    {
      q: "Ces actions sont-elles éligibles au PEA ?",
      a: "La plupart des actions françaises et européennes sont éligibles au PEA. Vérifiez l'éligibilité auprès de votre courtier avant d'investir.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Meilleures actions à dividende 2026 (CAC 40) | uncoverd" },
  description: metaDescription(
    "Palmarès des meilleures actions à dividende en France et du CAC 40, classées par rendement, avec secteur et cours. Données de marché mises à jour.",
  ),
  alternates: { canonical: "/fr/meilleures-actions-dividende" },
  openGraph: {
    title: "Meilleures actions à dividende 2026 (CAC 40)",
    description: "Palmarès des actions à dividende en France, classées par rendement.",
    type: "website",
    url: localizedUrl("fr", "/meilleures-actions-dividende"),
    locale: OG_LOCALE.fr,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function MeilleuresActionsDividendePage() {
  return (
    <DividendListService
      locale="fr"
      country="FR"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Graphique boursier et données financières"
    />
  );
}

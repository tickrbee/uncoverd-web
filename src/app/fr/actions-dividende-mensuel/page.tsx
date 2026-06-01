import type { Metadata } from "next";
import { MonthlyDividendService } from "@/components/service/monthly-dividend-service";
import type { ListStrings } from "@/components/service/dividend-list-service";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

export const revalidate = 3600;

const COVER = "https://images.pexels.com/photos/102152/pexels-photo-102152.jpeg";

const STRINGS: ListStrings = {
  h1: "Actions à dividende mensuel",
  intro: [
    "Découvrez les actions qui versent un dividende chaque mois — idéal pour lisser vos revenus et réinvestir plus souvent. La plupart sont des foncières (REIT) et sociétés de financement (BDC) américaines.",
    "À noter pour le PEA : très peu de sociétés européennes versent un dividende strictement mensuel. Une alternative consiste à combiner plusieurs actions trimestrielles pour toucher un revenu chaque mois.",
  ],
  sectionTitle: "Actions à dividende mensuel, classées par taille",
  th: { symbol: "Action", name: "Société", sector: "Secteur", yield: "Rendement", price: "Cours" },
  empty: "Aucune action à afficher pour le moment.",
  cta: [
    { label: "Calendrier des dividendes", href: "/fr/calendrier-dividendes" },
    { label: "Meilleures actions à dividende (CAC 40)", href: "/fr/meilleures-actions-dividende" },
    { label: "Screener de dividendes", href: "/screener" },
  ],
  faqs: [
    {
      q: "Quelles actions versent un dividende mensuel ?",
      a: "Surtout des REIT, des BDC et certains fonds, principalement américains : Realty Income (O), STAG Industrial (STAG) ou Main Street Capital (MAIN) en sont des exemples connus. Le tableau ci-dessus liste les principaux payeurs mensuels.",
    },
    {
      q: "Existe-t-il des actions à dividende mensuel éligibles au PEA ?",
      a: "Le PEA est limité aux titres européens, et peu de sociétés européennes paient un dividende mensuel. Pour un revenu mensuel dans un PEA, combinez plusieurs actions trimestrielles dont les dates de versement se complètent.",
    },
    {
      q: "Le dividende mensuel est-il préférable au trimestriel ?",
      a: "Le versement mensuel lisse les revenus et permet de réinvestir plus souvent, ce qui accélère légèrement la capitalisation. La fréquence seule ne rend pas une action plus sûre : vérifiez toujours la couverture du dividende.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Actions à dividende mensuel 2026 (liste & PEA) | uncoverd" },
  description: metaDescription(
    "Liste des actions à dividende mensuel : REIT, BDC et fonds qui versent chaque mois, classés par taille avec rendement et cours. Conseils pour le PEA.",
  ),
  alternates: { canonical: "/fr/actions-dividende-mensuel" },
  openGraph: {
    title: "Actions à dividende mensuel 2026 (liste & PEA)",
    description: "Les actions qui versent un dividende chaque mois, avec rendement et cours.",
    type: "website",
    url: localizedUrl("fr", "/actions-dividende-mensuel"),
    locale: OG_LOCALE.fr,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function ActionsDividendeMensuelPage() {
  return (
    <MonthlyDividendService
      locale="fr"
      strings={STRINGS}
      cover={COVER}
      coverAlt="Pièces de monnaie et revenu mensuel"
    />
  );
}

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
  h1: "Actions à fort dividende (rendement > 4 %)",
  intro: [
    "Les actions internationales offrant un rendement du dividende supérieur à 4 %, classées du plus élevé au plus faible. Un rendement élevé est attractif mais peut cacher un risque : vérifiez toujours que le dividende est couvert par les bénéfices.",
    "Tableau mis à jour à partir des données de marché. Cliquez sur une action pour voir son historique de dividendes et sa note.",
  ],
  sectionTitle: "Actions à fort rendement, classées par rendement",
  th: { symbol: "Action", name: "Société", sector: "Secteur", yield: "Rendement", price: "Cours" },
  empty: "Aucune action à afficher pour le moment.",
  cta: [
    { label: "Calendrier des dividendes", href: "/fr/calendrier-dividendes" },
    { label: "Meilleures actions à dividende (CAC 40)", href: "/fr/meilleures-actions-dividende" },
    { label: "Actions à dividende mensuel", href: "/fr/actions-dividende-mensuel" },
  ],
  faqs: [
    {
      q: "Un rendement élevé est-il une bonne chose ?",
      a: "Pas toujours. Un rendement très élevé peut signaler que le marché anticipe une baisse du dividende. Regardez le ratio de distribution et la régularité des versements avant d'investir pour le rendement.",
    },
    {
      q: "Qu'est-ce qu'un « piège à rendement » ?",
      a: "Une action dont le rendement paraît très élevé parce que le cours a chuté, et dont le dividende risque d'être coupé. Un dividende bien couvert par les bénéfices est plus durable qu'un rendement record.",
    },
  ],
};

export const metadata: Metadata = {
  title: { absolute: "Actions à fort dividende 2026 (rendement > 4 %) | uncoverd" },
  description: metaDescription(
    "Actions à fort dividende avec un rendement supérieur à 4 %, classées par rendement, avec secteur et cours. Données de marché mises à jour.",
  ),
  alternates: { canonical: "/fr/actions-haut-rendement", languages: HREFLANG },
  openGraph: {
    title: "Actions à fort dividende 2026 (rendement > 4 %)",
    description: "Les actions à haut rendement du dividende, classées par rendement.",
    type: "website",
    url: localizedUrl("fr", "/actions-haut-rendement"),
    locale: OG_LOCALE.fr,
    images: [pexelsImage(COVER, 1200)],
  },
};

export default function ActionsHautRendementPage() {
  return (
    <DividendListService
      locale="fr"
      query={{ minYieldPct: 4, minMarketCap: 2_000_000_000, country: "ALL" }}
      strings={STRINGS}
      cover={COVER}
      coverAlt="Graphique boursier et rendement élevé"
    />
  );
}

import type { Metadata } from "next";
import { LocaleLanding, type LandingLink } from "@/components/locale-landing";
import { OG_LOCALE, localizedUrl, homeHreflang } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const LINKS: LandingLink[] = [
  {
    href: "/fr/calendrier-dividendes",
    label: "Calendrier des dividendes",
    desc: "Prochaines dates de détachement et de versement, avec montant et rendement.",
  },
  {
    href: "/fr/meilleures-actions-dividende",
    label: "Meilleures actions à dividende (CAC 40)",
    desc: "Palmarès des actions françaises classées par rendement.",
  },
  {
    href: "/fr/actions-dividende-mensuel",
    label: "Actions à dividende mensuel",
    desc: "Les actions qui versent un dividende chaque mois.",
  },
  {
    href: "/fr/blog",
    label: "Blog dividendes",
    desc: "Guides et analyses pour investir dans les dividendes.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "uncoverd en français — Dividendes, calendrier & actions" },
  description: metaDescription(
    "Calendrier des dividendes, meilleures actions à dividende du CAC 40 et guides pour investir dans les dividendes — données de marché en temps réel.",
  ),
  alternates: { canonical: "/fr", languages: homeHreflang() },
  openGraph: {
    title: "uncoverd en français — Dividendes, calendrier & actions",
    description: "Calendrier des dividendes et meilleures actions à dividende du CAC 40.",
    type: "website",
    url: localizedUrl("fr", "/"),
    locale: OG_LOCALE.fr,
  },
};

export default function FrHome() {
  return (
    <LocaleLanding
      locale="fr"
      title="Investir dans les dividendes"
      tagline="uncoverd · Français"
      intro="Calendrier des dividendes, meilleures actions à dividende du CAC 40 et guides pratiques."
      links={LINKS}
      blogLabel="Derniers articles"
    />
  );
}

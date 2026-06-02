import type { Metadata } from "next";
import { GrowerView, type GrowerSearch } from "@/components/views/grower-view";
import { metaDescription } from "@/lib/seo";
import { growerBySlug, growerHreflang, GROWER_YEARS } from "@/lib/i18n-taxonomy";
import { growerHeader } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const taxo = growerBySlug("en", slug);
  if (!taxo) return { title: "Dividend Growers" };
  const h = growerHeader("en", taxo.label.en, GROWER_YEARS[slug] ?? "25+");
  return {
    title: h.title,
    description: metaDescription(`${h.description} See the full ${h.title} list with current yields, payout ratios and uncoverd ratings.`),
    alternates: { canonical: `/growers/${slug}`, languages: growerHreflang(taxo) },
  };
}

export default async function GrowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<GrowerSearch>;
}) {
  const { slug } = await params;
  return <GrowerView locale="en" slug={slug} sp={await searchParams} />;
}

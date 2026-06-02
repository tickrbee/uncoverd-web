import type { Metadata } from "next";
import { SectorView, type SectorSearch } from "@/components/views/sector-view";
import { SECTOR_SLUG_MAP, SECTOR_LABEL_MAP } from "@/lib/data";
import { metaDescription } from "@/lib/seo";
import { SECTORS, sectorHreflang } from "@/lib/i18n-taxonomy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTOR_SLUG_MAP[slug];
  if (!sector) return { title: "Sector Dividends" };
  const label = SECTOR_LABEL_MAP[sector] || sector;
  const taxo = SECTORS.find((s) => s.key === slug);
  return {
    title: `${label} Dividend Stocks`,
    description: metaDescription(
      `Top dividend-paying ${label.toLowerCase()} stocks ranked by yield, payout ratio, growth and uncoverd rating. Compare ${label.toLowerCase()} dividend payers and find the safest income.`
    ),
    alternates: {
      canonical: `/sectors/${slug}`,
      // Reciprocal hreflang to the localized /secteurs, /sektoren, … versions.
      languages: taxo ? sectorHreflang(taxo) : undefined,
    },
  };
}

export default async function SectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SectorSearch>;
}) {
  const { slug } = await params;
  return <SectorView locale="en" slug={slug} sp={await searchParams} />;
}

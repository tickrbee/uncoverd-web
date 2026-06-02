import type { Metadata } from "next";
import { IndustryView, type IndustrySearch } from "@/components/views/industry-view";
import { INDUSTRY_SLUG_MAP } from "@/lib/data";
import { metaDescription } from "@/lib/seo";
import { industryBySlug, industryHreflang } from "@/lib/i18n-taxonomy";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = INDUSTRY_SLUG_MAP[slug];
  if (!entry) return { title: "Industry Dividends" };
  const taxo = industryBySlug("en", slug);
  return {
    title: `${entry.label} Dividend Stocks`,
    description: metaDescription(
      `Top dividend-paying ${entry.label.toLowerCase()} stocks ranked by yield, payout ratio, growth and uncoverd rating. Compare ${entry.label.toLowerCase()} dividend payers and find the safest income.`
    ),
    alternates: {
      canonical: `/industries/${slug}`,
      languages: taxo ? industryHreflang(taxo) : undefined,
    },
  };
}

export default async function IndustryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<IndustrySearch>;
}) {
  const { slug } = await params;
  return <IndustryView locale="en" slug={slug} sp={await searchParams} />;
}

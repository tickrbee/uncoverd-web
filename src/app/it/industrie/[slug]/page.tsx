import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DividendListService } from "@/components/service/dividend-list-service";
import { INDUSTRY_SLUG_MAP, type ScreenerOptions } from "@/lib/data";
import { industryBySlug, industrySlugs, industryUrl, industryHreflang, industryStrings } from "@/lib/i18n-taxonomy";
import { metaDescription } from "@/lib/seo";

export const revalidate = 3600;
const LOCALE = "it" as const;

export function generateStaticParams() {
  return industrySlugs(LOCALE);
}

function queryFor(key: string): Partial<ScreenerOptions> {
  const info = INDUSTRY_SLUG_MAP[key];
  return {
    industryPattern: info?.industryPattern,
    sector: info?.sector,
    minMarketCap: 250_000_000,
    minDividend: 0.01,
    requireUpcomingDividend: true,
    country: "US",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = industryBySlug(LOCALE, slug);
  if (!entry) return { title: "Industrie" };
  const s = industryStrings(LOCALE, entry.label[LOCALE]);
  return {
    title: { absolute: `${s.h1} 2026 | uncoverd` },
    description: metaDescription(s.intro[0]),
    alternates: { canonical: industryUrl(LOCALE, entry), languages: industryHreflang(entry) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = industryBySlug(LOCALE, slug);
  if (!entry) notFound();
  return (
    <DividendListService
      locale={LOCALE}
      query={queryFor(entry.db)}
      strings={industryStrings(LOCALE, entry.label[LOCALE])}
    />
  );
}

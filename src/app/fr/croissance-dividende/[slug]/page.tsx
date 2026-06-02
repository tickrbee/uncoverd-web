import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DividendListService } from "@/components/service/dividend-list-service";
import { listGrowersWithStocks, type GrowerSlug } from "@/lib/data";
import { growerBySlug, growerSlugs, growerUrl, growerHreflang, growerStrings } from "@/lib/i18n-taxonomy";
import { metaDescription } from "@/lib/seo";

export const revalidate = 3600;
const LOCALE = "fr" as const;

export function generateStaticParams() {
  return growerSlugs(LOCALE);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = growerBySlug(LOCALE, slug);
  if (!entry) return { title: "Croissance du dividende" };
  const s = growerStrings(LOCALE, entry.key, entry.label[LOCALE]);
  return {
    title: { absolute: `${entry.label[LOCALE]} 2026 | uncoverd` },
    description: metaDescription(s.intro[0]),
    alternates: { canonical: growerUrl(LOCALE, entry), languages: growerHreflang(entry) },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = growerBySlug(LOCALE, slug);
  if (!entry) notFound();
  let rows: Awaited<ReturnType<typeof listGrowersWithStocks>> = [];
  try {
    rows = await listGrowersWithStocks(entry.db as GrowerSlug);
  } catch {
    rows = [];
  }
  return (
    <DividendListService
      locale={LOCALE}
      preRows={rows.slice(0, 60)}
      strings={growerStrings(LOCALE, entry.key, entry.label[LOCALE])}
    />
  );
}

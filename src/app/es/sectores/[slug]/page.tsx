import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectorView, type SectorSearch } from "@/components/views/sector-view";
import { sectorBySlug, sectorHreflang, SECTOR_PATH } from "@/lib/i18n-taxonomy";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";
import { sectorHeader } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";
const LOCALE = "es" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = sectorBySlug(LOCALE, slug);
  if (!entry) return {};
  const h = sectorHeader(LOCALE, entry.label[LOCALE]);
  const path = `/${SECTOR_PATH[LOCALE]}/${entry.slug[LOCALE]}`;
  return {
    title: { absolute: `${h.title} | uncoverd` },
    description: metaDescription(h.description),
    alternates: { canonical: path, languages: sectorHreflang(entry) },
    openGraph: { title: h.title, type: "website", url: localizedUrl(LOCALE, path), locale: OG_LOCALE[LOCALE] },
  };
}

export default async function EsSectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SectorSearch>;
}) {
  const { slug } = await params;
  const entry = sectorBySlug(LOCALE, slug);
  if (!entry) notFound();
  return <SectorView locale={LOCALE} slug={entry.key} sp={await searchParams} />;
}

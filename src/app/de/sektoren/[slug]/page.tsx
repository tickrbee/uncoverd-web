import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DividendListService } from "@/components/service/dividend-list-service";
import { sectorBySlug, sectorSlugs, sectorStrings, sectorHreflang, SECTOR_PATH } from "@/lib/i18n-taxonomy";
import { OG_LOCALE, localizedUrl } from "@/lib/i18n";
import { metaDescription, pexelsImage } from "@/lib/seo";

const LOCALE = "de" as const;
const COVER = "https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg";

export const revalidate = 3600;

export function generateStaticParams() {
  return sectorSlugs(LOCALE);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = sectorBySlug(LOCALE, slug);
  if (!entry) return {};
  const s = sectorStrings(LOCALE, entry.label[LOCALE]);
  const path = `/${SECTOR_PATH[LOCALE]}/${entry.slug[LOCALE]}`;
  return {
    title: { absolute: `${s.h1} | uncoverd` },
    description: metaDescription(s.intro[0]),
    alternates: { canonical: path, languages: sectorHreflang(entry) },
    openGraph: {
      title: s.h1,
      type: "website",
      url: localizedUrl(LOCALE, path),
      locale: OG_LOCALE[LOCALE],
      images: [pexelsImage(COVER, 1200)],
    },
  };
}

export default async function DeSectorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = sectorBySlug(LOCALE, slug);
  if (!entry) notFound();
  return (
    <DividendListService
      locale={LOCALE}
      query={{ sector: entry.db, country: "ALL" }}
      strings={sectorStrings(LOCALE, entry.label[LOCALE])}
      cover={COVER}
    />
  );
}

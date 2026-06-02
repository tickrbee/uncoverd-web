import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrowerView, type GrowerSearch } from "@/components/views/grower-view";
import { growerBySlug, growerUrl, growerHreflang, GROWER_YEARS } from "@/lib/i18n-taxonomy";
import { OG_LOCALE } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";
import { growerHeader } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";
const LOCALE = "es" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = growerBySlug(LOCALE, slug);
  if (!entry) return { title: "Crecimiento del dividendo" };
  const h = growerHeader(LOCALE, entry.label[LOCALE], GROWER_YEARS[entry.key] ?? "25+");
  const path = growerUrl(LOCALE, entry);
  return {
    title: { absolute: `${h.title} | uncoverd` },
    description: metaDescription(h.description),
    alternates: { canonical: path, languages: growerHreflang(entry) },
    openGraph: { title: h.title, type: "website", url: `https://uncoverd.org${path}`, locale: OG_LOCALE[LOCALE] },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<GrowerSearch>;
}) {
  const { slug } = await params;
  const entry = growerBySlug(LOCALE, slug);
  if (!entry) notFound();
  return <GrowerView locale={LOCALE} slug={entry.key} sp={await searchParams} />;
}

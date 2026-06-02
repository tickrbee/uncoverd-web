import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PicksView, PICKS } from "@/components/views/picks-view";
import { pickBySlug, pickUrl, pickHreflang } from "@/lib/i18n-taxonomy";
import { OG_LOCALE } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";
import { tHeader } from "@/lib/page-header-i18n";

export const dynamic = "force-dynamic";
const LOCALE = "de" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = pickBySlug(LOCALE, slug);
  if (!entry) return { title: "Musterportfolios" };
  const pick = PICKS[entry.key];
  const path = pickUrl(LOCALE, entry);
  return {
    title: { absolute: `${entry.label[LOCALE]} | uncoverd` },
    description: metaDescription(tHeader(pick.description, LOCALE) ?? pick.description),
    alternates: { canonical: path, languages: pickHreflang(entry) },
    openGraph: { title: entry.label[LOCALE], type: "website", url: `https://uncoverd.org${path}`, locale: OG_LOCALE[LOCALE] },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; type?: string }>;
}) {
  const { slug } = await params;
  const entry = pickBySlug(LOCALE, slug);
  if (!entry) notFound();
  return <PicksView locale={LOCALE} slug={entry.key} sp={await searchParams} />;
}

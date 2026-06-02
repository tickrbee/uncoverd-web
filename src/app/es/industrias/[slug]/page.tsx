import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryView, type IndustrySearch } from "@/components/views/industry-view";
import { industryBySlug, industryUrl, industryHreflang } from "@/lib/i18n-taxonomy";
import { OG_LOCALE } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";
import { industryHeader } from "@/lib/ui-i18n";

export const dynamic = "force-dynamic";
const LOCALE = "es" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = industryBySlug(LOCALE, slug);
  if (!entry) return { title: "Industrias" };
  const h = industryHeader(LOCALE, entry.label[LOCALE]);
  const path = industryUrl(LOCALE, entry);
  return {
    title: { absolute: `${h.title} | uncoverd` },
    description: metaDescription(h.description),
    alternates: { canonical: path, languages: industryHreflang(entry) },
    openGraph: { title: h.title, type: "website", url: `https://uncoverd.org${path}`, locale: OG_LOCALE[LOCALE] },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<IndustrySearch>;
}) {
  const { slug } = await params;
  const entry = industryBySlug(LOCALE, slug);
  if (!entry) notFound();
  return <IndustryView locale={LOCALE} slug={entry.key} sp={await searchParams} />;
}

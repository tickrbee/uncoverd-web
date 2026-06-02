import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PayoutChangesView } from "@/components/views/payout-changes-view";
import { payoutBySlug, payoutUrl, payoutHreflang } from "@/lib/i18n-taxonomy";
import { OG_LOCALE } from "@/lib/i18n";
import { metaDescription } from "@/lib/seo";
import { payoutHeader } from "@/lib/ui-i18n";

export const revalidate = 1800;
const LOCALE = "it" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = payoutBySlug(LOCALE, slug);
  if (!entry) return { title: "Variazioni di dividendo" };
  const h = payoutHeader(LOCALE, entry.key, entry.label[LOCALE]);
  const path = payoutUrl(LOCALE, entry);
  return {
    title: { absolute: `${h.title} | uncoverd` },
    description: metaDescription(h.description),
    alternates: { canonical: path, languages: payoutHreflang(entry) },
    openGraph: { title: h.title, type: "website", url: `https://uncoverd.org${path}`, locale: OG_LOCALE[LOCALE] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = payoutBySlug(LOCALE, slug);
  if (!entry) notFound();
  return <PayoutChangesView locale={LOCALE} slug={entry.key} />;
}

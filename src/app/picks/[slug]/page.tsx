import type { Metadata } from "next";
import { PicksView, PICKS } from "@/components/views/picks-view";
import { metaDescription } from "@/lib/seo";
import { pickBySlug, pickHreflang } from "@/lib/i18n-taxonomy";

// PicksView no longer reads the auth cookie, so ISR is fine instead of
// force-dynamic (ratings reveal client-side; CSV gate is client-side).
export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pick = PICKS[slug];
  if (!pick) return { title: "Picks" };
  const taxo = pickBySlug("en", slug);
  return {
    title: pick.label,
    description: metaDescription(pick.description),
    alternates: { canonical: `/picks/${slug}`, languages: taxo ? pickHreflang(taxo) : undefined },
  };
}

export default async function PicksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; type?: string }>;
}) {
  const { slug } = await params;
  return <PicksView locale="en" slug={slug} sp={await searchParams} />;
}

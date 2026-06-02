import type { Metadata } from "next";
import { PayoutChangesView } from "@/components/views/payout-changes-view";
import { metaDescription } from "@/lib/seo";
import { payoutBySlug, payoutHreflang } from "@/lib/i18n-taxonomy";
import { payoutHeader } from "@/lib/ui-i18n";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const taxo = payoutBySlug("en", slug);
  if (!taxo) return { title: "Payout Changes" };
  const h = payoutHeader("en", slug, taxo.label.en);
  return {
    title: h.title,
    description: metaDescription(h.description),
    alternates: { canonical: `/payout-changes/${slug}`, languages: payoutHreflang(taxo) },
  };
}

export default async function PayoutChangePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PayoutChangesView locale="en" slug={slug} />;
}

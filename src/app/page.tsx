import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { homeHreflang } from "@/lib/i18n";
import { websiteJsonLd, organizationJsonLd, jsonLdScript } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: { absolute: "uncoverd — Dividend Stock Research & ETF Screener" },
  description:
    "Discover the best dividend stocks with the uncoverd screener, ratings, model portfolios, and ex-dividend calendar.",
  alternates: { canonical: "/", languages: homeHreflang() },
  openGraph: { url: "https://uncoverd.org", type: "website" },
};

export const dynamic = "force-dynamic";
export const revalidate = 900;

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <HomeView locale="en" />
    </>
  );
}

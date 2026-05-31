import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DirectoryIndex } from "@/components/directory-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Browse All Dividend Stocks A–Z",
  description:
    "Browse every dividend-paying stock on uncoverd alphabetically. Jump to any letter to find a company's dividend yield, payout history, ratings and financials.",
  alternates: { canonical: "/stocks" },
};

export default function StocksDirectoryPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Directory"
          title="Browse all dividend stocks A–Z"
          description="Pick a letter to see every stock starting with it, then open any ticker for its full dividend profile."
        />
        <section className="dv-section">
          <DirectoryIndex basePath="/stocks" />
        </section>
        <section className="dv-section">
          <p>
            Looking for something specific? Use the{" "}
            <Link href="/screener" className="dv-action-link">
              dividend screener
            </Link>{" "}
            to filter by yield, sector and rating, or browse{" "}
            <Link href="/etfs" className="dv-action-link">
              all dividend ETFs
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

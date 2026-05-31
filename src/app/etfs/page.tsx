import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DirectoryIndex } from "@/components/directory-index";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Browse All Dividend ETFs A–Z",
  description:
    "Browse every dividend ETF and income fund on uncoverd alphabetically. Jump to any letter to find a fund's distribution yield, expense ratio, holdings and rating.",
  alternates: { canonical: "/etfs" },
};

export default function EtfsDirectoryPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Directory"
          title="Browse all dividend ETFs A–Z"
          description="Pick a letter to see every ETF and income fund starting with it, then open any ticker for its full profile."
        />
        <section className="dv-section">
          <DirectoryIndex basePath="/etfs" />
        </section>
        <section className="dv-section">
          <p>
            Prefer to filter? Use the{" "}
            <Link href="/screener?type=etfs" className="dv-action-link">
              ETF screener
            </Link>
            , see{" "}
            <Link href="/etfs/top-held" className="dv-action-link">
              the stocks most held by ETFs
            </Link>
            , or browse{" "}
            <Link href="/stocks" className="dv-action-link">
              all dividend stocks
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

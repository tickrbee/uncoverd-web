import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { EtfHolderSearch } from "@/components/etf-holder-search";

export const metadata: Metadata = {
  title: "Which ETF owns a stock?",
  description: "Search any ticker or company name to see every ETF that holds it — with weights, AUM, expense ratios, and position market value.",
};

// Static / pre-rendered: this page has no DB calls itself, only the client
// search component fires requests. Pre-render so first paint is instant.

export default function WhichEtfOwnsPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="ETFs & Exposure"
          title="Which ETF owns a stock?"
          description="Search any ticker or company name to see every ETF in our database that holds it — with each fund's weight, AUM, expense ratio, and position size."
        />
        <section className="dv-section" style={{ maxWidth: 720 }}>
          <EtfHolderSearch />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

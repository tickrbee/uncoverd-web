import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PremiumGate } from "@/components/premium-gate";

export const metadata: Metadata = {
  title: "Premium Dividend Research",
};

export default function ResearchPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Research"
          title="Premium Dividend Research"
          description="Build conviction from in-depth coverage of the best dividend stocks."
        />
        <PremiumGate
          title="Premium dividend research"
          description="Premium subscribers get our proprietary dividend ratings, deep-dive research, and rebalancing notes on every Model Portfolio."
        >
          <div className="dv-prose">
            <h2>Featured research</h2>
            <p>
              Premium subscribers see in-depth research notes here: dividend safety scores, payout coverage analysis,
              forward-looking commentary, and rebalancing rationale for every Model Portfolio.
            </p>
            <h2>What you get</h2>
            <ul>
              <li>Dividend Safety Ratings on every stock</li>
              <li>Payout coverage and free cash flow analysis</li>
              <li>Sector outlook and rotation commentary</li>
              <li>Email summary of weekly dividend declarations</li>
            </ul>
          </div>
        </PremiumGate>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PremiumGate } from "@/components/premium-gate";
import { PayoutEstimator } from "./estimator";

export const metadata: Metadata = {
  title: "Dividend Payout Estimator",
  description: "Estimate future dividend income for any stock based on yield and shares held.",
};

export default function PayoutEstimatorPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Tools"
          title="Dividend Payout Estimator"
          description="Estimate future dividend income based on current yield and projected payout growth."
        />
        <PremiumGate
          title="Payout Estimator — Premium"
          description="Estimate future dividend income with our premium calculator. Includes payout growth modeling and reinvestment projections."
        >
          <PayoutEstimator />
        </PremiumGate>
      </main>
      <SiteFooter />
    </>
  );
}

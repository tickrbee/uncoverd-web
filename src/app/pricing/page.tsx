import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PricingCards } from "@/components/pricing-cards";
import { SessionRestorer } from "@/components/session-restorer";
import { T } from "@/components/t";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description:
    "Choose the right uncoverd plan. Premium unlocks all dividend Model Portfolios, the Watchlist, payout estimator, and ad-free research.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <>
      <SessionRestorer />
      <SiteHeader />
      <main className="dv-page">
        <section className="panel stack" style={{ marginBottom: "1.5rem" }}>
          <h1><T>Choose your subscription</T></h1>
          <p>
            <T>Premium unlocks all dividend Model Portfolios, the Watchlist, payout estimator, ratings on every stock, in-depth research, and an ad-free experience.</T>
          </p>
        </section>

        <PricingCards />
      </main>
      <SiteFooter />
    </>
  );
}

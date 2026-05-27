import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { CompoundingCalculator } from "./calculator";

export const metadata: Metadata = {
  title: "Compounding Returns Calculator",
  description: "See how your dividend investments compound over time with reinvested dividends.",
};

export default function CompoundingCalculatorPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Tools"
          title="Compounding Returns Calculator"
          description="Project the future value of a dividend portfolio with periodic contributions and reinvested dividends."
        />
        <CompoundingCalculator />
      </main>
      <SiteFooter />
    </>
  );
}

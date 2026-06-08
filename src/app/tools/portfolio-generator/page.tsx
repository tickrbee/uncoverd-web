import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PortfolioGenerator } from "@/components/portfolio-generator";

export const metadata: Metadata = {
  title: "Portfolio Generator — Build an Optimised Dividend Portfolio",
  description:
    "Answer a few questions — amount, risk, sectors, income vs growth — and uncoverd builds a diversified, top-rated portfolio optimised for the best risk-adjusted return, with exact position sizing.",
  alternates: { canonical: "/tools/portfolio-generator" },
};

export default function PortfolioGeneratorPage() {
  return (
    <>
      <SiteHeader />
      <PortfolioGenerator />
      <SiteFooter />
    </>
  );
}

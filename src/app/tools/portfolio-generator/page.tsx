import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PortfolioGeneratorApp } from "@/components/generator/app";

export const metadata: Metadata = {
  title: "Portfolio Generator — Build an Optimised Dividend Portfolio",
  description:
    "Answer a few questions — amount, risk, sectors, income vs growth — and uncoverd builds a diversified, top-rated portfolio across six optimizations, with a Monte Carlo projection and exact position sizing.",
  alternates: { canonical: "/tools/portfolio-generator" },
};

export default function PortfolioGeneratorPage() {
  return (
    <>
      <SiteHeader />
      <PortfolioGeneratorApp />
      <SiteFooter />
    </>
  );
}

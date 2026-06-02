import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { PortfolioHealthcheck } from "@/components/portfolio-healthcheck";

export const metadata: Metadata = {
  title: "Portfolio Healthcheck — Risk, Return & Correlation",
  description:
    "Add your holdings (no quantities needed) and get an instant risk/return read: volatility, correlation matrix, diversification score and sector concentration.",
  alternates: { canonical: "/tools/portfolio-healthcheck" },
};

export default function PortfolioHealthcheckPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Tools"
          title="Portfolio Healthcheck"
          description="Search and select your holdings — no quantities needed — and we'll analyze the risk/return profile, how correlated they are, and where you're concentrated."
        />
        <PortfolioHealthcheck />
      </main>
      <SiteFooter />
    </>
  );
}

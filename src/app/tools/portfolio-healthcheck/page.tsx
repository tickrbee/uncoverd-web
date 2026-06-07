import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PortfolioHealthcheckApp } from "@/components/healthcheck/app";

export const metadata: Metadata = {
  title: "Portfolio Healthcheck — Risk, Return & Correlation",
  description:
    "Add your holdings (no quantities needed) and get an instant health grade: risk, correlation, concentration, look-through, factor exposure, the efficient frontier and optimization moves.",
  alternates: { canonical: "/tools/portfolio-healthcheck" },
};

export default function PortfolioHealthcheckPage() {
  return (
    <>
      <SiteHeader />
      <PortfolioHealthcheckApp />
      <SiteFooter />
    </>
  );
}

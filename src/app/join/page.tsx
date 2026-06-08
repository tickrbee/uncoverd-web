import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SessionRestorer } from "@/components/session-restorer";
import { JoinOffer } from "@/components/join-offer";

export const metadata: Metadata = {
  title: "Join uncoverd Pro — Ratings, Portfolio Tools & Top Picks for $100/yr",
  description:
    "uncoverd Pro: A–F ratings on every stock, the Portfolio Healthcheck, the alternatives finder, model portfolios and the monthly top picks — $100/year, less than half of comparable research services.",
  alternates: { canonical: "/join" },
  robots: { index: false, follow: true },
};

export default function JoinPage() {
  return (
    <>
      <SessionRestorer />
      <SiteHeader />
      <JoinOffer />
      <SiteFooter />
    </>
  );
}

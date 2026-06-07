import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SessionRestorer } from "@/components/session-restorer";
import { PricingRedesign } from "@/components/pricing-redesign";
import { faqJsonLd, jsonLdScript } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Pricing — uncoverd Pro",
  description:
    "uncoverd Pro is $100/year (about $8.33/mo): dividend ratings on every stock, model portfolios, best-dividend lists, dividend-capture picks, a payout estimator, watchlist alerts, CSV export and ad-free research. Cancel anytime.",
  alternates: { canonical: "/pricing" },
};

// Server-rendered FAQ schema (the visible FAQ lives in the client component).
const FAQS = [
  { q: "How much is Pro?", a: "Pro is $100 per year — about $8.33 a month — billed once annually. One flat price unlocks ratings, model portfolios, curated lists, income tools, alerts, CSV exports and ad-free browsing. No add-ons or tiers." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel in one click from your account and you keep Pro until the end of the period you've already paid for." },
  { q: "What stays free?", a: "The screener with basic filters, the ex-dividend calendar, the standard news feed, and full stock profiles with dividend history stay free forever. Pro adds ratings, portfolios, tools and exports on top." },
  { q: "How do payments work?", a: "Checkout is handled securely by Stripe and access is instant. We never see or store your card details, and we never sell your data." },
  { q: "How is this different from other dividend sites?", a: "We put a standardised A–F rating on every stock, build model portfolios from those ratings, and flag dividend changes before they're priced in — research and decisions, not just data tables." },
].map((x) => ({ q: x.q, a: x.a }));

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(FAQS)) }} />
      <SessionRestorer />
      <SiteHeader />
      <PricingRedesign />
      <SiteFooter />
    </>
  );
}

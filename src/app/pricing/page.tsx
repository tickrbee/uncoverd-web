import { MainNav } from "@/components/main-nav";
import { PricingCards } from "@/components/pricing-cards";
import { BILLING_PURPOSE_LINE } from "@/lib/branding";

export default function PricingPage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="panel stack">
          <h1>Choose your subscription</h1>
          <p>{BILLING_PURPOSE_LINE}</p>
          <p>All plan features apply to the uncoverd mobile app. Checkout and billing are managed here on web.</p>
        </section>

        <PricingCards />
      </main>
    </>
  );
}

import { MainNav } from "@/components/main-nav";
import { PricingCards } from "@/components/pricing-cards";

export default function PricingPage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="panel stack">
          <h1>Plans for every stage</h1>
          <p>Public names are Free, Plus, and Pro. Billing and entitlements are managed in your account.</p>
        </section>

        <PricingCards />
      </main>
    </>
  );
}

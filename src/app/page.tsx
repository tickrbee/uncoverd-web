import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { BILLING_PURPOSE_LINE } from "@/lib/branding";

export default function HomePage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="hero">
          <p className="hero__eyebrow">Subscription Portal</p>
          <h1>Manage your uncoverd subscription for the mobile app.</h1>
          <p>{BILLING_PURPOSE_LINE}</p>

          <div className="hero__actions">
            <Link href="/login" className="btn">
              Log in
            </Link>
            <Link href="/pricing" className="btn btn--ghost">
              View plans
            </Link>
          </div>

          <p className="hero__fineprint">
            Billing is processed securely through Stripe. uncoverd provides account clarity and risk-aware product
            access, not investment advice.
          </p>
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { BILLING_PURPOSE_LINE } from "@/lib/branding";

export default function HomePage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="hero">
          <p className="hero__eyebrow">Mobile investing app</p>
          <h1>Subscribe to uncoverd and manage your account in one place.</h1>
          <p>{BILLING_PURPOSE_LINE}</p>
          <ul className="hero__summary" aria-label="What uncoverd gives you inside the mobile app">
            <li>Clear key points and key risks for each company.</li>
            <li>Portfolio impact previews before position changes.</li>
            <li>Weekly risk check-ins and billing control from one account.</li>
          </ul>

          <div className="hero__actions">
            <Link href="/login" className="btn">
              Log in
            </Link>
            <Link href="/pricing" className="btn btn--ghost">
              View plans
            </Link>
          </div>

          <p className="hero__fineprint">
            Product usage happens in the uncoverd mobile app. This site is only for login and subscription management.
          </p>
        </section>
      </main>
    </>
  );
}

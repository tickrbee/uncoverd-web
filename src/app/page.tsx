import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { BILLING_PURPOSE_LINE } from "@/lib/branding";

export default function HomePage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="hero">
          <h1>Subscription access for the uncoverd mobile app.</h1>
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
            Use this site only for account login, subscription checkout, and billing management.
          </p>
        </section>
      </main>
    </>
  );
}

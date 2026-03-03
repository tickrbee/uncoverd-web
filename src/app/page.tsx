import Link from "next/link";
import { MainNav } from "@/components/main-nav";

export default function HomePage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="hero">
          <h1>See what matters. Pay only when you are ready.</h1>
          <p>
            uncoverd is the front door for your account, secure login, and subscription management. Sign in
            with email or Google, pick your plan, and manage billing from one account.
          </p>

          <div className="hero__actions">
            <Link href="/pricing" className="btn">
              View plans
            </Link>
            <Link href="/login" className="btn btn--ghost">
              Log in
            </Link>
          </div>

          <div className="hero__meta" aria-label="Core highlights">
            <span className="tag">Hosted on Vercel</span>
            <span className="tag">Auth via Supabase</span>
            <span className="tag">Billing powered by Stripe</span>
          </div>
        </section>
      </main>
    </>
  );
}

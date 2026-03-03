import { MainNav } from "@/components/main-nav";

export default function PrivacyPage() {
  return (
    <>
      <MainNav />
      <main className="page legal">
        <h1>Privacy Policy</h1>
        <p>
          uncoverd uses Supabase for authentication and Stripe for billing. We process only account and subscription
          data required to provide secure login and billing management.
        </p>
        <p>
          Payment card data is handled by Stripe. uncoverd does not store raw payment card numbers on its own
          servers.
        </p>
        <p>
          You can contact support to request account assistance or deletion. Policy updates are published on this
          page.
        </p>
      </main>
    </>
  );
}

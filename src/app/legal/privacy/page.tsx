import { MainNav } from "@/components/main-nav";

export default function PrivacyPage() {
  return (
    <>
      <MainNav />
      <main className="page legal">
        <h1>Privacy Policy</h1>
        <p>
          uncoverd uses Supabase for authentication and Stripe for billing. We process the minimum required account and
          payment metadata needed to provide secure access and subscription management.
        </p>
        <p>
          Billing events update your account tier and renewal status. We do not store raw payment card numbers on
          uncoverd servers.
        </p>
        <p>
          You can request account deletion and data-related support through official support channels. Policy updates
          are posted on this page.
        </p>
      </main>
    </>
  );
}

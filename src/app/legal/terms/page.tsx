import { MainNav } from "@/components/main-nav";

export default function TermsPage() {
  return (
    <>
      <MainNav />
      <main className="page legal">
        <h1>Terms of Service</h1>
        <p>
          These terms govern your use of the uncoverd web portal for account access and subscription billing for the
          mobile app.
        </p>
        <p>
          Paid plans renew automatically unless canceled in the billing portal. Subscription status determines access
          level in the mobile app.
        </p>
        <p>
          uncoverd provides software tools and account services. Nothing on this website constitutes investment advice
          or a promise of financial outcome.
        </p>
      </main>
    </>
  );
}

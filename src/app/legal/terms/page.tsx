import { MainNav } from "@/components/main-nav";

export default function TermsPage() {
  return (
    <>
      <MainNav />
      <main className="page legal">
        <h1>Terms of Service</h1>
        <p>
          These terms govern access to uncoverd and your subscription usage. By creating an account, you agree to
          provide accurate account information and to use the service in compliance with applicable law.
        </p>
        <p>
          Paid plans renew automatically unless canceled through the billing portal. Feature access depends on your
          active subscription tier and can change when a payment fails or a subscription is canceled.
        </p>
        <p>
          We may update these terms when product, legal, or compliance requirements change. Material updates will be
          published on this page.
        </p>
      </main>
    </>
  );
}

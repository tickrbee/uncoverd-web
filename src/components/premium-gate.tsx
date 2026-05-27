import Link from "next/link";
import { getPremiumStatus } from "@/lib/premium";

export async function PremiumGate({
  title = "Premium feature",
  description = "Upgrade to access Model Portfolios, advanced screener filters, the Dividend Watchlist, in-depth research, and ad-free browsing.",
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const status = await getPremiumStatus();
  if (status.isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="dv-premium-gate">
      <span className="dv-premium-badge">Premium</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="dv-premium-gate__actions">
        <Link href="/pricing" className="btn">
          See Premium Plans
        </Link>
        {!status.isLoggedIn && (
          <Link href="/login?next=%2Fpricing" className="btn btn--ghost">
            Log In
          </Link>
        )}
      </div>
    </div>
  );
}

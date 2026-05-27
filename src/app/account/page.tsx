import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountActions } from "@/components/account-actions";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { toDisplayPlan } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type UserProfile = {
  subscription_tier: "free" | "plus" | "gold" | null;
  plus_ends_at: string | null;
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, plus_ends_at")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const renewsAt = profile?.plus_ends_at ? new Date(profile.plus_ends_at).toLocaleDateString() : null;

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section className="panel stack">
          <h1>Subscription account</h1>
          <p>Signed in as {user.email}</p>
          <p>Current plan: {toDisplayPlan(profile?.subscription_tier)}</p>
          <p>{renewsAt ? `Renews on ${renewsAt}` : "No active renewal date yet."}</p>
          <p>Your plan unlocks uncoverd Premium features. Manage billing here.</p>
          <AccountActions />
          <p>
            Legal: <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.
          </p>
        </section>

        <section
          className="panel stack"
          style={{ marginTop: "1.5rem", borderColor: "rgba(248, 113, 113, 0.25)" }}
        >
          <h2 style={{ marginTop: 0, color: "var(--negative)" }}>Danger zone</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Permanently delete your account, watchlist and profile. Active subscriptions will be
            cancelled. This action cannot be undone &mdash; backups are purged within 30 days.
          </p>
          <DeleteAccountButton />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

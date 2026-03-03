import Link from "next/link";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { AccountActions } from "@/components/account-actions";
import { toDisplayPlan } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type UserProfile = {
  user_name: string | null;
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
    .select("user_name, subscription_tier, plus_ends_at")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const renewsAt = profile?.plus_ends_at ? new Date(profile.plus_ends_at).toLocaleDateString() : null;

  return (
    <>
      <MainNav />
      <main className="page">
        <section className="panel stack">
          <h1>Account</h1>
          <p>Signed in as {user.email}</p>
          <p>Profile name: {profile?.user_name ?? "Not set"}</p>
          <p>Current plan: {toDisplayPlan(profile?.subscription_tier)}</p>
          <p>{renewsAt ? `Renews on ${renewsAt}` : "No active renewal date yet."}</p>
          <AccountActions />
        </section>

        <section className="panel stack" style={{ marginTop: "18px" }}>
          <h2>Need legal details?</h2>
          <p>
            View the <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.
          </p>
        </section>
      </main>
    </>
  );
}

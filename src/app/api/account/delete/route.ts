import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Hard-delete the calling user's account. GDPR requires us to give users a
 * one-click delete. We:
 *   1. Confirm the user is authenticated.
 *   2. Optionally cancel their active Stripe subscription (best-effort).
 *   3. Clear their rows from app tables (watchlist, profile, etc).
 *   4. Delete the auth user via the service-role admin client.
 *
 * Backups (server logs + DB backups) retain the data for up to 30 days as
 * disclosed in the Privacy Policy.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not-authenticated" }, { status: 401 });
  }

  const userId = user.id;
  const admin = getAdminClient("public");

  // 1) Cancel Stripe subscription if there is one — best-effort, never blocks
  // the delete. The webhook will catch up regardless.
  try {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    const subId = (profile as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;
    if (subId) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${stripeKey}` },
        }).catch(() => null);
      }
    }
  } catch (e) {
    console.error("[account/delete] stripe cancel", e);
  }

  // 2) Clear app data. Order matters where FKs exist.
  const tables = [
    "watchlist_items",
    "watchlists",
    "user_portfolios",
    "user_profiles",
  ];
  for (const t of tables) {
    try {
      await admin.from(t).delete().eq("user_id", userId);
    } catch (e) {
      console.error("[account/delete]", t, e);
    }
  }

  // 3) Delete the auth user. Requires service-role.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error("[account/delete] auth.admin.deleteUser", delErr.message);
    return NextResponse.json(
      { ok: false, error: "delete-failed", detail: delErr.message },
      { status: 500 },
    );
  }

  // 4) Sign the current session out client-side. We return success and let
  // the client navigate to a confirmation page.
  await supabase.auth.signOut().catch(() => null);

  return NextResponse.json({ ok: true });
}

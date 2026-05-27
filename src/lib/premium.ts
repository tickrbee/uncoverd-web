import { createClient } from "@/lib/supabase/server";
import type { TierCode } from "@/lib/branding";

export type PremiumStatus = {
  isLoggedIn: boolean;
  tier: TierCode;
  isPremium: boolean;
};

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isLoggedIn: false, tier: "free", isPremium: false };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle<{ subscription_tier: TierCode | null }>();

  const tier: TierCode = profile?.subscription_tier ?? "free";
  const isPremium = tier === "plus" || tier === "gold";

  return { isLoggedIn: true, tier, isPremium };
}

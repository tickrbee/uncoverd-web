"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { plans, type TierCode } from "@/lib/branding";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";

type CheckoutStatus = "idle" | "busy";

type UserProfile = {
  subscription_tier: TierCode | null;
};

export function PricingCards() {
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<TierCode | null>(null);
  const [isLoadingTier, setIsLoadingTier] = useState(true);
  const [statusByPlan, setStatusByPlan] = useState<Record<TierCode, CheckoutStatus>>({
    free: "idle",
    plus: "idle",
    gold: "idle",
  });
  const router = useRouter();

  // Fetch current user's subscription tier
  useEffect(() => {
    async function fetchCurrentTier() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsLoadingTier(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier")
        .eq("id", session.user.id)
        .maybeSingle<UserProfile>();

      setCurrentTier(profile?.subscription_tier || "free");
      setIsLoadingTier(false);
    }

    fetchCurrentTier();
  }, []);

  const paidPlans = useMemo(() => plans.filter((plan) => plan.tier !== "free"), []);

  async function startCheckout(tier: "plus" | "gold") {
    setError(null);
    setStatusByPlan((previous) => ({ ...previous, [tier]: "busy" }));

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
      setStatusByPlan((previous) => ({ ...previous, [tier]: "idle" }));
      return;
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.url) {
      setError(payload?.error ?? "Unable to start checkout. Please try again.");
      setStatusByPlan((previous) => ({ ...previous, [tier]: "idle" }));
      return;
    }

    window.location.assign(payload.url);
  }

  return (
    <section className="pricing-grid">
      {plans.map((plan) => (
        <article key={plan.tier} className={`pricing-card ${plan.tier === "gold" ? "pricing-card--highlight" : ""}`}>
          <header>
            <p className="pricing-card__tier">{plan.name}</p>
            <h2>{plan.monthlyPrice}</h2>
            <p>{plan.description}</p>
          </header>

          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          {(() => {
            const isCurrentPlan = !isLoadingTier && currentTier === plan.tier;
            const isLoggedIn = currentTier !== null;

            if (plan.tier === "free") {
              if (!isLoggedIn) {
                return (
                  <button className="btn btn--ghost" onClick={() => router.push("/login")}>
                    Log in
                  </button>
                );
              } else {
                return (
                  <button className="btn btn--ghost btn--disabled" disabled>
                    Current Plan
                  </button>
                );
              }
            } else {
              if (isCurrentPlan) {
                return (
                  <button className="btn btn--disabled" disabled>
                    Current Plan
                  </button>
                );
              } else {
                // Determine button text based on current tier and target tier
                const getButtonText = () => {
                  if (statusByPlan[plan.tier] === "busy") return "Redirecting...";
                  
                  if (!currentTier || currentTier === "free") {
                    return `Choose ${plan.name}`;
                  }
                  
                  // User has a paid plan
                  if (plan.tier === "free") {
                    return "Downgrade";
                  }
                  
                  // Comparing paid plans
                  const tierOrder: TierCode[] = ["free", "plus", "gold"];
                  const currentIndex = tierOrder.indexOf(currentTier);
                  const targetIndex = tierOrder.indexOf(plan.tier);
                  
                  if (targetIndex > currentIndex) {
                    return `Upgrade to ${plan.name}`;
                  } else {
                    return `Downgrade to ${plan.name}`;
                  }
                };

                return (
                  <button
                    className="btn"
                    onClick={() => startCheckout(plan.tier as "plus" | "gold")}
                    disabled={statusByPlan[plan.tier] === "busy"}
                  >
                    {getButtonText()}
                  </button>
                );
              }
            }
          })()}
        </article>
      ))}

      {paidPlans.length > 0 && error ? <p className="notice notice--error">{error}</p> : null}
    </section>
  );
}

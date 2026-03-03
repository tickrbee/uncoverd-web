"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { plans, type TierCode } from "@/lib/branding";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";

type CheckoutStatus = "idle" | "busy";

export function PricingCards() {
  const [error, setError] = useState<string | null>(null);
  const [statusByPlan, setStatusByPlan] = useState<Record<TierCode, CheckoutStatus>>({
    free: "idle",
    plus: "idle",
    gold: "idle",
  });
  const router = useRouter();

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

          {plan.tier === "free" ? (
            <button className="btn btn--ghost" onClick={() => router.push("/login")}>
              Log in
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => startCheckout(plan.tier as "plus" | "gold")}
              disabled={statusByPlan[plan.tier] === "busy"}
            >
              {statusByPlan[plan.tier] === "busy" ? "Redirecting..." : `Choose ${plan.name}`}
            </button>
          )}
        </article>
      ))}

      {paidPlans.length > 0 && error ? <p className="notice notice--error">{error}</p> : null}
    </section>
  );
}

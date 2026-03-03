export const APP_NAME = "uncoverd";

export const BILLING_PURPOSE_LINE =
  "uncoverd is a mobile investing app focused on risk clarity. Use this site for login, checkout, and billing.";

export type TierCode = "free" | "plus" | "gold";
export type PlanDisplay = "Free" | "Plus" | "Pro";

export const tierDisplayMap: Record<TierCode, PlanDisplay> = {
  free: "Free",
  plus: "Plus",
  gold: "Pro",
};

export type Plan = {
  tier: TierCode;
  name: PlanDisplay;
  monthlyPrice: string;
  description: string;
  features: string[];
};

export const plans: Plan[] = [
  {
    tier: "free",
    name: "Free",
    monthlyPrice: "EUR 0",
    description: "Secure account access for the mobile app.",
    features: ["Email and Google sign-in", "Plan and renewal visibility", "Upgrade anytime"],
  },
  {
    tier: "plus",
    name: "Plus",
    monthlyPrice: "EUR 14.99 / month",
    description: "Risk-focused subscription for daily decision support.",
    features: ["Decision assistant and impact preview", "Extra daily analysis pack", "Weekly risk check-in"],
  },
  {
    tier: "gold",
    name: "Pro",
    monthlyPrice: "EUR 24.99 / month",
    description: "Full subscription tier for advanced portfolio clarity.",
    features: ["Everything in Plus", "Advanced analytics", "Priority support"],
  },
];

export function toDisplayPlan(tier: TierCode | null | undefined): PlanDisplay {
  if (!tier) {
    return "Free";
  }

  return tierDisplayMap[tier] ?? "Free";
}

export const APP_NAME = "uncoverd";

export const BILLING_PURPOSE_LINE =
  "Use uncoverd web for subscription checkout and account billing. The product experience lives in the mobile app.";

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
    description: "Account access for the mobile app.",
    features: ["Email and Google sign-in", "Plan visibility", "Upgrade anytime"],
  },
  {
    tier: "plus",
    name: "Plus",
    monthlyPrice: "EUR 14.99 / month",
    description: "Paid subscription with expanded app access.",
    features: ["Everything in Free", "Expanded access", "Billing portal"],
  },
  {
    tier: "gold",
    name: "Pro",
    monthlyPrice: "EUR 24.99 / month",
    description: "Highest subscription tier for full app access.",
    features: ["Everything in Plus", "Highest tier access", "Priority support"],
  },
];

export function toDisplayPlan(tier: TierCode | null | undefined): PlanDisplay {
  if (!tier) {
    return "Free";
  }

  return tierDisplayMap[tier] ?? "Free";
}

export const APP_NAME = "uncoverd";

export const BILLING_PURPOSE_LINE =
  "The uncoverd web portal is for subscription checkout and account billing for the mobile app.";

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
    features: ["Email + Google sign-in", "Account and renewal visibility", "Upgrade at any time"],
  },
  {
    tier: "plus",
    name: "Plus",
    monthlyPrice: "EUR 14.99 / month",
    description: "Paid mobile app subscription with expanded access.",
    features: ["Everything in Free", "Expanded app access", "Self-serve billing portal"],
  },
  {
    tier: "gold",
    name: "Pro",
    monthlyPrice: "EUR 24.99 / month",
    description: "Highest subscription tier for maximum app access.",
    features: ["Everything in Plus", "Highest tier access", "Priority subscription support"],
  },
];

export function toDisplayPlan(tier: TierCode | null | undefined): PlanDisplay {
  if (!tier) {
    return "Free";
  }

  return tierDisplayMap[tier] ?? "Free";
}

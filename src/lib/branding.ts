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
    tier: "gold",
    name: "Pro",
    monthlyPrice: "EUR 24.99 / month",
    description: "Complete access with unlimited features and priority support.",
    features: [
      "Everything in Plus",
      "Unlimited swipes",
      "All top picks",
      "Priority functions",
      "Privileged access to new features",
      "More powerful models for AI analytics",
    ],
  },
  {
    tier: "plus",
    name: "Plus",
    monthlyPrice: "EUR 14.99 / month",
    description: "Enhanced experience with more swipes and AI-powered insights.",
    features: [
      "No ads",
      "Extra swipes",
      "More AI analysis",
      "Return button",
      "Watchlist analytics",
      "Increased portfolio size",
    ],
  },
  {
    tier: "free",
    name: "Free",
    monthlyPrice: "EUR 0",
    description: "Get started with basic access to the uncoverd app.",
    features: ["Regular ads", "Less AI insights", "Limited amount of swipes", "Limited portfolio"],
  },
];

export function toDisplayPlan(tier: TierCode | null | undefined): PlanDisplay {
  if (!tier) {
    return "Free";
  }

  return tierDisplayMap[tier] ?? "Free";
}

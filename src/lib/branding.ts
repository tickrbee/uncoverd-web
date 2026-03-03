export const APP_NAME = "uncoverd";

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
    description: "Get a feel for uncoverd with basic access and account sync.",
    features: ["Email + Google login", "Starter account profile", "Upgrade any time"],
  },
  {
    tier: "plus",
    name: "Plus",
    monthlyPrice: "EUR 14.99 / month",
    description: "For users who want deeper tracking and faster decisions.",
    features: ["Everything in Free", "Priority product updates", "Full subscription support"],
  },
  {
    tier: "gold",
    name: "Pro",
    monthlyPrice: "EUR 24.99 / month",
    description: "Advanced tier for serious workflows and premium support.",
    features: ["Everything in Plus", "Highest feature tier", "Faster support turnaround"],
  },
];

export function toDisplayPlan(tier: TierCode | null | undefined): PlanDisplay {
  if (!tier) {
    return "Free";
  }

  return tierDisplayMap[tier] ?? "Free";
}

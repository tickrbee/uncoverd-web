export const APP_NAME = "uncoverd";

export const BILLING_PURPOSE_LINE =
  "uncoverd is a dividend investing platform with screeners, research, and model portfolios.";

export type TierCode = "free" | "plus" | "gold";
export type PlanDisplay = "Free" | "Premium" | "Pro";

export const tierDisplayMap: Record<TierCode, PlanDisplay> = {
  free: "Free",
  plus: "Premium",
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
    monthlyPrice: "$199 / year",
    description: "For active investors who want the full uncoverd suite plus the AI mobile app.",
    features: [
      "Everything in Premium",
      "Unlimited mobile app swipes",
      "All top picks & AI insights",
      "Priority new features",
      "More powerful AI models",
      "Premium support",
    ],
  },
  {
    tier: "plus",
    name: "Premium",
    monthlyPrice: "$100 / year",
    description: "Full access to dividend research, model portfolios, screener, watchlist, and ad-free browsing.",
    features: [
      "All Model Portfolios (High Yield, Growth, Protection)",
      "Best Monthly Dividend & Best Sector lists",
      "Best Dividend Capture stocks",
      "Payout Estimator & Compounding Calculator",
      "Dividend Ratings on every stock",
      "CSV data downloads for spreadsheets",
      "Dividend Watchlist with alerts",
      "In-depth dividend news & research",
      "Upcoming increasers, decreasers, initiations & special payers",
      "No ads",
    ],
  },
  {
    tier: "free",
    name: "Free",
    monthlyPrice: "$0",
    description: "Get started with the basics.",
    features: [
      "Stock screener with basic filters",
      "Ex-dividend calendar",
      "Public dividend news feed",
      "Basic stock profiles &amp; dividend history",
    ],
  },
];

export function toDisplayPlan(tier: TierCode | null | undefined): PlanDisplay {
  if (!tier) {
    return "Free";
  }

  return tierDisplayMap[tier] ?? "Free";
}

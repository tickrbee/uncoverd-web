// Shared types between the universe API route (server) and the generator
// engine/UI (client). Keep this file free of runtime imports.

// Structured constraints the LLM goal-parser extracts from the free-text
// goal — machine-enforceable, unlike regex guessing.
export type ParsedGoal = {
  exclusions: string[];
  geographies: string[]; // "US" | "EUROPE" | "ASIA"
  sectorsAvoid: string[];
  sectorsBoost: string[];
  nameAvoid: string[]; // lowercase company-name keywords
  yieldFloorPct: number | null;
  riskHint: string | null;
  // "only stocks / no funds" — drops the bond + broad-ETF sleeves entirely.
  stocksOnly: boolean;
  // "small caps", "blue chips" … boosts/penalizes by USD market cap.
  capPreference: "small" | "mid" | "large" | null;
  // LLM-SELECTED tickers, chosen from the screened candidate dossiers the
  // client sends along — guaranteed members of the build (like anchors).
  picks: string[];
  summary: string;
};

export type GenInstrument = {
  tk: string;
  name: string;
  cls: "eq" | "bond" | "cash";
  kind: "broad" | "div" | "sector" | "stock" | "bond" | "cash";
  sector: string;
  // ISO country of the listing (stocks) — lets the engine honor geographic
  // goal language ("primarily European stocks").
  country?: string;
  // USD market cap (stocks; FX-normalized server-side) — powers cap-size
  // goal preferences ("only small caps").
  capUsd?: number;
  yield: number;
  beta: number;
  vol: number; // est. annual volatility %
  er: number; // est. annual return %
  q: number; // quality score 0-100
  rate: string; // letter grade
  etf: boolean;
  type: "etf" | "bond" | "cash" | "stock";
};

export type GenRisk = "conservative" | "balanced" | "aggressive";
export type GenObjective = "income" | "balanced" | "growth";
export type GenHorizon = "short" | "medium" | "long";

export type GenOptions = {
  amount: number;
  // Display currency code (USD/EUR/GBP/…). Formatting only — no FX conversion.
  currency: string;
  // Market focus: "GLOBAL" (no preference, default) or a comma-separated list
  // of up to 4 codes ("EU,CH,GB").
  country: string;
  // Re-roll seed: bumping it on Regenerate jitters the candidate scores
  // deterministically so the user gets a fresh-but-sensible build.
  seed: number;
  risk: GenRisk;
  objective: GenObjective;
  horizon: GenHorizon;
  sectors: string[];
  anchors: string[];
  count: number;
  goal: string;
  target: number;
  monthlyDCA: number;
  exclude?: string[];
  // Filled by the goal-parser edge function when the goal text is non-trivial.
  parsed?: ParsedGoal | null;
};

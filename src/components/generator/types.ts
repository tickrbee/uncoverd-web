// Shared types between the universe API route (server) and the generator
// engine/UI (client). Keep this file free of runtime imports.

export type GenInstrument = {
  tk: string;
  name: string;
  cls: "eq" | "bond" | "cash";
  kind: "broad" | "div" | "sector" | "stock" | "bond" | "cash";
  sector: string;
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
};

// Display currency for the Portfolio Generator. Pure formatting — amounts are
// whatever the user types in their own currency; we never convert.

export const GEN_CURRENCIES = [
  { code: "USD", sym: "$" },
  { code: "EUR", sym: "€" },
  { code: "GBP", sym: "£" },
  { code: "CHF", sym: "CHF " },
  { code: "CAD", sym: "C$" },
  { code: "AUD", sym: "A$" },
] as const;

export const curSym = (code: string) =>
  GEN_CURRENCIES.find((c) => c.code === code)?.sym ?? "$";

export const fmtCur = (n: number, sym: string) =>
  sym + Math.round(n).toLocaleString("en-US");

export const fmtCurShort = (n: number, sym: string) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return sign + sym + (a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return sign + sym + (a / 1e3).toFixed(0) + "k";
  return sign + sym + Math.round(a);
};

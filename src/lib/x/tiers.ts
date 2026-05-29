// Pure tier resolvers: turn raw numbers into the human phrases defined in
// docs/x-style-guide.md. Deterministic — no AI involvement, no I/O.
//
// All number formatting happens here. Composers in compose.ts call these
// to build tweet text. Any change to the voice (adjectives, thresholds,
// rounding) lives in this file and applies across every flow.

export function yieldPhrase(yieldPct: number | null): string | null {
  if (yieldPct == null || !isFinite(yieldPct) || yieldPct <= 0) return null;
  const y = yieldPct.toFixed(2);
  if (yieldPct < 1) return `a modest ${y}%`;
  if (yieldPct < 4.5) return `${y}%`;
  if (yieldPct < 7) return `a high ${y}%`;
  if (yieldPct < 10) return `an elevated ${y}%`;
  return `an outsized ${y}%`;
}

export function streakPhrase(years: number | null): string | null {
  if (years == null || years < 1) return null;
  if (years >= 50) return `${years} years of raises — Dividend King territory`;
  if (years >= 25) return `a ${years}-year Aristocrat streak`;
  if (years >= 10) return `${years} consecutive years of raises`;
  if (years >= 5) return `a ${years}-year streak of raises`;
  return `${years} years of raises so far`;
}

export function payoutPhrase(payoutPct: number | null, isReit: boolean): string | null {
  if (payoutPct == null || !isFinite(payoutPct) || payoutPct <= 0) return null;
  // REIT payout ratios are misleading (depreciation distorts GAAP earnings).
  // Style guide says omit. FFO coverage would belong here when available.
  if (isReit) return null;
  const p = Math.round(payoutPct);
  if (payoutPct < 30) return `Payout ratio is a comfortable ${p}%`;
  if (payoutPct < 60) return `Payout sits at ${p}%`;
  if (payoutPct < 80) return `Payout's running warm at ${p}%`;
  if (payoutPct < 100) return `Payout is stretched at ${p}%`;
  return `Payout's at ${p}% — covered by debt, not earnings`;
}

export function recoveryPhrase(days: number | null): string | null {
  if (days == null || days < 0) return null;
  const d = Math.round(days);
  if (d < 3) return `snaps back in ~${d} days`;
  if (d < 7) return `recovers in ~${d} days`;
  if (d < 14) return `takes ~${d} days to recover`;
  return `recoveries are slow (~${d} days)`;
}

// "2026-02-09" → "Feb 9"
export function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Dollar amounts: $1.24 for divs, $58B/$580M for market cap or AUM.
export function fmtUsd(amount: number | null, fractionDigits = 2): string | null {
  if (amount == null || !isFinite(amount)) return null;
  return `$${amount.toFixed(fractionDigits)}`;
}

export function fmtLargeUsd(amount: number | null): string | null {
  if (amount == null || !isFinite(amount) || amount <= 0) return null;
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  return `$${Math.round(amount).toLocaleString()}`;
}

// Stable per-symbol hash so the same ticker always gets the same template
// shape. Avoids tone drift for returning readers without storing per-symbol
// state. djb2 — boring and good enough.
export function shapeIndex(symbol: string, shapeCount: number): number {
  let h = 5381;
  for (const ch of symbol) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % shapeCount;
}

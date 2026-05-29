// Deterministic composers for every X publishing flow. Each function takes
// already-fetched data and returns a tweet body (or thread). No I/O, no
// network — that lives in candidates.ts (queries) and x-cli.ts (posting).
//
// Source of truth for tone + tier mappings: docs/x-style-guide.md. If you
// edit a phrase here, also update the style guide so the routine logs
// stay coherent.

import {
  yieldPhrase,
  streakPhrase,
  payoutPhrase,
  recoveryPhrase,
  shortDate,
  fmtUsd,
  fmtLargeUsd,
  shapeIndex,
  shortName,
} from "./tiers";

// Foreign-listing tickers contain a "." suffix (e.g. MDO.DE, BDX.WA). Pure
// US/UK primary tickers don't. Used to decide whether to append a company
// name for disambiguation.
function hasForeignSuffix(symbol: string): boolean {
  return symbol.includes(".");
}

// X allows 280 chars per tweet. t.co shortens URLs to 23 regardless of length.
const MAX_TWEET = 280;
const URL_LEN = 23;
const BODY_BUDGET = MAX_TWEET - URL_LEN - 1; // -1 for the newline

function joinSentences(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => !!p && p.length > 0).join(" ");
}

function stockUrl(symbol: string): string {
  return `uncoverd.org/stocks/${symbol}`;
}

function etfUrl(symbol: string): string {
  return `uncoverd.org/etfs/symbol/${symbol}`;
}

// Inputs for composeFeaturedStock — every field nullable so the composer
// can degrade gracefully when data is missing. Filling these is the
// candidates.ts job; here we assume the candidate already passed
// "good enough to post" gating.
export type FeaturedStockInput = {
  symbol: string;
  name: string | null;
  yieldPct: number | null;
  streakYears: number | null;
  payoutRatioPct: number | null;
  nextExDate: string | null;
  recoveryDays: number | null;
  isReit: boolean;
};

// Three template shapes. Per docs/x-style-guide.md they're picked by a
// stable per-symbol hash so the same ticker always reads the same.
export function composeFeaturedStock(s: FeaturedStockInput): string {
  const yp = yieldPhrase(s.yieldPct);
  const sp = streakPhrase(s.streakYears);
  const pp = payoutPhrase(s.payoutRatioPct, s.isReit);
  const ep = shortDate(s.nextExDate);
  const rp = recoveryPhrase(s.recoveryDays);

  // If we can't even quote the yield, there's no tweet to make.
  if (!yp) return "";

  // For foreign-suffix tickers (e.g. $MDO.DE), append a short company name so
  // readers know what they're looking at. Pure US/UK primary tickers stay
  // unannotated — the symbol is already self-explanatory.
  const tagged = hasForeignSuffix(s.symbol)
    ? `$${s.symbol}${shortName(s.name, 22) ? ` (${shortName(s.name, 22)})` : ""}`
    : `$${s.symbol}`;

  const shape = shapeIndex(s.symbol, 3);
  let body = "";

  if (shape === 0) {
    // Shape A — yield-first
    const opener = sp
      ? `${tagged} is paying ${yp} with ${sp}.`
      : `${tagged} is paying ${yp}.`;
    const middle =
      ep && rp ? `Next ex-div ${ep}; price ${rp}.` : ep ? `Next ex-div ${ep}.` : null;
    const tail = pp ? `${pp}.` : null;
    body = joinSentences([opener, middle, tail]);
  } else if (shape === 1) {
    // Shape B — streak-first
    const opener = sp
      ? `${tagged} has ${sp} and yields ${yp} today.`
      : `${tagged} yields ${yp}.`;
    const middle =
      ep && rp ? `Next ex-div ${ep}, ${rp}.` : ep ? `Next ex-div ${ep}.` : null;
    const tail = pp ? `${pp}.` : null;
    body = joinSentences([opener, middle, tail]);
  } else {
    // Shape C — compact data-forward
    const yPct = s.yieldPct != null ? `${s.yieldPct.toFixed(2)}%` : yp;
    const opener = sp ? `${tagged} · ${yPct}, ${sp}.` : `${tagged} · ${yPct}.`;
    const middle = ep && rp ? `Ex-div ${ep}, ${rp}.` : ep ? `Ex-div ${ep}.` : null;
    const tail = pp ? `${pp}.` : null;
    body = joinSentences([opener, middle, tail]);
  }

  body = trimToBudget(body);
  return `${body}\n${stockUrl(s.symbol)}`;
}

// Trim a body to fit the budget by dropping trailing sentences. Never
// truncates mid-word — style guide says "drop a sentence cleanly."
function trimToBudget(body: string): string {
  if (body.length <= BODY_BUDGET) return body;
  // Drop sentences (separated by ". ") from the end until we fit.
  const sentences = body.split(/\. /);
  while (sentences.length > 1) {
    sentences.pop();
    const candidate = sentences.join(". ") + ".";
    if (candidate.length <= BODY_BUDGET) return candidate;
  }
  // Pathological — single sentence over budget. Hard truncate at last space.
  const cut = body.lastIndexOf(" ", BODY_BUDGET - 1);
  return body.slice(0, cut > 0 ? cut : BODY_BUDGET - 1) + "…";
}

// --- ex-div-watch -----------------------------------------------------------

export type ExDivWatchRow = {
  symbol: string;
  name: string | null;
  exDate: string; // ISO
  yieldPct: number | null;
};

export function composeExDivWatch(rows: ExDivWatchRow[]): string {
  if (rows.length < 3) return "";
  const top = rows.slice(0, 3);
  // X self-serve tiers (Free/Basic/Pro) cap cashtags at 1 per tweet. Multi-
  // ticker posts use bare uppercase tickers (KEY, not $KEY) to stay under
  // the limit. Single-subject posts (featured-stock, payout-change) still
  // use the $ prefix because they only have one cashtag.
  const lines = top
    .map((r) => {
      const date = shortDate(r.exDate) ?? "—";
      const y = r.yieldPct != null ? `${r.yieldPct.toFixed(1)}% yield` : null;
      // Name shown for foreign-suffix tickers (e.g. BDX.WA · Budimex) so
      // readers don't confuse them with same-letter US names.
      const n = hasForeignSuffix(r.symbol) ? shortName(r.name, 18) : null;
      const head = n ? `${r.symbol} · ${n}` : r.symbol;
      return `· ${head} — ${date}${y ? ` · ${y}` : ""}`;
    })
    .join("\n");
  const body = `Ex-dividend dates this week worth watching:\n${lines}`;
  return `${body}\nuncoverd.org/calendar/ex-dividend`;
}

// --- payout-change ----------------------------------------------------------

export type PayoutChangeInput = {
  symbol: string;
  kind: "increasing" | "decreasing" | "initiating" | "suspending" | "special";
  newAmount: number | null;
  prevAmount: number | null;
  exDate: string | null;
  streakYearsAfter: number | null;
};

export function composePayoutChange(p: PayoutChangeInput): string {
  const date = shortDate(p.exDate) ?? "soon";
  const newAmt = fmtUsd(p.newAmount);
  const prevAmt = fmtUsd(p.prevAmount);

  let body = "";
  switch (p.kind) {
    case "increasing": {
      if (!newAmt || !prevAmt || !p.prevAmount) return "";
      const pct = Math.round(((p.newAmount! - p.prevAmount) / p.prevAmount) * 100);
      const streakTail = p.streakYearsAfter
        ? ` That's their ${ordinal(p.streakYearsAfter)} raise in a row.`
        : "";
      body = `$${p.symbol} just announced a ${pct}% dividend hike — new ${newAmt} quarterly, ex-div ${date}.${streakTail}`;
      break;
    }
    case "initiating": {
      if (!newAmt) return "";
      body = `$${p.symbol} is initiating a dividend: ${newAmt} per share, ex-div ${date}. First payout in the company's history.`;
      break;
    }
    case "special": {
      if (!newAmt) return "";
      body = `$${p.symbol} declared a special dividend of ${newAmt} per share, ex-div ${date}. Regular dividend unchanged.`;
      break;
    }
    case "decreasing": {
      if (!newAmt || !prevAmt || !p.prevAmount) return "";
      const pct = Math.round(((p.prevAmount - p.newAmount!) / p.prevAmount) * 100);
      body = `$${p.symbol} is cutting its dividend by ${pct}% — new ${newAmt} quarterly, down from ${prevAmt}. Ex-div ${date}.`;
      break;
    }
    case "suspending": {
      const prevTail = prevAmt ? ` Prior quarterly was ${prevAmt}.` : "";
      body = `$${p.symbol} is suspending its dividend, effective with the ${date} payment.${prevTail}`;
      break;
    }
  }
  if (!body) return "";
  body = trimToBudget(body);
  return `${body}\n${stockUrl(p.symbol)}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// --- featured-etf -----------------------------------------------------------

export type FeaturedEtfInput = {
  symbol: string;
  name: string | null;
  secYield30dPct: number | null;
  expenseRatioPct: number | null;
  aumUsd: number | null;
  topHoldingSymbol: string | null;
  nextExDate: string | null;
};

export function composeFeaturedEtf(e: FeaturedEtfInput): string {
  const tagged = hasForeignSuffix(e.symbol)
    ? `$${e.symbol}${shortName(e.name, 22) ? ` (${shortName(e.name, 22)})` : ""}`
    : `$${e.symbol}`;
  const parts: string[] = [tagged];
  if (e.secYield30dPct != null)
    parts.push(`30-day SEC yield ${e.secYield30dPct.toFixed(1)}%`);
  if (e.expenseRatioPct != null)
    parts.push(`expense ratio ${e.expenseRatioPct.toFixed(2)}%`);
  const aum = fmtLargeUsd(e.aumUsd);
  if (aum) parts.push(`${aum} in AUM`);
  if (parts.length < 2) return ""; // need at least one stat beyond the ticker
  const headline = parts.join(" · ") + ".";

  const tailBits: string[] = [];
  if (e.topHoldingSymbol) tailBits.push(`Top holding: $${e.topHoldingSymbol}`);
  const ed = shortDate(e.nextExDate);
  if (ed) tailBits.push(`Ex-div ${ed}`);
  const tail = tailBits.length ? `${tailBits.join(". ")}.` : null;

  const body = trimToBudget(joinSentences([headline, tail]));
  return `${body}\n${etfUrl(e.symbol)}`;
}

// --- weekly-hikes thread ----------------------------------------------------

export type WeeklyHikeRow = {
  symbol: string;
  newAmount: number;
  prevAmount: number;
  streakYearsAfter: number | null;
};

export function composeWeeklyHikes(rows: WeeklyHikeRow[]): string[] {
  const usable = rows.filter((r) => r.prevAmount > 0).slice(0, 5);
  if (usable.length < 3) return [];

  const head = `1/ This week's biggest dividend hikes:`;
  const body = usable.map((r, i) => {
    const pct = Math.round(((r.newAmount - r.prevAmount) / r.prevAmount) * 100);
    const streak = r.streakYearsAfter
      ? ` ${r.streakYearsAfter} consecutive years of raises.`
      : "";
    return `${i + 2}/ $${r.symbol} raised ${pct}% — new ${fmtUsd(r.newAmount)} quarterly.${streak}`;
  });
  const tail = `${usable.length + 2}/ Full payout-change tracker:\nuncoverd.org/payout-changes/increasing`;
  return [head, ...body, tail].map((t) => trimToBudget(t));
}

export function composeWeeklyCuts(rows: WeeklyHikeRow[]): string[] {
  const usable = rows.filter((r) => r.prevAmount > 0).slice(0, 5);
  if (usable.length < 2) return []; // silence ok per style guide

  const head = `1/ This week's biggest dividend cuts:`;
  const body = usable.map((r, i) => {
    const pct = Math.round(((r.prevAmount - r.newAmount) / r.prevAmount) * 100);
    return `${i + 2}/ $${r.symbol} cut ${pct}% — new ${fmtUsd(r.newAmount)} quarterly, down from ${fmtUsd(r.prevAmount)}.`;
  });
  const tail = `${usable.length + 2}/ Full cut tracker:\nuncoverd.org/payout-changes/decreasing`;
  return [head, ...body, tail].map((t) => trimToBudget(t));
}

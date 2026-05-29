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
// One hashtag for community discoverability — feed search hits this tag. We
// keep it to a single tag (multi-tag posts are flagged spammy by X's algo).
const HASHTAG = "#dividends";
const BODY_BUDGET = MAX_TWEET - URL_LEN - HASHTAG.length - 3; // -3 for newlines + space

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
  return `${body}\n\n${HASHTAG}\n${stockUrl(s.symbol)}`;
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
  return `${body}\n\n${HASHTAG}\nuncoverd.org/calendar/ex-dividend`;
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
  return `${body}\n\n${HASHTAG}\n${stockUrl(p.symbol)}`;
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

// Expense-ratio adjective. ETF audiences care a lot about this number,
// so we surface its tone alongside the figure.
function expensePhrase(pct: number | null): string | null {
  if (pct == null || !isFinite(pct)) return null;
  const v = pct.toFixed(2);
  if (pct < 0.1) return `a tight ${v}% expense ratio`;
  if (pct < 0.3) return `a ${v}% expense ratio`;
  if (pct < 0.6) return `a ${v}% expense ratio`;
  return `a steep ${v}% expense ratio`;
}

export function composeFeaturedEtf(e: FeaturedEtfInput): string {
  const tagged = hasForeignSuffix(e.symbol)
    ? `$${e.symbol}${shortName(e.name, 22) ? ` (${shortName(e.name, 22)})` : ""}`
    : `$${e.symbol}`;

  const yieldStr = e.secYield30dPct != null ? `${e.secYield30dPct.toFixed(1)}%` : null;
  const exp = expensePhrase(e.expenseRatioPct);
  const aum = fmtLargeUsd(e.aumUsd);
  // Bare ticker for top holding (no $) — second cashtag would trip the tier
  // limit. Falls back to silence if missing.
  const top = e.topHoldingSymbol;

  // Need at least yield + one other stat to make a sentence worth posting.
  if (!yieldStr && !aum && !exp) return "";

  // Three shapes, hashed by symbol so the same ETF always reads the same.
  const shape = shapeIndex(e.symbol, 3);
  let body = "";

  if (shape === 0) {
    // Shape A — yield-first
    const opener = yieldStr
      ? `${tagged} is yielding ${yieldStr}${exp ? ` with ${exp}` : ""}.`
      : `${tagged} runs ${exp ?? "with low costs"}.`;
    const middle = aum ? `${aum} in AUM.` : null;
    const tail = top ? `Top holding is ${top}.` : null;
    body = joinSentences([opener, middle, tail]);
  } else if (shape === 1) {
    // Shape B — scale-first
    const opener = aum && yieldStr
      ? `${tagged} holds ${aum} in AUM and yields ${yieldStr}.`
      : aum
        ? `${tagged} holds ${aum} in AUM.`
        : `${tagged} is yielding ${yieldStr}.`;
    const middle = exp ? `Expense ratio sits at ${e.expenseRatioPct!.toFixed(2)}%.` : null;
    const tail = top ? `Top holding: ${top}.` : null;
    body = joinSentences([opener, middle, tail]);
  } else {
    // Shape C — discovery-first (good for less-known ETFs)
    const opener = aum
      ? `${tagged} is a ${aum} fund${yieldStr ? ` yielding ${yieldStr}` : ""}.`
      : yieldStr
        ? `${tagged} is yielding ${yieldStr}.`
        : `${tagged} ${exp ?? "is a dividend ETF"}.`;
    const middle = exp && aum ? `${exp[0].toUpperCase()}${exp.slice(1)} keeps costs in check.` : null;
    const tail = top ? `Top holding is ${top}.` : null;
    body = joinSentences([opener, middle, tail]);
  }

  body = trimToBudget(body);
  // ETF posts get a second hashtag (#etf) — the dividend-ETF audience on X
  // searches both #dividends and #etf. 2 tags is fine; 3+ flags as spam.
  return `${body}\n\n${HASHTAG} #etf\n${etfUrl(e.symbol)}`;
}

// --- weekly-hikes single tweet ---------------------------------------------
// Originally a thread. Switched to single tweet because X's algorithm
// collapses repetitive numbered threads ("Show more replies" hiding
// 4 of 7 tweets, killing reach). Single substantive tweets perform
// better and stay above the algorithmic threshold.
//
// Multi-ticker => bare tickers (no $) to stay under the 1-cashtag tier limit.

export type WeeklyHikeRow = {
  symbol: string;
  newAmount: number;
  prevAmount: number;
  streakYearsAfter: number | null;
};

export function composeWeeklyHikes(rows: WeeklyHikeRow[]): string {
  const usable = rows.filter((r) => r.prevAmount > 0).slice(0, 4);
  if (usable.length < 3) return "";

  const lines = usable.map((r) => {
    const pct = Math.round(((r.newAmount - r.prevAmount) / r.prevAmount) * 100);
    const newAmt = fmtUsd(r.newAmount);
    const streak = r.streakYearsAfter && r.streakYearsAfter >= 5
      ? ` (${r.streakYearsAfter}-year streak)`
      : "";
    return `· ${r.symbol} raised ${pct}% to ${newAmt}${streak}`;
  });

  const body = `This week's biggest dividend hikes:\n${lines.join("\n")}`;
  return `${trimToBudget(body)}\n\n${HASHTAG}\nuncoverd.org/payout-changes/increasing`;
}

export function composeWeeklyCuts(rows: WeeklyHikeRow[]): string {
  const usable = rows.filter((r) => r.prevAmount > 0).slice(0, 4);
  if (usable.length < 2) return ""; // silence ok per style guide

  const lines = usable.map((r) => {
    const pct = Math.round(((r.prevAmount - r.newAmount) / r.prevAmount) * 100);
    const newAmt = fmtUsd(r.newAmount);
    const prevAmt = fmtUsd(r.prevAmount);
    return `· ${r.symbol} cut ${pct}% to ${newAmt} (from ${prevAmt})`;
  });

  const body = `This week's biggest dividend cuts:\n${lines.join("\n")}`;
  return `${trimToBudget(body)}\n\n${HASHTAG}\nuncoverd.org/payout-changes/decreasing`;
}

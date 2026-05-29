#!/usr/bin/env tsx
// X publishing CLI. Three subcommands the routine prompt drives:
//
//   npm run x:candidates -- --slot=<morning|midday|evening|monday|tuesday|wednesday|friday>
//     → JSON list of viable flows for this slot + their candidate previews
//
//   npm run x:compose -- --flow=<flow> [--symbol=SYM] [--dry]
//     → tweet body (or thread, comma-separated) to stdout
//
//   npm run x:post -- --flow=<flow> [--symbol=SYM] [--dry]
//     → composes + posts to X + logs to posted_tweets. With --dry, skips the
//       network call and only prints what would be posted.
//
// Every command exits 0 on success and 1 on error. Output is the only side
// effect except for `post`, which writes to X + the posted_tweets table.

import {
  composeFeaturedStock,
  composeFeaturedEtf,
  composeExDivWatch,
  composePayoutChange,
  composeWeeklyHikes,
  composeWeeklyCuts,
} from "../src/lib/x/compose";
import {
  buildFeaturedStockInput,
  pickFeaturedStock,
  pickFeaturedEtf,
  pickExDivWatchRows,
  pickRecentPayoutChange,
  pickWeeklyHikes,
  pickWeeklyCuts,
  logPostedTweet,
} from "../src/lib/x/candidates";

type Slot = "morning" | "midday" | "evening" | "monday" | "tuesday" | "wednesday" | "friday";
type Flow =
  | "featured-stock"
  | "featured-etf"
  | "ex-div-watch"
  | "payout-change"
  | "weekly-hikes"
  | "weekly-cuts";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) out[arg.slice(2)] = true;
    else out[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// candidates subcommand
// ---------------------------------------------------------------------------

const SLOT_FLOWS: Record<Slot, Flow[]> = {
  morning: ["ex-div-watch", "payout-change"],
  midday: ["featured-stock", "payout-change"],
  evening: ["featured-etf", "payout-change"],
  monday: ["featured-stock"],
  tuesday: [],
  wednesday: [],
  friday: ["weekly-hikes", "weekly-cuts"],
};

type CandidateReport = {
  flow: Flow;
  available: boolean;
  preview: string | null;
  symbol?: string | null;
  skip_reason?: string;
};

async function runCandidates(slot: Slot): Promise<CandidateReport[]> {
  const flows = SLOT_FLOWS[slot];
  if (!flows || flows.length === 0) {
    return [{ flow: "featured-stock", available: false, preview: null, skip_reason: `slot '${slot}' has no scheduled flows` }];
  }
  const reports: CandidateReport[] = [];
  for (const flow of flows) {
    reports.push(await previewFlow(flow));
  }
  return reports;
}

async function previewFlow(flow: Flow): Promise<CandidateReport> {
  try {
    switch (flow) {
      case "featured-stock": {
        const input = await pickFeaturedStock();
        if (!input) return { flow, available: false, preview: null, skip_reason: "no eligible stock" };
        const body = composeFeaturedStock(input);
        if (!body) return { flow, available: false, preview: null, skip_reason: "composer returned empty (missing yield)" };
        return { flow, available: true, preview: body, symbol: input.symbol };
      }
      case "featured-etf": {
        const input = await pickFeaturedEtf();
        if (!input) return { flow, available: false, preview: null, skip_reason: "no eligible ETF" };
        const body = composeFeaturedEtf(input);
        if (!body) return { flow, available: false, preview: null, skip_reason: "composer returned empty" };
        return { flow, available: true, preview: body, symbol: input.symbol };
      }
      case "ex-div-watch": {
        const rows = await pickExDivWatchRows();
        const body = composeExDivWatch(rows);
        if (!body) return { flow, available: false, preview: null, skip_reason: `only ${rows.length} eligible symbols (need 3)` };
        return { flow, available: true, preview: body, symbol: null };
      }
      case "payout-change": {
        const input = await pickRecentPayoutChange(14);
        if (!input) return { flow, available: false, preview: null, skip_reason: "no recent newsworthy event" };
        const body = composePayoutChange(input);
        if (!body) return { flow, available: false, preview: null, skip_reason: "composer returned empty" };
        return { flow, available: true, preview: body, symbol: input.symbol };
      }
      case "weekly-hikes": {
        const rows = await pickWeeklyHikes();
        const thread = composeWeeklyHikes(rows);
        if (thread.length === 0) return { flow, available: false, preview: null, skip_reason: `only ${rows.length} hikes this week (need 3)` };
        return { flow, available: true, preview: thread.join("\n---\n"), symbol: null };
      }
      case "weekly-cuts": {
        const rows = await pickWeeklyCuts();
        const thread = composeWeeklyCuts(rows);
        if (thread.length === 0) return { flow, available: false, preview: null, skip_reason: `only ${rows.length} cuts this week (need 2)` };
        return { flow, available: true, preview: thread.join("\n---\n"), symbol: null };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { flow, available: false, preview: null, skip_reason: `error: ${msg}` };
  }
}

// ---------------------------------------------------------------------------
// compose subcommand — single-flow composition. Symbol opt-in for one-off
// runs (e.g. testing a specific ticker).
// ---------------------------------------------------------------------------

async function runCompose(flow: Flow, symbol: string | null): Promise<{ body: string; thread?: string[]; symbol: string | null } | null> {
  switch (flow) {
    case "featured-stock": {
      const input = symbol
        ? await buildFeaturedStockInput(symbol)
        : await pickFeaturedStock();
      if (!input) return null;
      const body = composeFeaturedStock(input);
      if (!body) return null;
      return { body, symbol: input.symbol };
    }
    case "featured-etf": {
      // No --symbol override for ETFs; pick the next eligible.
      const input = await pickFeaturedEtf();
      if (!input) return null;
      const body = composeFeaturedEtf(input);
      if (!body) return null;
      return { body, symbol: input.symbol };
    }
    case "ex-div-watch": {
      const rows = await pickExDivWatchRows();
      const body = composeExDivWatch(rows);
      if (!body) return null;
      return { body, symbol: null };
    }
    case "payout-change": {
      const input = await pickRecentPayoutChange(14);
      if (!input) return null;
      const body = composePayoutChange(input);
      if (!body) return null;
      return { body, symbol: input.symbol };
    }
    case "weekly-hikes": {
      const rows = await pickWeeklyHikes();
      const thread = composeWeeklyHikes(rows);
      if (thread.length === 0) return null;
      return { body: thread[0], thread, symbol: null };
    }
    case "weekly-cuts": {
      const rows = await pickWeeklyCuts();
      const thread = composeWeeklyCuts(rows);
      if (thread.length === 0) return null;
      return { body: thread[0], thread, symbol: null };
    }
  }
}

// ---------------------------------------------------------------------------
// post subcommand — composes + posts. Uses twitter-api-v2.
// ---------------------------------------------------------------------------

async function runPost(flow: Flow, symbol: string | null, dry: boolean): Promise<void> {
  const composed = await runCompose(flow, symbol);
  if (!composed) {
    console.log(JSON.stringify({ flow, posted: false, skip_reason: "no candidate" }));
    return;
  }

  if (dry) {
    console.log(
      JSON.stringify(
        { flow, posted: false, dry: true, body: composed.body, thread: composed.thread },
        null,
        2,
      ),
    );
    return;
  }

  const { TwitterApi } = await import("twitter-api-v2");
  const client = new TwitterApi({
    appKey: requireEnv("X_API_KEY"),
    appSecret: requireEnv("X_API_SECRET"),
    accessToken: requireEnv("X_ACCESS_TOKEN"),
    accessSecret: requireEnv("X_ACCESS_SECRET"),
  });

  let tweetId: string;
  let threadIds: string[] | undefined;

  if (composed.thread && composed.thread.length > 1) {
    // twitter-api-v2 has a tweetThread() helper that chains replies for us.
    const posted = await client.v2.tweetThread(composed.thread);
    if (!posted.length) throw new Error("tweetThread returned empty result");
    threadIds = posted.map((p: { data: { id: string } }) => p.data.id);
    tweetId = threadIds![0];
  } else {
    const posted = await client.v2.tweet(composed.body);
    tweetId = posted.data.id;
  }

  await logPostedTweet({
    flow,
    symbol: composed.symbol ?? null,
    tweet_id: tweetId,
    body: composed.body,
    thread_tweet_ids: threadIds ?? null,
  });

  console.log(
    JSON.stringify({ flow, posted: true, tweet_id: tweetId, thread_tweet_ids: threadIds ?? null, symbol: composed.symbol }),
  );
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in environment`);
  return v;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const [, , subcommand, ...rest] = process.argv;
  const args = parseArgs(rest);

  if (!subcommand || !["candidates", "compose", "post"].includes(subcommand)) {
    console.error(
      "Usage:\n" +
        "  npm run x:candidates -- --slot=morning\n" +
        "  npm run x:compose -- --flow=featured-stock [--symbol=AAPL]\n" +
        "  npm run x:post -- --flow=featured-stock [--symbol=AAPL] [--dry]\n",
    );
    process.exit(1);
  }

  if (subcommand === "candidates") {
    const slot = args.slot as Slot | undefined;
    if (!slot) {
      console.error("Missing --slot");
      process.exit(1);
    }
    const report = await runCandidates(slot);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (subcommand === "compose") {
    const flow = args.flow as Flow | undefined;
    if (!flow) {
      console.error("Missing --flow");
      process.exit(1);
    }
    const symbol = typeof args.symbol === "string" ? args.symbol.toUpperCase() : null;
    const composed = await runCompose(flow, symbol);
    if (!composed) {
      console.log(JSON.stringify({ flow, available: false }));
      return;
    }
    console.log(
      JSON.stringify({ flow, available: true, symbol: composed.symbol, body: composed.body, thread: composed.thread ?? null }, null, 2),
    );
    return;
  }

  if (subcommand === "post") {
    const flow = args.flow as Flow | undefined;
    if (!flow) {
      console.error("Missing --flow");
      process.exit(1);
    }
    const symbol = typeof args.symbol === "string" ? args.symbol.toUpperCase() : null;
    const dry = args.dry === true;
    await runPost(flow, symbol, dry);
    return;
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`x-cli error: ${msg}`);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Auto-drafts a "top movers" blog post from the day's biggest gainers/losers in
 * OUR tracked universe (backend.tickers.change_percentage), with a dividend
 * lens, via OpenAI. Targets the keyword cluster "best performing stocks today /
 * top stock losers today / most active stocks".
 *
 * DRAFT-FOR-REVIEW: writes to content/drafts/<slug>.md, which the blog loader
 * does NOT scan (and which is gitignored). Nothing publishes until you review/
 * edit and MOVE the file into content/blog/en/ — see the printed instructions.
 *
 * Env is auto-loaded from .env.local then .env (same vars the app uses), so:
 *   pnpm movers:draft
 * Required: OPENAI_API_KEY + (SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL) +
 *           SUPABASE_SERVICE_ROLE_KEY.
 * Optional overrides: OPENAI_MODEL, MOVERS_COUNTRY (default US),
 *           MOVERS_MIN_PRICE (5), MOVERS_MIN_MKTCAP (1e9), MOVERS_COUNT (10).
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// --- env: load .env.local then .env (don't overwrite already-set vars) -------
function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadEnvFiles();

// Accept the common name variants (Next `NEXT_PUBLIC_`, Vite `VITE_`, bare).
function pickEnv(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const OPENAI_KEY = pickEnv(["OPENAI_API_KEY", "VITE_OPENAI_API_KEY", "OPENAI_KEY", "NEXT_PUBLIC_OPENAI_API_KEY"]);
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";
const SUPABASE_URL = pickEnv([
  "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL",
  "VITE_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL",
]);
const SUPABASE_KEY = pickEnv([
  "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY",
  "SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY",
]);

const COUNTRY = process.env.MOVERS_COUNTRY ?? "US";
const MIN_PRICE = Number(process.env.MOVERS_MIN_PRICE ?? 5);
const MIN_MKTCAP = Number(process.env.MOVERS_MIN_MKTCAP ?? 1_000_000_000);
const COUNT = Number(process.env.MOVERS_COUNT ?? 10);

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  const missing = [
    !OPENAI_KEY && "an OpenAI key",
    !SUPABASE_URL && "a Supabase URL",
    !SUPABASE_KEY && "a Supabase SERVICE-ROLE key",
  ].filter(Boolean).join(", ");
  // Print NAMES only (never values) of anything that looks related, so we can
  // map your actual variable names without you pasting secrets.
  const related = Object.keys(process.env).filter((k) => /supabase|openai|service|anon/i.test(k)).sort();
  console.error(`Missing ${missing}.`);
  console.error("Related env var NAMES I can see (values hidden): " + (related.join(", ") || "(none)"));
  console.error("Rename them to SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY in .env.local, or tell me the names above and I'll map them.");
  console.error("NOTE: this reads the `backend` schema, so it needs the SERVICE-ROLE key — the anon/publishable key won't work.");
  process.exit(1);
}

type Mover = { symbol: string; name: string; sector: string | null; price: number; changePct: number; lastDiv: number | null };

async function dbMovers(sb: SupabaseClient, dir: "desc" | "asc"): Promise<Mover[]> {
  const { data, error } = await sb
    .from("tickers")
    .select("symbol,name,sector,price,change_percentage,last_div,mkt_cap")
    .eq("is_actively_trading", true)
    .eq("is_etf", false)
    .eq("is_fund", false)
    .eq("country", COUNTRY)
    .gte("price", MIN_PRICE)
    .gte("mkt_cap", MIN_MKTCAP)
    .not("change_percentage", "is", null)
    .order("change_percentage", { ascending: dir === "asc" })
    .limit(40);
  if (error) {
    console.error("[dbMovers]", error.message);
    return [];
  }
  return ((data as Array<{ symbol: string; name: string | null; sector: string | null; price: number | null; change_percentage: number | null; last_div: number | null }>) ?? [])
    .map((r) => ({
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      sector: r.sector,
      price: Number(r.price ?? 0),
      changePct: Number(r.change_percentage ?? 0),
      lastDiv: r.last_div,
    }))
    // Drop obvious data glitches (a "+900%" is almost always a bad quote).
    .filter((m) => Number.isFinite(m.changePct) && Math.abs(m.changePct) <= 60)
    .slice(0, COUNT);
}

function moverLine(m: Mover, sign: string): string {
  const pays = m.lastDiv != null && m.lastDiv > 0 ? `pays a dividend (~$${m.lastDiv}/sh)` : "no dividend";
  const sector = m.sector ? `, ${m.sector}` : "";
  return `- ${m.symbol} (${m.name}${sector}): ${sign}${m.changePct.toFixed(2)}% to $${m.price.toFixed(2)} — ${pays}`;
}

const SYSTEM_PROMPT =
  "You are the editorial engine for uncoverd, a dividend-research site. You write accurate, lively financial-news posts in clear 8th-10th grade English, active voice, short paragraphs. You NEVER fabricate numbers — use only the data provided. You follow on-page SEO best practice and always tie the day's moves back to a dividend investor's perspective. No author byline. Output STRICT JSON only.";

async function openaiDraftJson(prompt: string): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = {
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  };
  const post = (body: Record<string, unknown>) =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify(body),
    });

  // Try with a custom temperature; some gpt-5.x / o-series models only allow
  // the default and 400 on a custom value — retry without it in that case.
  let res = await post({ ...base, temperature: 0.7 });
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 400 && /temperature/i.test(errText)) {
      res = await post(base);
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
    } else {
      throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 400)}`);
    }
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
}

function buildPrompt(gainers: Mover[], losers: Mover[], dateHuman: string): string {
  return `Write a daily stock-market "top movers" blog post for ${dateHuman}, covering stocks uncoverd tracks (mostly US, $1B+).

DATA — biggest gainers today:
${gainers.map((m) => moverLine(m, "+")).join("\n")}

DATA — biggest losers today:
${losers.map((m) => moverLine(m, "")).join("\n")}

Angle: a dividend investor's lens. Say what moved, and for the dividend payers note what a big swing means for yield (a falling price lifts yield but can flag risk; a spike compresses it). Do NOT invent specific catalysts/earnings you don't know — keep cause language general ("rallied", "sold off sharply") unless obvious.

SEO + structure:
- Target keywords: "best performing stocks today", "biggest stock gainers and losers", "top stock movers". Put the primary phrase in the first 100 words.
- H2/H3 sections (e.g. "Today's biggest gainers", "Today's biggest losers", "What it means for dividend investors", FAQ). NO H1 in the body (the title is the H1).
- 800-1200 words, short paragraphs, a markdown table for gainers and one for losers (Symbol, Company, Change, Price, Dividend?).
- 3-5 internal links with descriptive anchors to: /high-yield, /screener, /calendar/ex-dividend, /lists/potential-payers, /monthly.
- FAQ with 4-6 Q&As. No author byline.

Return STRICT JSON with EXACTLY these keys:
{
  "title": "55-60 char title, primary keyword near the start, include the date",
  "description": "150-160 char meta description with keyword + benefit",
  "slug": "short-hyphenated-lowercase-slug-with-date",
  "keywords": ["6-8 keyword phrases"],
  "definition": "1-2 sentence plain definition of 'stock market movers' for the callout box",
  "keyTakeaways": ["3-4 punchy takeaways grounded in the data above"],
  "faqs": [{"q":"...","a":"..."}],
  "body": "full markdown body, NO frontmatter, NO H1, start with the intro paragraph"
}`;
}

function asStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.map(String) : undefined;
}

async function main(): Promise<void> {
  const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "backend" as "public" },
  });

  console.log(`Fetching today's movers from our DB (country=${COUNTRY}, price≥$${MIN_PRICE}, mktcap≥$${(MIN_MKTCAP / 1e9).toFixed(1)}B)…`);
  const [gainers, losers] = await Promise.all([dbMovers(sb, "desc"), dbMovers(sb, "asc")]);
  if (gainers.length === 0 && losers.length === 0) {
    console.error("No movers returned — check change_percentage freshness or loosen MOVERS_* filters.");
    process.exit(1);
  }
  console.log(`  ${gainers.length} gainers, ${losers.length} losers.`);

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const dateHuman = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  console.log(`Drafting via OpenAI (${OPENAI_MODEL})…`);
  const draft = await openaiDraftJson(buildPrompt(gainers, losers, dateHuman));

  const rawSlug = (typeof draft.slug === "string" && draft.slug.trim()) || `stock-market-movers-${iso}`;
  const safeSlug = rawSlug.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").toLowerCase().slice(0, 70);

  const frontmatter: Record<string, unknown> = {
    title: draft.title ?? `Top Stock Movers — ${dateHuman}`,
    description: draft.description ?? "The biggest stock gainers and losers today, with a dividend-investor's take.",
    date: iso,
    updated: iso,
    keywords: asStringArray(draft.keywords) ?? ["best performing stocks today", "biggest stock movers", "top stock gainers", "stock losers today"],
    translationKey: safeSlug,
    cover: "https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg",
    coverAlt: "Stock market ticker board showing the day's biggest gainers and losers",
    definition: draft.definition ?? "Stock market movers are the day's biggest gainers and losers by percentage price change.",
    keyTakeaways: asStringArray(draft.keyTakeaways) ?? [],
    faqs: Array.isArray(draft.faqs) ? draft.faqs : [],
  };
  const body = typeof draft.body === "string" ? draft.body : "_(OpenAI returned no body — re-run.)_";
  const fileContent = matter.stringify(`\n${body}\n`, frontmatter);

  const draftsDir = path.join(process.cwd(), "content", "drafts");
  fs.mkdirSync(draftsDir, { recursive: true });
  const outPath = path.join(draftsDir, `${safeSlug}.md`);
  fs.writeFileSync(outPath, fileContent, "utf8");

  console.log(`\n✓ Draft written: content/drafts/${safeSlug}.md`);
  console.log("\nReview gate — nothing is live yet:");
  console.log(`  1. Review/edit content/drafts/${safeSlug}.md (sanity-check the numbers, swap the cover image).`);
  console.log(`  2. Publish: move it to content/blog/en/${safeSlug}.md`);
  console.log("  3. Translate (fr/de/it/es) with the same translationKey, then commit + push.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

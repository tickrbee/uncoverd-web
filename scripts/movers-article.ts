#!/usr/bin/env tsx
/**
 * Auto-drafts a "top movers" blog post from the day's biggest gainers/losers,
 * with an uncoverd dividend lens, via OpenAI. Targets the keyword cluster
 * "best performing stocks today / top stock losers today / most volatile
 * stocks / trending tickers".
 *
 * DRAFT-FOR-REVIEW: it writes to content/drafts/<slug>.md, which the blog loader
 * does NOT scan. Nothing publishes until you review/edit and MOVE the file into
 * content/blog/en/ (then translate + commit) — see the printed instructions.
 *
 * Run:
 *   FMP_API_KEY=... OPENAI_API_KEY=... \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm movers:draft
 *
 * The Supabase vars are optional — they only add the dividend lens (which
 * movers pay a dividend, their sector). Override the model with OPENAI_MODEL.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const FMP = "https://financialmodelingprep.com/stable";
const FMP_KEY = process.env.FMP_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FMP_KEY || !OPENAI_KEY) {
  console.error("Missing FMP_API_KEY and/or OPENAI_API_KEY (both required).");
  process.exit(1);
}

type Mover = { symbol: string; name: string; price: number; changePct: number };
type DivInfo = { name?: string; sector?: string | null; lastDiv?: number | null };

async function fmpMovers(kind: "biggest-gainers" | "biggest-losers"): Promise<Mover[]> {
  const res = await fetch(`${FMP}/${kind}?apikey=${FMP_KEY}`);
  if (!res.ok) {
    console.error(`FMP ${kind} failed: ${res.status}`);
    return [];
  }
  const raw = (await res.json()) as Array<{
    symbol: string;
    name?: string;
    price?: number;
    changesPercentage?: number | string;
  }>;
  return raw
    .map((r) => ({
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      price: Number(r.price ?? 0),
      changePct: Number(String(r.changesPercentage ?? 0).replace("%", "")),
    }))
    // Drop sub-$1 penny noise so the post is about investable names.
    .filter((m) => m.symbol && m.price >= 1 && Number.isFinite(m.changePct))
    .slice(0, 10);
}

// Optional: which movers pay a dividend (our angle), from backend.tickers.
async function dividendLens(symbols: string[]): Promise<Map<string, DivInfo>> {
  const out = new Map<string, DivInfo>();
  if (!SUPABASE_URL || !SUPABASE_KEY || symbols.length === 0) return out;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "backend" as "public" },
    });
    const { data } = await sb
      .from("tickers")
      .select("symbol,name,sector,last_div")
      .in("symbol", symbols);
    for (const r of (data as Array<{ symbol: string; name: string | null; sector: string | null; last_div: number | null }>) ?? []) {
      out.set(r.symbol, { name: r.name ?? undefined, sector: r.sector, lastDiv: r.last_div });
    }
  } catch (e) {
    console.warn("[dividendLens] skipped:", (e as Error).message);
  }
  return out;
}

function moverLine(m: Mover, sign: string, div: Map<string, DivInfo>): string {
  const d = div.get(m.symbol);
  const pays = d && d.lastDiv != null && d.lastDiv > 0 ? `pays a dividend (~$${d.lastDiv}/sh)` : "no dividend";
  const sector = d?.sector ? `, ${d.sector}` : "";
  return `- ${m.symbol} (${m.name}${sector}): ${sign}${m.changePct.toFixed(2)}% to $${m.price.toFixed(2)} — ${pays}`;
}

async function openaiDraftJson(prompt: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are the editorial engine for uncoverd, a dividend-research site. You write accurate, lively financial-news posts in clear 8th-10th grade English, active voice, short paragraphs. You NEVER fabricate numbers — use only the data provided. You follow on-page SEO best practice and always tie the day's moves back to a dividend-investor's perspective. No author byline. Output STRICT JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as Record<string, unknown>;
}

function buildPrompt(gainers: Mover[], losers: Mover[], div: Map<string, DivInfo>, dateHuman: string): string {
  return `Write a daily stock-market "top movers" blog post for ${dateHuman}.

DATA — biggest gainers today:
${gainers.map((m) => moverLine(m, "+", div)).join("\n")}

DATA — biggest losers today:
${losers.map((m) => moverLine(m, "", div)).join("\n")}

Angle: a dividend investor's lens. Explain what moved and (briefly, plausibly) why in general terms, then for the dividend payers note what a big swing means for yield (a falling price lifts yield but can flag risk; a spike compresses it). Be careful not to invent specific catalysts/earnings you don't know — keep cause language general ("rallied on momentum", "sold off sharply") unless it's obvious.

SEO + structure requirements:
- Target keywords: "best performing stocks today", "biggest stock gainers and losers", "top stock movers", "most active stocks". Put the primary phrase in the first 100 words and the H1.
- One H1 (as the title). Use H2/H3 for sections (e.g., "Today's biggest gainers", "Today's biggest losers", "What it means for dividend investors", FAQ).
- 800-1200 words, short paragraphs, a markdown table for gainers and one for losers (columns: Symbol, Company, Change, Price, Dividend?).
- 3-5 internal links using markdown to these uncoverd pages with descriptive anchors: /high-yield, /screener, /calendar/ex-dividend, /lists/potential-payers, /monthly.
- A FAQ with 4-6 Q&As.
- Do NOT include an author byline.

Return STRICT JSON with EXACTLY these keys:
{
  "title": "55-60 char title, primary keyword near the start, include the date",
  "description": "150-160 char meta description with keyword + benefit",
  "slug": "short-hyphenated-lowercase-slug-with-date",
  "keywords": ["6-8 keyword phrases"],
  "definition": "1-2 sentence plain definition of 'stock market movers' for the callout box",
  "keyTakeaways": ["3-4 punchy bullet takeaways grounded in the data above"],
  "faqs": [{"q":"...","a":"..."}],
  "body": "the full markdown body (NO frontmatter, NO H1 — the H1 comes from the title; start with the intro paragraph)"
}`;
}

function asStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.map(String) : undefined;
}

async function main(): Promise<void> {
  console.log("Fetching today's movers from FMP…");
  const [gainers, losers] = await Promise.all([fmpMovers("biggest-gainers"), fmpMovers("biggest-losers")]);
  if (gainers.length === 0 && losers.length === 0) {
    console.error("No movers returned (market closed or FMP error). Aborting.");
    process.exit(1);
  }
  const div = await dividendLens([...gainers, ...losers].map((m) => m.symbol));

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const dateHuman = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  console.log(`Drafting article via OpenAI (${OPENAI_MODEL})…`);
  const draft = await openaiDraftJson(buildPrompt(gainers, losers, div, dateHuman));

  const slug =
    (typeof draft.slug === "string" && draft.slug.trim()) ||
    `stock-market-movers-${iso}`;
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").toLowerCase().slice(0, 70);

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
  console.log("\nNext steps (this is the review gate — nothing is live yet):");
  console.log(`  1. Review/edit content/drafts/${safeSlug}.md (check the numbers + swap the cover image).`);
  console.log(`  2. To publish: move it to content/blog/en/${safeSlug}.md`);
  console.log("  3. Translate (fr/de/it/es) keeping the same translationKey, then commit + push.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

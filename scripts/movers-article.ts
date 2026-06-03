#!/usr/bin/env tsx
/**
 * Auto-drafts a "top movers" blog post in the style of a markets-news explainer:
 * the day's biggest movers among CREDIBLE, liquid US names, each with a deep
 * per-stock section grounded in that stock's actual recent news (the real
 * "why"), plus an uncoverd dividend-investor takeaway.
 *
 * DRAFT-FOR-REVIEW: writes to content/drafts/ (not scanned by the blog loader,
 * gitignored). Move into content/blog/en/ to publish.
 *
 * Env auto-loaded from .env.local then .env (Vite/Next name variants accepted).
 *   pnpm movers:draft
 * Required: OpenAI key + Supabase URL + SERVICE-ROLE key (reads `backend`).
 * Knobs (env): OPENAI_MODEL (gpt-5.2), MOVERS_COUNT (3),
 *   MOVERS_DIRECTION (gainers|losers|both, default gainers),
 *   MOVERS_MIN_PRICE (3), MOVERS_MIN_MKTCAP (5e8), MOVERS_MIN_VOLUME (2e5),
 *   MOVERS_COUNTRY (US), MOVERS_SEPARATE (set → one draft file per stock).
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadEnvFiles();

function pickEnv(names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const OPENAI_KEY = pickEnv(["OPENAI_API_KEY", "VITE_OPENAI_API_KEY", "OPENAI_KEY", "NEXT_PUBLIC_OPENAI_API_KEY"]);
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";
const SUPABASE_URL = pickEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "VITE_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL"]);
const SUPABASE_KEY = pickEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SECRET_KEY", "SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY"]);

const COUNT = Math.max(1, Number(process.env.MOVERS_COUNT ?? 3));
const DIRECTION = (process.env.MOVERS_DIRECTION ?? "gainers").toLowerCase(); // gainers|losers|both
const MIN_PRICE = Number(process.env.MOVERS_MIN_PRICE ?? 3);
const MIN_MKTCAP = Number(process.env.MOVERS_MIN_MKTCAP ?? 500_000_000);
const MIN_VOLUME = Number(process.env.MOVERS_MIN_VOLUME ?? 200_000);
const COUNTRY = process.env.MOVERS_COUNTRY ?? "US";
const SEPARATE = !!process.env.MOVERS_SEPARATE;

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  const missing = [!OPENAI_KEY && "an OpenAI key", !SUPABASE_URL && "a Supabase URL", !SUPABASE_KEY && "a Supabase SERVICE-ROLE key"].filter(Boolean).join(", ");
  const related = Object.keys(process.env).filter((k) => /supabase|openai|service|anon/i.test(k)).sort();
  console.error(`Missing ${missing}.`);
  console.error("Related env var NAMES I can see (values hidden): " + (related.join(", ") || "(none)"));
  console.error("Rename to SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY in .env.local, or tell me the names above.");
  console.error("NOTE: reads the `backend` schema → needs the SERVICE-ROLE key, not anon.");
  process.exit(1);
}

interface NewsItem { title: string; publisher: string | null; date: string; text: string | null }
interface Mover {
  symbol: string; name: string; exchange: string | null; sector: string | null;
  price: number; changePct: number; lastDiv: number | null; news: NewsItem[];
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Credible, liquid US names only — excludes OTC/foreign ADRs, preferreds and
// thin penny quotes that produced garbage "movers" before.
async function fetchCandidates(sb: SupabaseClient, ascending: boolean): Promise<Omit<Mover, "news">[]> {
  const { data, error } = await sb
    .from("tickers")
    .select("symbol,name,exchange_short,sector,price,change_percentage,volume,mkt_cap,last_div")
    .eq("is_actively_trading", true).eq("is_etf", false).eq("is_fund", false)
    .eq("country", COUNTRY)
    .in("exchange_short", ["NASDAQ", "NYSE", "AMEX"])
    .gte("price", MIN_PRICE).gte("mkt_cap", MIN_MKTCAP).gte("volume", MIN_VOLUME)
    .not("change_percentage", "is", null)
    .not("name", "ilike", "%pfd%").not("name", "ilike", "%preferred%").not("symbol", "like", "%-%")
    .order("change_percentage", { ascending })
    .limit(20);
  if (error) {
    console.error("[fetchCandidates]", error.message);
    return [];
  }
  return ((data as Array<Record<string, unknown>>) ?? [])
    .map((r) => ({
      symbol: String(r.symbol),
      name: (r.name as string) ?? String(r.symbol),
      exchange: (r.exchange_short as string) ?? null,
      sector: (r.sector as string) ?? null,
      price: Number(r.price ?? 0),
      changePct: Number(r.change_percentage ?? 0),
      lastDiv: r.last_div == null ? null : Number(r.last_div),
    }))
    .filter((m) => Number.isFinite(m.changePct) && Math.abs(m.changePct) <= 50);
}

async function fetchNews(sb: SupabaseClient, symbol: string): Promise<NewsItem[]> {
  const { data } = await sb
    .from("company_news")
    .select("title,publisher,published_date,text")
    .eq("symbol", symbol)
    .gte("published_date", isoDaysAgo(7))
    .order("published_date", { ascending: false })
    .limit(6);
  return ((data as Array<Record<string, unknown>>) ?? []).map((r) => ({
    title: String(r.title ?? ""),
    publisher: (r.publisher as string) ?? null,
    date: String(r.published_date ?? "").slice(0, 10),
    text: r.text ? String(r.text).slice(0, 700) : null,
  }));
}

function moverContext(m: Mover): string {
  const dir = m.changePct >= 0 ? "+" : "";
  const div = m.lastDiv != null && m.lastDiv > 0 ? `pays a dividend (~$${m.lastDiv}/sh)` : "pays no dividend";
  const head = `${m.symbol} — ${m.name} (${m.exchange ?? "US"}${m.sector ? `, ${m.sector}` : ""}): ${dir}${m.changePct.toFixed(2)}% to $${m.price.toFixed(2)}; ${div}.`;
  const news = m.news.length
    ? m.news.map((n, i) => `  [${i + 1}] ${n.date} ${n.publisher ? `(${n.publisher})` : ""}: ${n.title}${n.text ? ` — ${n.text}` : ""}`).join("\n")
    : "  (no recent company news found — treat the catalyst as unconfirmed.)";
  return `${head}\nRecent news:\n${news}`;
}

const SYSTEM_PROMPT =
  "You are a markets reporter for uncoverd, a dividend-research site. You write accurate, engaging stock-news explainers in clear, active prose — like a sharp financial journalist, not a listicle bot. CRITICAL: ground every factual claim (catalysts, numbers, names, filings) ONLY in the news snippets provided; if the news doesn't explain a move, say the catalyst is unconfirmed rather than inventing one. Use the exact price/percent figures given. Always close each stock with a brief dividend-investor angle. No author byline. Output STRICT JSON only.";

const SEO_AND_JSON = `
SEO + structure:
- One H1 (the title). H2 per stock ("Why <Company> (<EX>:<SYM>) <jumped/fell> N%"). Short paragraphs, active voice, 8th-10th grade.
- Internal links (markdown, descriptive anchors), 3-5 total across the post, to: /high-yield, /screener, /calendar/ex-dividend, /lists/potential-payers, /monthly.
- A short FAQ (3-5 Q&As). No author byline. No fabricated catalysts.

Return STRICT JSON with EXACTLY: {
  "title": "55-60 char, primary keyword near the start, include the date",
  "description": "150-160 char meta description",
  "slug": "short-hyphenated-lowercase-slug-with-date",
  "keywords": ["6-8 phrases"],
  "definition": "1-2 sentence callout definition",
  "keyTakeaways": ["3-4 takeaways grounded in the data/news above"],
  "faqs": [{"q":"...","a":"..."}],
  "body": "full markdown body, NO frontmatter, NO H1, start with a 2-3 sentence lede"
}`;

function combinedPrompt(movers: Mover[], dateHuman: string): string {
  return `Write a "top movers" markets explainer for ${dateHuman} covering the ${movers.length} biggest movers below. For EACH stock, write a meaty section (≈150-250 words) that leads with the move, then explains the WHY using its news snippets (cite the concrete details — figures, companies, filings, analyst actions), then a one-line dividend-investor takeaway. Lead the post with a 2-3 sentence overview. You may add a short "other movers to watch" line at the end if useful.

MOVERS:
${movers.map(moverContext).join("\n\n")}
${SEO_AND_JSON}`;
}

function singlePrompt(m: Mover, dateHuman: string): string {
  return `Write a single-stock markets explainer for ${dateHuman} about ${m.name} (${m.exchange ?? "US"}:${m.symbol}). Lead with the move, then explain the WHY using the news snippets (cite concrete details — figures, companies, filings, analyst actions), give context, and close with a dividend-investor takeaway. ≈500-800 words.

STOCK:
${moverContext(m)}
${SEO_AND_JSON}`;
}

async function openaiDraftJson(prompt: string): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = {
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
  };
  const post = (body: Record<string, unknown>) =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify(body),
    });
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

function asStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.map(String) : undefined;
}

function writeDraft(draft: Record<string, unknown>, iso: string, fallbackSlug: string, fallbackTitle: string): string {
  const rawSlug = (typeof draft.slug === "string" && draft.slug.trim()) || fallbackSlug;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").toLowerCase().slice(0, 70);
  const frontmatter: Record<string, unknown> = {
    title: draft.title ?? fallbackTitle,
    description: draft.description ?? "The day's biggest stock movers and why they moved, with a dividend-investor's take.",
    date: iso,
    updated: iso,
    keywords: asStringArray(draft.keywords) ?? ["best performing stocks today", "top stock movers", "biggest stock gainers"],
    translationKey: slug,
    cover: "https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg",
    coverAlt: "Stock market ticker board showing the day's biggest movers",
    definition: draft.definition ?? "Stock market movers are the stocks that rose or fell the most in a single trading session.",
    keyTakeaways: asStringArray(draft.keyTakeaways) ?? [],
    faqs: Array.isArray(draft.faqs) ? draft.faqs : [],
  };
  const body = typeof draft.body === "string" ? draft.body : "_(OpenAI returned no body — re-run.)_";
  const draftsDir = path.join(process.cwd(), "content", "drafts");
  fs.mkdirSync(draftsDir, { recursive: true });
  const outPath = path.join(draftsDir, `${slug}.md`);
  fs.writeFileSync(outPath, matter.stringify(`\n${body}\n`, frontmatter), "utf8");
  return `content/drafts/${slug}.md`;
}

async function main(): Promise<void> {
  const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "backend" as "public" },
  });

  console.log(`Selecting credible movers (${COUNTRY}, ${DIRECTION}, price≥$${MIN_PRICE}, mktcap≥$${(MIN_MKTCAP / 1e9).toFixed(2)}B, vol≥${MIN_VOLUME})…`);
  const pools: Omit<Mover, "news">[] = [];
  if (DIRECTION === "gainers" || DIRECTION === "both") pools.push(...(await fetchCandidates(sb, false)));
  if (DIRECTION === "losers" || DIRECTION === "both") pools.push(...(await fetchCandidates(sb, true)));
  // Dedupe + rank by absolute move.
  const seen = new Set<string>();
  const ranked = pools
    .filter((m) => (seen.has(m.symbol) ? false : (seen.add(m.symbol), true)))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // Prefer movers that have a real story (recent news). Walk the ranked list,
  // attach news, keep the first COUNT that have ≥1 article.
  const featured: Mover[] = [];
  const backups: Mover[] = [];
  for (const c of ranked) {
    if (featured.length >= COUNT) break;
    const news = await fetchNews(sb, c.symbol);
    const m: Mover = { ...c, news };
    if (news.length) featured.push(m);
    else if (backups.length < COUNT) backups.push(m);
  }
  // Top up with newsless movers only if we couldn't find enough with news.
  while (featured.length < COUNT && backups.length) featured.push(backups.shift()!);
  if (featured.length === 0) {
    console.error("No credible movers found — loosen MOVERS_* filters or check change_percentage freshness.");
    process.exit(1);
  }
  console.log(`Featuring: ${featured.map((m) => `${m.symbol} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(1)}% (${m.news.length} news)`).join(", ")}`);

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const dateHuman = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const written: string[] = [];
  if (SEPARATE) {
    for (const m of featured) {
      console.log(`Drafting ${m.symbol} via OpenAI (${OPENAI_MODEL})…`);
      const draft = await openaiDraftJson(singlePrompt(m, dateHuman));
      written.push(writeDraft(draft, iso, `${m.symbol.toLowerCase()}-stock-${iso}`, `Why ${m.name} moved — ${dateHuman}`));
    }
  } else {
    console.log(`Drafting combined top-${featured.length} article via OpenAI (${OPENAI_MODEL})…`);
    const draft = await openaiDraftJson(combinedPrompt(featured, dateHuman));
    written.push(writeDraft(draft, iso, `top-stock-movers-${iso}`, `Top Stock Movers — ${dateHuman}`));
  }

  console.log(`\n✓ Draft${written.length > 1 ? "s" : ""} written:`);
  for (const w of written) console.log(`  ${w}`);
  console.log("\nReview gate — nothing is live yet:");
  console.log("  1. Review/edit (sanity-check the moves + facts against the market, swap the cover image).");
  console.log("  2. Publish: move into content/blog/en/.");
  console.log("  3. Translate (fr/de/it/es) with the same translationKey, then commit + push.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

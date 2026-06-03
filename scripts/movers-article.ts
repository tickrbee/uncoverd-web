#!/usr/bin/env tsx
/**
 * Auto-drafts an analyst-style "movers" post: for each of the day's biggest
 * movers (credible, liquid US/European names) it produces a tight note —
 * (1) the move, (2) a news review of what's driving it, (3) a fundamentals read
 * using uncoverd's own rating + metrics, and (4) a VERDICT on whether the move
 * is justified. The additionality is the analysis + opinion, not a news rehash.
 *
 * DRAFT-FOR-REVIEW: writes to content/drafts/ (not scanned by the blog loader,
 * gitignored). Move into content/blog/en/ to publish.
 *
 * Env auto-loaded from .env.local then .env (Vite/Next name variants accepted).
 *   pnpm movers:draft
 * Required: OpenAI key + Supabase URL + SERVICE-ROLE key (reads `backend`).
 * Knobs (env): OPENAI_MODEL (gpt-5.2), MOVERS_COUNT (3),
 *   MOVERS_DIRECTION (gainers|losers|both, default gainers),
 *   MOVERS_REGION (us|europe|global, default us), MOVERS_EXCHANGES (csv override),
 *   MOVERS_COUNTRY (e.g. FR for a Paris-only piece; US region implies US),
 *   MOVERS_MIN_PRICE (3), MOVERS_MIN_MKTCAP (5e8), MOVERS_MIN_VOLUME (2e5),
 *   MOVERS_SEPARATE (set → one draft file per stock).
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
const SEPARATE = !!process.env.MOVERS_SEPARATE;

const US_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];
const EU_EXCHANGES = ["LSE", "XETRA", "PAR", "AMS", "MIL", "BME", "SIX", "STO", "OSL", "CPH", "HEL", "BRU", "VIE"];
const REGION = (process.env.MOVERS_REGION ?? "us").toLowerCase(); // us|europe|global
const EXCHANGES = process.env.MOVERS_EXCHANGES
  ? process.env.MOVERS_EXCHANGES.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
  : REGION === "europe" ? EU_EXCHANGES
  : REGION === "global" ? [...US_EXCHANGES, ...EU_EXCHANGES]
  : US_EXCHANGES;
const COUNTRY = process.env.MOVERS_COUNTRY ?? (REGION === "us" ? "US" : undefined);
const REGION_LABEL = REGION === "europe" ? "European" : REGION === "global" ? "US + European" : "US";

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
interface Rating { grade: string | null; total: number | null; value: number | null; growth: number | null; profit: number | null; momentum: number | null; health: number | null }
interface Candidate {
  symbol: string; name: string; exchange: string | null; sector: string | null;
  price: number; changePct: number; mktCap: number; lastDiv: number | null; currency: string | null;
  beta: number | null; range52w: string | null; ipoDate: string | null;
}
interface Mover extends Candidate { rating: Rating | null; news: NewsItem[] }

function money(price: number, cur: string | null): string {
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
  const s = sym[(cur ?? "USD").toUpperCase()];
  return s ? `${s}${price.toFixed(2)}` : `${price.toFixed(2)} ${cur ?? ""}`.trim();
}
function fmtCap(n: number, cur: string | null): string {
  const c = cur && cur.toUpperCase() !== "USD" ? ` ${cur}` : "";
  if (!n || n <= 0) return "n/a";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T${c}`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B${c}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M${c}`;
  return `${n}${c}`;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function fetchCandidates(sb: SupabaseClient, ascending: boolean): Promise<Candidate[]> {
  let q = sb
    .from("tickers")
    .select("symbol,name,exchange_short,sector,price,change_percentage,volume,mkt_cap,last_div,currency,beta,range,ipo_date")
    .eq("is_actively_trading", true).eq("is_etf", false).eq("is_fund", false)
    .in("exchange_short", EXCHANGES)
    .gte("price", MIN_PRICE).gte("mkt_cap", MIN_MKTCAP).gte("volume", MIN_VOLUME)
    .not("change_percentage", "is", null)
    .not("name", "ilike", "%pfd%").not("name", "ilike", "%preferred%").not("symbol", "like", "%-%");
  if (COUNTRY) q = q.eq("country", COUNTRY);
  const { data, error } = await q.order("change_percentage", { ascending }).limit(25);
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
      mktCap: Number(r.mkt_cap ?? 0),
      lastDiv: r.last_div == null ? null : Number(r.last_div),
      currency: (r.currency as string) ?? null,
      beta: r.beta == null ? null : Number(r.beta),
      range52w: (r.range as string) ?? null,
      ipoDate: (r.ipo_date as string) ?? null,
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

async function fetchRating(sb: SupabaseClient, symbol: string): Promise<Rating | null> {
  const { data } = await sb
    .from("stock_ratings_daily")
    .select("composite_grade,composite_total,value_score,growth_score,profit_score,momentum_score,health_score")
    .eq("symbol", symbol)
    .order("computed_date", { ascending: false })
    .limit(1);
  const r = (data as Array<Record<string, unknown>>)?.[0];
  if (!r) return null;
  return {
    grade: (r.composite_grade as string) ?? null,
    total: r.composite_total == null ? null : Number(r.composite_total),
    value: r.value_score == null ? null : Number(r.value_score),
    growth: r.growth_score == null ? null : Number(r.growth_score),
    profit: r.profit_score == null ? null : Number(r.profit_score),
    momentum: r.momentum_score == null ? null : Number(r.momentum_score),
    health: r.health_score == null ? null : Number(r.health_score),
  };
}

function ratingLine(r: Rating | null): string {
  if (!r || r.total == null) return "uncoverd rating: not rated.";
  const p = (n: number | null) => (n == null ? "?" : `${n}/5`);
  return `uncoverd rating: ${r.grade} (${r.total}/25) — Value ${p(r.value)}, Growth ${p(r.growth)}, Profitability ${p(r.profit)}, Health ${p(r.health)}, Momentum ${p(r.momentum)}. (Higher = better; Value high means cheap.)`;
}

function moverContext(m: Mover): string {
  const dir = m.changePct >= 0 ? "+" : "";
  const recentIpo = m.ipoDate && new Date(m.ipoDate) > new Date(isoDaysAgo(730)) ? ` Recently listed (IPO ${m.ipoDate}).` : "";
  const div = m.lastDiv != null && m.lastDiv > 0 ? `Pays a dividend (~${money(m.lastDiv, m.currency)}/sh).` : "Pays no dividend.";
  const facts = [
    `${m.symbol} — ${m.name} (${m.exchange ?? "US"}${m.sector ? `, ${m.sector}` : ""})`,
    `Move today: ${dir}${m.changePct.toFixed(2)}% to ${money(m.price, m.currency)}.`,
    `Market cap ~${fmtCap(m.mktCap, m.currency)}. 52-week range ${m.range52w ?? "n/a"}. Beta ${m.beta ?? "n/a"}. ${div}${recentIpo}`,
    ratingLine(m.rating),
  ].join("\n");
  const news = m.news.length
    ? m.news.map((n, i) => `  [${i + 1}] ${n.date} ${n.publisher ? `(${n.publisher})` : ""}: ${n.title}${n.text ? ` — ${n.text}` : ""}`).join("\n")
    : "  (no recent company news found — there is no clear catalyst; weigh that in the verdict.)";
  return `${facts}\nRecent news:\n${news}`;
}

const SYSTEM_PROMPT =
  "You are an equity analyst writing for uncoverd, a dividend & quality research site. For each stock you write a tight analyst note: (1) the move, (2) a NEWS REVIEW of what's driving it, (3) a FUNDAMENTALS read built on uncoverd's own rating (composite grade + Value/Growth/Profitability/Health/Momentum pillars, each 1-5) and the metrics provided, and (4) a clear VERDICT on whether the move looks justified — Overdone, Fair, or Underappreciated — with reasoning. Be opinionated but grounded: take catalysts ONLY from the provided news (if there is none, say so plainly and let that weigh on the verdict — an unexplained move is itself a yellow flag); interpret the fundamentals ONLY from the provided rating/metrics; use the exact figures given and never invent earnings, guidance, or price targets. Do NOT force a dividend angle — mention dividends only if the stock pays one and it's relevant. Plain, confident prose; no hedging filler, no author byline. Output STRICT JSON only.";

const SEO_AND_JSON = `
Structure + SEO:
- One H1 (the title). One H2 per stock: "Is <Company>'s N% move justified?". Inside, short labelled beats — the move, "What's driving it" (news), "The fundamentals" (interpret the rating pillars: cheap/expensive via Value, profitable, financially healthy via Health, growing, momentum), then a bold "Verdict: Overdone/Fair/Underappreciated —" line with 1-3 sentences of reasoning.
- Plain active prose, 8th-10th grade. 3-5 internal markdown links with descriptive anchors to: /high-yield, /screener, /calendar/ex-dividend, /lists/potential-payers, /monthly (use only where they fit).
- Short FAQ (3-5 Q&As). No author byline. No invented catalysts or numbers.

Return STRICT JSON with EXACTLY: {
  "title": "55-60 char, primary keyword near the start, include the date",
  "description": "150-160 char meta description",
  "slug": "short-hyphenated-lowercase-slug-with-date",
  "keywords": ["6-8 phrases"],
  "definition": "1-2 sentence callout definition",
  "keyTakeaways": ["3-4 verdict-style takeaways grounded in the data/news above"],
  "faqs": [{"q":"...","a":"..."}],
  "body": "full markdown body, NO frontmatter, NO H1, start with a 2-3 sentence lede"
}`;

const REGION_HINT = `These are ${REGION_LABEL} stocks. Use the currency symbols shown and reference relevant indices only where accurate (CAC 40, DAX, FTSE 100, IBEX, FTSE MIB for Europe; S&P 500 / Nasdaq for the US).`;

function combinedPrompt(movers: Mover[], dateHuman: string): string {
  return `Write an analyst "are these moves justified?" piece for ${dateHuman} on the ${movers.length} biggest ${REGION_LABEL} movers below. ${REGION_HINT} Give each stock a section of ≈220-320 words following the structure. Open the post with a 2-3 sentence lede on the day's action.

STOCKS:
${movers.map(moverContext).join("\n\n")}
${SEO_AND_JSON}`;
}

function singlePrompt(m: Mover, dateHuman: string): string {
  return `Write a single-stock analyst note for ${dateHuman}: is ${m.name} (${m.exchange ?? "US"}:${m.symbol})'s move justified? ${REGION_HINT} Follow the structure (move → news review → fundamentals read on the uncoverd rating → verdict with reasoning). ≈600-900 words.

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
    description: draft.description ?? "An analyst read on the day's biggest movers — and whether each move is justified.",
    date: iso,
    updated: iso,
    keywords: asStringArray(draft.keywords) ?? ["best performing stocks today", "top stock movers", "is the move justified"],
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

  console.log(`Selecting credible movers (region=${REGION}${COUNTRY ? `/${COUNTRY}` : ""}, ${DIRECTION}, exch=${EXCHANGES.join("/")}, price≥${MIN_PRICE}, mktcap≥$${(MIN_MKTCAP / 1e9).toFixed(2)}B, vol≥${MIN_VOLUME})…`);
  const pools: Candidate[] = [];
  if (DIRECTION === "gainers" || DIRECTION === "both") pools.push(...(await fetchCandidates(sb, false)));
  if (DIRECTION === "losers" || DIRECTION === "both") pools.push(...(await fetchCandidates(sb, true)));
  const seen = new Set<string>();
  const ranked = pools
    .filter((m) => (seen.has(m.symbol) ? false : (seen.add(m.symbol), true)))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // Prefer movers that have a real story; analysis + verdict still add value
  // without news, so newsless movers are a fallback rather than excluded.
  const featured: Mover[] = [];
  const backups: Mover[] = [];
  for (const c of ranked) {
    if (featured.length >= COUNT) break;
    const news = await fetchNews(sb, c.symbol);
    if (news.length) featured.push({ ...c, news, rating: await fetchRating(sb, c.symbol) });
    else if (backups.length < COUNT) backups.push({ ...c, news, rating: null });
  }
  while (featured.length < COUNT && backups.length) {
    const b = backups.shift()!;
    b.rating = await fetchRating(sb, b.symbol);
    featured.push(b);
  }
  if (featured.length === 0) {
    console.error("No credible movers found — loosen MOVERS_* filters or check change_percentage freshness.");
    process.exit(1);
  }
  console.log(`Featuring: ${featured.map((m) => `${m.symbol} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(1)}% [${m.rating?.grade ?? "NR"}, ${m.news.length} news]`).join(", ")}`);

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const dateHuman = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const written: string[] = [];
  if (SEPARATE) {
    for (const m of featured) {
      console.log(`Drafting ${m.symbol} via OpenAI (${OPENAI_MODEL})…`);
      const draft = await openaiDraftJson(singlePrompt(m, dateHuman));
      written.push(writeDraft(draft, iso, `${m.symbol.toLowerCase()}-move-justified-${iso}`, `Is ${m.name}'s move justified? — ${dateHuman}`));
    }
  } else {
    console.log(`Drafting combined top-${featured.length} analysis via OpenAI (${OPENAI_MODEL})…`);
    const draft = await openaiDraftJson(combinedPrompt(featured, dateHuman));
    written.push(writeDraft(draft, iso, `top-movers-justified-${iso}`, `Top Movers — Justified or Not? — ${dateHuman}`));
  }

  console.log(`\n✓ Draft${written.length > 1 ? "s" : ""} written:`);
  for (const w of written) console.log(`  ${w}`);
  console.log("\nReview gate — nothing is live yet:");
  console.log("  1. Review/edit (sanity-check the moves + facts, swap the cover image).");
  console.log("  2. Publish: move into content/blog/en/.");
  console.log("  3. Translate (fr/de/it/es) with the same translationKey, then commit + push.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

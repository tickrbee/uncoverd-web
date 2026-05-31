import { NextResponse } from "next/server";
import { GLOSSARY } from "@/lib/glossary";
import { DIRECTORY_BUCKETS } from "@/lib/directory";
import { getAllPosts } from "@/lib/content";
import { ALL_LOCALES, localePrefix } from "@/lib/i18n";

// Custom sitemap.xml route. We bypass Next.js's built-in sitemap generator
// because it's not escaping `&` in URL fields — every `/compare?a=X&b=Y`
// entry was emitted as raw `&`, producing XML that fails Google's parser
// at the first ampersand ("EntityRef: expecting ';'").
//
// Building the XML ourselves gives us full control over escaping and lets
// us be defensive about every value that goes between <loc> tags.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://uncoverd.org";

// XML-escape only the chars that break sitemap parsing inside <loc>.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Entry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function renderEntry(e: Entry): string {
  const lines = [
    `  <url>`,
    `    <loc>${xmlEscape(e.loc)}</loc>`,
  ];
  if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
  if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
  if (e.priority != null) lines.push(`    <priority>${e.priority.toFixed(2)}</priority>`);
  lines.push(`  </url>`);
  return lines.join("\n");
}

// Same curated lists as before — kept inline rather than dotted around.
const PICKS = [
  "best-dividend-stocks",
  "best-high-yield",
  "best-dividend-growth",
  "best-dividend-protection",
  "best-monthly-dividend",
  "dividend-capture",
];
const SECTORS = [
  "financials", "real-estate", "communications", "consumer-discretionary",
  "consumer-staples", "energy", "health-care", "industrials", "technology",
  "materials", "utilities",
];
const INDUSTRIES = [
  "reit", "mlp", "bdc", "clean-energy", "uranium", "lithium", "precious-metals",
  "water", "natural-resources", "energy-infrastructure", "semiconductors",
  "software", "ecommerce", "transportation", "autos", "airlines", "shipping",
  "cruise-lines", "hotels", "retail", "iron-steel", "chemicals", "pharma",
  "insurance", "aerospace-defense",
];
const GROWERS = ["aristocrats", "kings", "champions", "contenders", "challengers", "achievers"];
const ALTERNATIVES_SEED_SYMBOLS = [
  "SCHD", "VYM", "DGRO", "VIG", "HDV", "DIVO", "JEPI", "JEPQ",
  "SPYD", "NOBL", "SDY", "DVY", "DGRW", "VOO", "VTI",
  "JNJ", "KO", "PG", "PEP", "MMM", "JPM", "XOM", "CVX",
  "T", "VZ", "MO", "PM", "O", "STAG", "MAIN", "ARCC",
  "ABBV", "PFE", "MRK", "WMT", "HD", "MCD", "NEE", "DUK",
];
const COMPARE_ETF_UNIVERSE = [
  "SCHD", "VYM", "DGRO", "VIG", "HDV", "DIVO", "JEPI", "JEPQ",
  "SPYD", "NOBL", "SDY", "DVY", "DGRW", "IDV", "DLN", "FDVV",
  "DIV", "DON", "DIA", "VOO", "VTI", "PEY", "RDVY", "QYLD",
];
const COMPARE_STOCK_PAIRS: [string, string][] = [
  ["KO", "PEP"], ["JNJ", "PFE"], ["MMM", "EMR"], ["XOM", "CVX"], ["VZ", "T"],
  ["MO", "PM"], ["MCD", "SBUX"], ["JPM", "BAC"], ["O", "STAG"], ["O", "WPC"],
  ["MAIN", "ARCC"], ["JNJ", "ABBV"], ["JNJ", "MRK"], ["WMT", "TGT"],
  ["HD", "LOW"], ["PG", "CL"], ["KMB", "PG"], ["DUK", "SO"], ["NEE", "DUK"],
];

export async function GET(): Promise<NextResponse> {
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  const entries: Entry[] = [];

  // Static pages
  const staticUrls: { path: string; freq: Entry["changefreq"]; pri: number }[] = [
    { path: "", freq: "weekly", pri: 1 },
    { path: "/screener", freq: "daily", pri: 0.95 },
    { path: "/screener?type=etfs", freq: "daily", pri: 0.9 },
    { path: "/calendar/ex-dividend?range=week", freq: "daily", pri: 0.9 },
    { path: "/calendar/ex-dividend?range=month", freq: "daily", pri: 0.85 },
    { path: "/calendar/declaration?range=month", freq: "daily", pri: 0.8 },
    { path: "/high-yield", freq: "daily", pri: 0.9 },
    { path: "/monthly", freq: "weekly", pri: 0.85 },
    { path: "/news", freq: "hourly", pri: 0.85 },
    { path: "/methodology", freq: "monthly", pri: 0.6 },
    { path: "/pricing", freq: "monthly", pri: 0.9 },
    { path: "/contact", freq: "yearly", pri: 0.4 },
    { path: "/legal/privacy", freq: "yearly", pri: 0.3 },
    { path: "/legal/terms", freq: "yearly", pri: 0.3 },
    { path: "/legal/disclaimer", freq: "yearly", pri: 0.4 },
    { path: "/about", freq: "monthly", pri: 0.5 },
    { path: "/etfs/which-owns", freq: "weekly", pri: 0.85 },
    { path: "/etfs/top-held", freq: "weekly", pri: 0.85 },
    { path: "/lists/potential-payers", freq: "weekly", pri: 0.85 },
    { path: "/compare", freq: "monthly", pri: 0.85 },
    { path: "/alternatives", freq: "monthly", pri: 0.85 },
    { path: `/best-dividend-stocks/${year}`, freq: "weekly", pri: 0.9 },
    { path: `/best-dividend-stocks/${year + 1}`, freq: "weekly", pri: 0.85 },
    { path: "/glossary", freq: "monthly", pri: 0.7 },
    { path: "/stocks", freq: "weekly", pri: 0.7 },
    { path: "/etfs", freq: "weekly", pri: 0.7 },
  ];
  for (const u of staticUrls) {
    entries.push({ loc: `${BASE}${u.path}`, lastmod: now, changefreq: u.freq, priority: u.pri });
  }

  // A–Z directory browse pages — the crawl path that gives every ticker
  // detail page an internal inlink (de-orphans the ~9.7k ticker pages).
  for (const b of DIRECTORY_BUCKETS) {
    const letter = b.toLowerCase();
    entries.push({ loc: `${BASE}/stocks/browse/${letter}`, lastmod: now, changefreq: "weekly", priority: 0.6 });
    entries.push({ loc: `${BASE}/etfs/browse/${letter}`, lastmod: now, changefreq: "weekly", priority: 0.6 });
  }

  // Localized service pages (functional landing pages targeting the foreign
  // calendar keywords).
  const localeHubs = ["/fr", "/de", "/it", "/es"];
  for (const p of localeHubs) {
    entries.push({ loc: `${BASE}${p}`, lastmod: now, changefreq: "weekly", priority: 0.7 });
  }
  const servicePages = [
    "/fr/calendrier-dividendes",
    "/de/dividendenkalender",
    "/it/calendario-dividendi",
    "/es/proximos-dividendos",
    "/fr/meilleures-actions-dividende",
    "/de/beste-dividenden-aktien",
    "/it/migliori-azioni-dividendi",
    "/es/mejores-acciones-dividendos",
  ];
  for (const p of servicePages) {
    entries.push({ loc: `${BASE}${p}`, lastmod: now, changefreq: "daily", priority: 0.8 });
  }

  // Blog: index + every post, per locale (only locales that actually have
  // posts, so we don't list empty/noindex indexes).
  for (const loc of ALL_LOCALES) {
    const posts = getAllPosts(loc);
    if (posts.length === 0) continue;
    const prefix = localePrefix(loc);
    entries.push({ loc: `${BASE}${prefix}/blog`, lastmod: now, changefreq: "weekly", priority: 0.7 });
    for (const post of posts) {
      entries.push({
        loc: `${BASE}${prefix}/blog/${post.slug}`,
        lastmod: post.updated ?? post.date ?? now,
        changefreq: "monthly",
        priority: 0.65,
      });
    }
  }

  for (const g of GLOSSARY) {
    entries.push({ loc: `${BASE}/glossary/${g.slug}`, lastmod: now, changefreq: "monthly", priority: 0.6 });
  }

  for (const p of PICKS) {
    entries.push({ loc: `${BASE}/picks/${p}`, lastmod: now, changefreq: "weekly", priority: 0.8 });
  }
  for (const s of SECTORS) {
    entries.push({ loc: `${BASE}/sectors/${s}`, lastmod: now, changefreq: "weekly", priority: 0.75 });
  }
  for (const i of INDUSTRIES) {
    entries.push({ loc: `${BASE}/industries/${i}`, lastmod: now, changefreq: "weekly", priority: 0.7 });
  }
  for (const g of GROWERS) {
    entries.push({ loc: `${BASE}/growers/${g}`, lastmod: now, changefreq: "weekly", priority: 0.75 });
  }

  // ETF compare pairs (all-pairs of the curated universe). xmlEscape on the
  // loc will turn `&` into `&amp;` — the whole reason this file exists.
  for (let i = 0; i < COMPARE_ETF_UNIVERSE.length; i++) {
    for (let j = i + 1; j < COMPARE_ETF_UNIVERSE.length; j++) {
      entries.push({
        loc: `${BASE}/compare?a=${COMPARE_ETF_UNIVERSE[i]}&b=${COMPARE_ETF_UNIVERSE[j]}`,
        lastmod: now,
        changefreq: "weekly",
        priority: 0.7,
      });
    }
  }
  for (const [a, b] of COMPARE_STOCK_PAIRS) {
    entries.push({
      loc: `${BASE}/compare?a=${a}&b=${b}`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.75,
    });
  }
  for (const sym of ALTERNATIVES_SEED_SYMBOLS) {
    entries.push({
      loc: `${BASE}/alternatives/${sym}`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.7,
    });
  }

  // Active dividend payers — bulk ticker pages. Filter to safe-shape
  // symbols so a weird character doesn't poison the output.
  try {
    const { getBackendClient } = await import("@/lib/supabase/admin");
    const sb = getBackendClient();
    const { data: stocks } = await sb
      .from("tickers")
      .select("symbol,is_etf,is_fund,updated_at")
      .eq("is_actively_trading", true)
      .gt("mkt_cap", 100_000_000)
      .order("mkt_cap", { ascending: false, nullsFirst: false })
      .limit(45000);

    const SAFE_SYMBOL = /^[A-Za-z0-9.\-]{1,12}$/;
    type R = { symbol: string; is_etf: boolean | null; is_fund: boolean | null; updated_at: string | null };
    for (const r of (stocks as R[] | null) ?? []) {
      if (!r.symbol || !SAFE_SYMBOL.test(r.symbol)) continue;
      const path = r.is_etf || r.is_fund
        ? `/etfs/symbol/${r.symbol}`
        : `/stocks/${r.symbol}`;
      entries.push({
        loc: `${BASE}${path}`,
        lastmod: r.updated_at ?? now,
        changefreq: "daily",
        priority: 0.6,
      });
    }
  } catch {
    // DB unreachable: ship the curated sitemap anyway.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderEntry).join("\n")}
</urlset>
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache at the edge for 1h; the ticker set rarely changes within an hour.
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

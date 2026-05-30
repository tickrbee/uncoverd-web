import type { MetadataRoute } from "next";
import { GLOSSARY } from "@/lib/glossary";

const BASE = "https://uncoverd.org";

// Static + curated URLs. Per-ticker pages are added programmatically below from
// the active dividend payers in backend.tickers. The 50K-URL limit per file
// is enforced by Next.js; we cap the ticker fan-out.
const STATIC_URLS: MetadataRoute.Sitemap = [
  { url: BASE, changeFrequency: "weekly", priority: 1 },
  { url: `${BASE}/screener`, changeFrequency: "daily", priority: 0.95 },
  { url: `${BASE}/screener?type=etfs`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE}/calendar/ex-dividend?range=week`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE}/calendar/ex-dividend?range=month`, changeFrequency: "daily", priority: 0.85 },
  { url: `${BASE}/calendar/declaration?range=month`, changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE}/high-yield`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE}/monthly`, changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE}/news`, changeFrequency: "hourly", priority: 0.85 },
  { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/pricing`, changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.4 },
  { url: `${BASE}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE}/legal/disclaimer`, changeFrequency: "yearly", priority: 0.4 },
  { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/etfs/which-owns`, changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE}/etfs/top-held`, changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE}/lists/potential-payers`, changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE}/compare`, changeFrequency: "monthly", priority: 0.85 },
  { url: `${BASE}/alternatives`, changeFrequency: "monthly", priority: 0.85 },
  { url: `${BASE}/best-dividend-stocks/${new Date().getFullYear()}`, changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE}/best-dividend-stocks/${new Date().getFullYear() + 1}`, changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE}/glossary`, changeFrequency: "monthly", priority: 0.7 },
  ...GLOSSARY.map((e) => ({
    url: `${BASE}/glossary/${e.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  })),
];

const PICKS = [
  "best-dividend-stocks",
  "best-high-yield",
  "best-dividend-growth",
  "best-dividend-protection",
  "best-monthly-dividend",
  "dividend-capture",
];

const SECTORS = [
  "financials",
  "real-estate",
  "communications",
  "consumer-discretionary",
  "consumer-staples",
  "energy",
  "health-care",
  "industrials",
  "technology",
  "materials",
  "utilities",
];

const INDUSTRIES = [
  "reit",
  "mlp",
  "bdc",
  "clean-energy",
  "uranium",
  "lithium",
  "precious-metals",
  "water",
  "natural-resources",
  "energy-infrastructure",
  "semiconductors",
  "software",
  "ecommerce",
  "transportation",
  "autos",
  "airlines",
  "shipping",
  "cruise-lines",
  "hotels",
  "retail",
  "iron-steel",
  "chemicals",
  "pharma",
  "insurance",
  "aerospace-defense",
];

const GROWERS = ["aristocrats", "kings", "champions", "contenders", "challengers", "achievers"];

// Seed tickers for /alternatives/{sym}. Picked for high search volume of
// "alternatives to {sym}". Mixed stocks + ETFs.
const ALTERNATIVES_SEED_SYMBOLS = [
  // ETFs
  "SCHD", "VYM", "DGRO", "VIG", "HDV", "DIVO", "JEPI", "JEPQ",
  "SPYD", "NOBL", "SDY", "DVY", "DGRW", "VOO", "VTI",
  // Stocks
  "JNJ", "KO", "PG", "PEP", "MMM", "JPM", "XOM", "CVX",
  "T", "VZ", "MO", "PM", "O", "STAG", "MAIN", "ARCC",
  "ABBV", "PFE", "MRK", "WMT", "HD", "MCD", "NEE", "DUK",
];

// All-pairs combinations of these ETFs are emitted as /compare?a=X&b=Y
// sitemap entries below. Each pair is a real long-tail search ("SCHD vs
// VYM", "JEPI vs JEPQ", etc.) — Google's "compare ETFs" intent classifier
// surfaces them when ranked. Keep this list curated to popular dividend
// ETFs, not random tickers, so the indexed URLs are high-quality.
const COMPARE_ETF_UNIVERSE = [
  "SCHD", "VYM", "DGRO", "VIG", "HDV", "DIVO", "JEPI", "JEPQ",
  "SPYD", "NOBL", "SDY", "DVY", "DGRW", "IDV", "DLN", "FDVV",
  "DIV", "DON", "DIA", "VOO", "VTI", "PEY", "RDVY", "QYLD",
];

// Stock head-to-heads people search for. These are well-known dividend
// pairs that get real long-tail traffic ("KO vs PEP dividend", etc.).
const COMPARE_STOCK_PAIRS: [string, string][] = [
  ["KO", "PEP"],
  ["JNJ", "PFE"],
  ["MMM", "EMR"],
  ["XOM", "CVX"],
  ["VZ", "T"],
  ["MO", "PM"],
  ["MCD", "SBUX"],
  ["JPM", "BAC"],
  ["O", "STAG"],
  ["O", "WPC"],
  ["MAIN", "ARCC"],
  ["JNJ", "ABBV"],
  ["JNJ", "MRK"],
  ["WMT", "TGT"],
  ["HD", "LOW"],
  ["PG", "CL"],
  ["KMB", "PG"],
  ["DUK", "SO"],
  ["NEE", "DUK"],
];

function etfComparePairUrls(now: Date): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (let i = 0; i < COMPARE_ETF_UNIVERSE.length; i++) {
    for (let j = i + 1; j < COMPARE_ETF_UNIVERSE.length; j++) {
      out.push({
        url: `${BASE}/compare?a=${COMPARE_ETF_UNIVERSE[i]}&b=${COMPARE_ETF_UNIVERSE[j]}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const curatedUrls: MetadataRoute.Sitemap = [
    ...STATIC_URLS.map((e) => ({ ...e, lastModified: now })),
    ...PICKS.map((slug) => ({
      url: `${BASE}/picks/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...SECTORS.map((slug) => ({
      url: `${BASE}/sectors/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...INDUSTRIES.map((slug) => ({
      url: `${BASE}/industries/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...GROWERS.map((slug) => ({
      url: `${BASE}/growers/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    // ETF compare pairs — all-pairs of the curated universe.
    ...etfComparePairUrls(now),
    // Stock compare head-to-heads.
    ...COMPARE_STOCK_PAIRS.map(([a, b]) => ({
      url: `${BASE}/compare?a=${a}&b=${b}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    // /alternatives/{symbol} for the popular tickers — "alternatives to SCHD",
    // "alternatives to JNJ" etc. are real search queries with high intent.
    ...ALTERNATIVES_SEED_SYMBOLS.map((sym) => ({
      url: `${BASE}/alternatives/${sym}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  // Pull top US dividend payers + ETFs to surface their detail pages for SEO.
  // Cap at ~10K total to stay within Google's 50K-URL guidance per sitemap.
  let tickerUrls: MetadataRoute.Sitemap = [];
  try {
    const { getBackendClient } = await import("@/lib/supabase/admin");
    const sb = getBackendClient();
    const { data: stocks } = await sb
      .from("tickers")
      .select("symbol,is_etf,is_fund,updated_at")
      .eq("is_actively_trading", true)
      .gt("mkt_cap", 100_000_000)
      .order("mkt_cap", { ascending: false, nullsFirst: false })
      // Bumped from 8K to 45K — DB has 53K active tickers >$100M and we
      // were leaving most of them unindexed. Stays under Google's 50K-per-
      // sitemap-file hard limit with a buffer for curated URLs above.
      .limit(45000);
    type R = { symbol: string; is_etf: boolean | null; is_fund: boolean | null; updated_at: string | null };
    // Some tickers in the DB contain characters that produce invalid sitemap
    // entries — whitespace, control chars, ^, &, < etc. Filter to safe
    // ticker shapes: letters/digits + a few common separators (.-/). Also
    // URL-encode just in case anything unusual sneaks through.
    const SAFE_SYMBOL = /^[A-Za-z0-9.\-]{1,12}$/;
    tickerUrls = (stocks as R[] | null ?? [])
      .filter((r) => r.symbol && SAFE_SYMBOL.test(r.symbol))
      .map((r) => ({
        url:
          r.is_etf || r.is_fund
            ? `${BASE}/etfs/symbol/${encodeURIComponent(r.symbol)}`
            : `${BASE}/stocks/${encodeURIComponent(r.symbol)}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "daily" as const,
        priority: 0.6,
      }));
  } catch {
    // If the DB is unreachable at build time we still ship the curated sitemap.
  }

  return [...curatedUrls, ...tickerUrls];
}

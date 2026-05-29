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
      .limit(8000);
    type R = { symbol: string; is_etf: boolean | null; is_fund: boolean | null; updated_at: string | null };
    tickerUrls = (stocks as R[] | null ?? []).map((r) => ({
      url:
        r.is_etf || r.is_fund
          ? `${BASE}/etfs/symbol/${r.symbol}`
          : `${BASE}/stocks/${r.symbol}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    // If the DB is unreachable at build time we still ship the curated sitemap.
  }

  return [...curatedUrls, ...tickerUrls];
}

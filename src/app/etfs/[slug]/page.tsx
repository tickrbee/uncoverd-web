import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import { Pager } from "@/components/pager";
import { listEtfsByCategory, type StockRow } from "@/lib/data";
import { getPremiumStatus } from "@/lib/premium";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const VALID_VIEWS: ColumnView[] = [
  "overview",
  "payout",
  "growth",
  "returns",
  "ratings",
  "buy-reco",
  "upside",
];

const ETF_CATEGORIES: Record<
  string,
  {
    label: string;
    description: string;
    nameContains?: string[];
    fund?: boolean;
    active?: boolean;
  }
> = {
  dividend: {
    label: "Dividend ETFs",
    description: "ETFs focused on dividend-paying stocks.",
    nameContains: ["Dividend", "High Yield", "Income", "DGRO", "Aristocrat"],
  },
  active: {
    label: "Dividend Active ETFs",
    description: "Actively managed dividend ETFs.",
    active: true,
  },
  funds: {
    label: "Dividend Funds",
    description: "Mutual funds and closed-end funds focused on dividend income.",
    fund: true,
    nameContains: ["Dividend", "Income", "Utility"],
  },
  preferred: {
    label: "Preferred Shares ETFs",
    description: "ETFs focused on preferred stocks for high income.",
    nameContains: ["Preferred"],
  },
  adr: {
    label: "Foreign (ADR) Dividends",
    description: "American Depositary Receipts paying foreign dividends.",
    nameContains: ["International", "Foreign", "Emerging", "ADR", "ex-US", "Global"],
  },
};

export async function generateStaticParams() {
  return Object.keys(ETF_CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = ETF_CATEGORIES[slug];
  if (!c) return { title: "Dividend ETFs" };
  return { title: c.label, description: c.description };
}

export default async function ETFsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = ETF_CATEGORIES[slug];
  if (!c) notFound();
  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Pull a wide pool, filter by name keywords, then paginate the result.
  let allRows: StockRow[] = [];
  try {
    if (c.nameContains && c.nameContains.length > 0) {
      // Run one query per keyword and union the results; dedupe by symbol
      const seen = new Set<string>();
      for (const kw of c.nameContains) {
        const chunk = await listEtfsByCategory({
          active: c.active,
          fund: c.fund,
          categoryContains: kw,
          limit: 200,
        });
        for (const r of chunk) {
          if (!seen.has(r.symbol)) {
            seen.add(r.symbol);
            allRows.push(r);
          }
        }
      }
    } else {
      allRows = await listEtfsByCategory({
        active: c.active,
        fund: c.fund,
        limit: 500,
      });
    }
  } catch (e) {
    console.error(e);
  }
  allRows.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));

  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = allRows.slice(offset, offset + PAGE_SIZE);

  const premium = await getPremiumStatus();
  const activeType: SecurityType =
    slug === "dividend" ? "etfs" : slug === "active" ? "active-etfs" : slug === "funds" ? "funds" : "etfs";

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="ETFs & Funds" title={c.label} description={c.description} />
        <ColumnTabs active={view} baseHref={`/etfs/${slug}`} />
        <ListingToolbar
          active={activeType}
          rows={rows}
          isPremium={premium.isPremium}
          csvFilename={`uncoverd-etfs-${slug}.csv`}
        />
        {rows.length === 0 ? (
          <div className="dv-empty">
            No matching ETFs found. The daily refresh will continue populating ETF data — check back tomorrow.
          </div>
        ) : (
          <>
            <DividendTable rows={rows} isPremium={premium.isPremium} view={view} />
            <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Page {page} of {totalPages} · {total.toLocaleString()} {c.label.toLowerCase()}
            </p>
            <Pager
              page={page}
              totalPages={totalPages}
              baseHref={`/etfs/${slug}${view !== "overview" ? `?view=${view}` : ""}`}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

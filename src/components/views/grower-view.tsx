import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar } from "@/components/listing-toolbar";
import { Pager } from "@/components/pager";
import {
  type GrowerSlug,
  type StockRow,
} from "@/lib/data";
import { cachedListGrowersWithStocks as listGrowersWithStocks } from "@/lib/cached-data";
import { GROWERS, GROWER_YEARS, growerUrl } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { growerHeader, pageSummary } from "@/lib/ui-i18n";

const PAGE_SIZE = 30;
const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

export type GrowerSearch = { view?: string; page?: string };

// Shared, locale-aware dividend-grower listing — identical to the English
// /growers/[slug] page, only translated.
export async function GrowerView({
  locale,
  slug, // canonical English grower key (e.g. "aristocrats")
  sp,
}: {
  locale: Locale;
  slug: string;
  sp: GrowerSearch;
}) {
  const taxo = GROWERS.find((g) => g.key === slug);
  if (!taxo) notFound();
  const label = locale === "en" ? taxo.label.en : taxo.label[locale];
  const years = GROWER_YEARS[slug] ?? "25+";
  const basePath = growerUrl(locale, taxo);
  const header = growerHeader(locale, label, years);

  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  let allRows: StockRow[] = [];
  try {
    allRows = await listGrowersWithStocks(slug as GrowerSlug);
  } catch (e) {
    console.error(e);
  }
  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const rows = allRows.slice(offset, offset + PAGE_SIZE);

  // Free/gated render — no server auth read; paying users get ratings/extras
  // revealed client-side via <DividendTable revealPremium>.
  const safeRows = rows;

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
        <ColumnTabs active={view} baseHref={basePath} />
        <ListingToolbar
          active="stocks"
          rows={safeRows}
          csvFilename={`uncoverd-${slug}.csv`}
          hideSecurityType
        />
        {safeRows.length === 0 ? (
          <div className="dv-empty">List is being assembled. Check back soon.</div>
        ) : (
          <>
            <DividendTable rows={safeRows} isPremium={false} revealPremium view={view} />
            <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {pageSummary(locale, page, totalPages, total)}
            </p>
            <Pager
              page={page}
              totalPages={totalPages}
              baseHref={`${basePath}${view !== "overview" ? `?view=${view}` : ""}`}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

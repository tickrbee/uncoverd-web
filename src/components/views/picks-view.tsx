import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { PageHeader } from "@/components/page-header";
import { DividendTable, ColumnTabs, type ColumnView } from "@/components/dividend-table";
import { ListingToolbar, type SecurityType } from "@/components/listing-toolbar";
import { redactRowsForFree, type StockRow } from "@/lib/data";
import { PICKS, buildPickRows } from "@/lib/picks";
import { PICKS as PICKS_TAXO, pickUrl } from "@/lib/i18n-taxonomy";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { tHeader } from "@/lib/page-header-i18n";
import { picksNote } from "@/lib/ui-i18n";

// Re-exported so the EN + localized /picks/[slug] pages can read pick metadata.
export { PICKS } from "@/lib/picks";

const VALID_VIEWS: ColumnView[] = ["overview", "payout", "growth", "returns", "ratings"];

// Shared, locale-aware model-portfolio page. EN /picks/[slug] + localized
// /<locale>/<picksPath>/[slug] both render this. `slug` is the English key.
export async function PicksView({
  locale,
  slug,
  sp,
}: {
  locale: Locale;
  slug: string;
  sp: { view?: string; type?: string };
}) {
  const pick = PICKS[slug];
  if (!pick) notFound();
  const taxo = PICKS_TAXO.find((p) => p.key === slug);
  const basePath = taxo ? pickUrl(locale, taxo) : `/picks/${slug}`;
  const title = locale === "en" ? pick.label : taxo?.label[locale] ?? pick.label;
  const eyebrow = tHeader("Model Portfolio", locale)!;
  const description = tHeader(pick.description, locale)!;
  const note = picksNote(locale);

  const view: ColumnView = sp.view && VALID_VIEWS.includes(sp.view as ColumnView) ? (sp.view as ColumnView) : "overview";
  const type: SecurityType =
    sp.type === "etfs" || sp.type === "active-etfs" || sp.type === "funds" ? "etfs" : "stocks";

  // Model Portfolios are Premium. Render the identity-scrubbed free version with
  // NO server auth read (so the page stays CDN-cacheable + fast); paying users
  // reveal the real rows + ratings client-side via the rows endpoint.
  let realRows: StockRow[] = [];
  try {
    realRows = await buildPickRows(slug, type);
  } catch (e) {
    console.error(e);
  }
  const rows = redactRowsForFree(realRows, false);
  const revealEndpoint = `/api/picks/premium?list=pick&slug=${encodeURIComponent(slug)}&type=${type}`;

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow={eyebrow} title={title} description={description} />
        <ColumnTabs active={view} baseHref={basePath} />
        <ListingToolbar
          active={type}
          rows={rows}
          csvFilename={`uncoverd-${slug}-${type}.csv`}
          revealRowsEndpoint={revealEndpoint}
        />
        <DividendTable
          rows={rows}
          isPremium={false}
          revealPremium
          revealRowsEndpoint={revealEndpoint}
          view={view}
        />
        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {note.base}
          {pick.premium && note.premiumSuffix}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

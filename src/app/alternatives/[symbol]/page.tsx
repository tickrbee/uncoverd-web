import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShareButton } from "@/components/share-button";
import { CompareSearch } from "../../compare/compare-search";
import { getStock } from "@/lib/data";
import {
  findStockAlternatives,
  findEtfAlternatives,
  STOCK_AXES,
  ETF_AXES,
  type StockAlternative,
  type EtfAlternative,
} from "@/lib/alternatives";
import { formatCurrency, formatPercent } from "@/lib/format";
import { APP_NAME } from "@/lib/branding";

// Alternatives tool: enter a ticker, get the top peer per axis (higher
// yield, better rating, cheaper valuation, stronger balance sheet, better
// performance — and for ETFs: higher yield, cheaper expense ratio, larger
// AUM, alt strategy). High-intent SEO target ("alternatives to SCHD",
// "alternatives to JNJ").
//
// Framing is strictly data-driven. We say "Higher yield (4.2% vs 3.1%)",
// never "better investment". The user decides what to act on.

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { symbol: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const p = await params;
  const symbol = p.symbol.toUpperCase();
  // Pull the company name so the title is "Alternatives to AAPL · Apple Inc."
  // instead of bare ticker — front-loads the high-volume "alternatives to X"
  // query AND adds the natural-language name that ranks for branded searches.
  const base = await getStock(symbol).catch(() => null);
  const namePart = base?.name ? ` · ${base.name}` : "";
  const titlePrefix = `Alternatives to ${symbol}${namePart}`;
  const description = base?.name
    ? `Find similar dividend stocks and ETFs to ${base.name} (${symbol}). Compare yield, rating, valuation, balance sheet and 1-year return side-by-side. Data-driven peer analysis from ${APP_NAME}.`
    : `Find similar dividend stocks and ETFs to ${symbol}. Compare yield, rating, valuation, balance sheet and 1-year return side-by-side. Data-driven peer analysis from ${APP_NAME}.`;
  return {
    title: titlePrefix,
    description,
    keywords: [
      `alternatives to ${symbol}`,
      `${symbol} alternative`,
      `${symbol} alternatives`,
      `stocks similar to ${symbol}`,
      `similar to ${symbol}`,
      `${symbol} competitors`,
      `${symbol} comparison`,
      `${symbol} peers`,
      `${symbol} vs`,
      ...(base?.name ? [`${base.name} alternatives`, `${base.name} similar stocks`] : []),
    ],
    alternates: { canonical: `/alternatives/${symbol}` },
    openGraph: {
      title: `${titlePrefix} | ${APP_NAME}`,
      description,
      type: "website",
      url: `https://uncoverd.org/alternatives/${symbol}`,
      siteName: APP_NAME,
      images: [
        {
          url: `/api/og/compare?a=${encodeURIComponent(symbol)}`,
          width: 1200,
          height: 630,
          alt: `Alternatives to ${symbol}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix,
      description,
      images: [`/api/og/compare?a=${encodeURIComponent(symbol)}`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function AlternativesPage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const symbol = p.symbol.toUpperCase();
  const base = await getStock(symbol);
  if (!base) notFound();

  const isEtf = base.is_etf === true || base.is_fund === true;
  const stockReport = !isEtf ? await findStockAlternatives(symbol) : null;
  const etfReport = isEtf ? await findEtfAlternatives(symbol) : null;

  const targetName = base.name;
  const targetKind = isEtf ? "ETF" : "stock";

  // Structured data — BreadcrumbList helps Google render a breadcrumb in the
  // search result snippet. ItemList captures the alternative tickers so
  // Google sees this as a curated peer list rather than a single article.
  const altSymbols = [
    ...(stockReport?.alternatives.map((a) => a.symbol) ?? []),
    ...(etfReport?.alternatives.map((a) => a.symbol) ?? []),
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://uncoverd.org/" },
      { "@type": "ListItem", position: 2, name: "Alternatives", item: "https://uncoverd.org/alternatives" },
      { "@type": "ListItem", position: 3, name: `${symbol}${targetName ? ` (${targetName})` : ""}`, item: `https://uncoverd.org/alternatives/${symbol}` },
    ],
  };
  const itemListJsonLd =
    altSymbols.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Alternatives to ${symbol}${targetName ? ` · ${targetName}` : ""}`,
          description: `Comparable dividend ${targetKind === "ETF" ? "ETFs" : "stocks"} ranked by yield, rating, valuation and return.`,
          itemListElement: altSymbols.slice(0, 10).map((sym, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: targetKind === "ETF" ? `https://uncoverd.org/etfs/symbol/${sym}` : `https://uncoverd.org/stocks/${sym}`,
            name: sym,
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <SiteHeader />
      <main className="dv-page">
        <section className="dv-compare-hero">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div className="dv-eyebrow">Alternatives</div>
              <h1 style={{ margin: "0.4rem 0", fontSize: "2.05rem", letterSpacing: "-0.02em" }}>
                Alternatives to {symbol}
                {targetName ? <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}> · {targetName}</span> : null}
              </h1>
              <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: 720 }}>
                Comparable {targetKind === "ETF" ? "dividend ETFs" : `dividend stocks in ${stockReport?.target.sector ?? "the same sector"}`},
                ranked by what each does better than {symbol}. Data-driven only — pick your own axis.
              </p>
            </div>
            <ShareButton
              ogImageUrl={`/api/og/compare?a=${encodeURIComponent(symbol)}`}
              shareUrl={`https://uncoverd.org/alternatives/${symbol}`}
              shareText={`Alternatives to ${symbol} — dividend research via uncoverd`}
              downloadFileName={`uncoverd-alternatives-${symbol}.png`}
              label="Share"
            />
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href={`/compare?a=${symbol}`} className="btn btn--ghost">
              Open in Compare →
            </Link>
            <Link href={isEtf ? `/etfs/symbol/${symbol}` : `/stocks/${symbol}`} className="btn btn--ghost">
              View {symbol} profile
            </Link>
          </div>
        </section>

        {/* Search bar for chained lookups — user can type a different ticker
            and jump straight to its alternatives without going through the
            index page. */}
        <section className="panel" style={{ marginTop: "1rem" }}>
          <CompareSearch slot="a" currentSymbols={[]} mode="alternative" />
        </section>

        {/* Target reference card — so the user can see what they're trying to beat */}
        {!isEtf && stockReport && (
          <section className="dv-section" style={{ marginTop: "1.5rem" }}>
            <h2 className="dv-section__title">{symbol} reference</h2>
            <div
              className="panel"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.5rem",
                padding: "0.85rem 1rem",
              }}
            >
              <RefMetric label="Yield" value={formatPercent(stockReport.target.yieldPct, 2)} />
              <RefMetric label="Rating" value={stockReport.target.grade ?? "—"} />
              <RefMetric label="P/E" value={stockReport.target.peRatio != null ? stockReport.target.peRatio.toFixed(1) : "—"} />
              <RefMetric label="Net debt/EBITDA" value={stockReport.target.netDebtToEbitda != null ? stockReport.target.netDebtToEbitda.toFixed(2) : "—"} />
              <RefMetric label="1Y price" value={formatPercent(stockReport.target.return1y, 1)} />
              <RefMetric label="Sector" value={stockReport.target.sector ?? "—"} small />
            </div>
          </section>
        )}

        {isEtf && etfReport && (
          <section className="dv-section" style={{ marginTop: "1.5rem" }}>
            <h2 className="dv-section__title">{symbol} reference</h2>
            <div
              className="panel"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.5rem",
                padding: "0.85rem 1rem",
              }}
            >
              <RefMetric label="Yield" value={formatPercent(etfReport.target.yieldPct, 2)} />
              <RefMetric label="Expense ratio" value={formatPercent(etfReport.target.expenseRatio, 2)} />
              <RefMetric label="AUM" value={formatCurrency(etfReport.target.aum, { abbreviate: true })} />
              <RefMetric label="Holdings" value={`${etfReport.target.holdingsCount}`} />
            </div>
          </section>
        )}

        {/* Alternatives grid */}
        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <h2 className="dv-section__title">Better on this axis</h2>
          {((stockReport?.alternatives.length ?? 0) === 0 && (etfReport?.alternatives.length ?? 0) === 0) ? (
            <div className="dv-empty">
              No clear axis-winners among the peer set. {symbol} may already lead its
              comparison group on the metrics we track, or the peer pool is too thin.
              Try <Link href={`/compare?a=${symbol}`} className="dv-action-link dv-action-link--accent">running a manual compare</Link>.
            </div>
          ) : (
            <div className="dv-alternatives-grid">
              {!isEtf && stockReport && stockReport.alternatives.map((alt) => (
                <StockAltCard key={alt.axis} alt={alt} targetSymbol={symbol} axes={STOCK_AXES} />
              ))}
              {isEtf && etfReport && etfReport.alternatives.map((alt) => (
                <EtfAltCard key={alt.axis} alt={alt} targetSymbol={symbol} axes={ETF_AXES} />
              ))}
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <div className="dv-prose" style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            <p>
              <strong>How this works:</strong> we rank peers in the same {targetKind === "ETF" ? "category (by holdings overlap)" : "sector and market-cap range"} on each axis and surface the
              top one per axis that {targetKind === "ETF" ? "scores better than" : "outperforms"} {symbol}. No editorial recommendation — the framing is "comparable {targetKind} doing X better".
              You decide whether the trade-off (e.g. higher yield vs lower rating) fits your goals.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function RefMetric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: small ? "0.85rem" : "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function StockAltCard({
  alt,
  targetSymbol,
  axes,
}: {
  alt: StockAlternative;
  targetSymbol: string;
  axes: typeof STOCK_AXES;
}) {
  const axisDef = axes.find((a) => a.id === alt.axis);
  return (
    <article className="dv-alt-card">
      <header className="dv-alt-card__head">
        <span className="dv-alt-card__axis-label">{axisDef?.label ?? alt.axis}</span>
        <span className="dv-alt-card__axis-desc">{axisDef?.description ?? ""}</span>
      </header>
      <Link href={`/stocks/${alt.symbol}`} className="dv-alt-card__symbol">
        {alt.symbol}
        <span className="dv-alt-card__name">{alt.name ?? ""}</span>
      </Link>
      <div className="dv-alt-card__claim">{alt.claim}</div>
      <div className="dv-alt-card__metrics">
        <AltMetric label="Yield" value={formatPercent(alt.yieldPct, 2)} />
        <AltMetric label="Rating" value={alt.grade ?? "—"} />
        <AltMetric label="P/E" value={alt.peRatio != null ? alt.peRatio.toFixed(1) : "—"} />
        <AltMetric label="1Y price" value={formatPercent(alt.return1y, 1)} />
      </div>
      <div className="dv-alt-card__actions">
        <Link href={`/compare?a=${targetSymbol}&b=${alt.symbol}`} className="btn btn--ghost dv-alt-card__compare">
          Compare side-by-side →
        </Link>
      </div>
    </article>
  );
}

function EtfAltCard({
  alt,
  targetSymbol,
  axes,
}: {
  alt: EtfAlternative;
  targetSymbol: string;
  axes: typeof ETF_AXES;
}) {
  const axisDef = axes.find((a) => a.id === alt.axis);
  return (
    <article className="dv-alt-card">
      <header className="dv-alt-card__head">
        <span className="dv-alt-card__axis-label">{axisDef?.label ?? alt.axis}</span>
        <span className="dv-alt-card__axis-desc">{axisDef?.description ?? ""}</span>
      </header>
      <Link href={`/etfs/symbol/${alt.symbol}`} className="dv-alt-card__symbol">
        {alt.symbol}
        <span className="dv-alt-card__name">{alt.name ?? ""}</span>
      </Link>
      <div className="dv-alt-card__claim">{alt.claim}</div>
      <div className="dv-alt-card__metrics">
        <AltMetric label="Yield" value={formatPercent(alt.yieldPct, 2)} />
        <AltMetric label="Expense" value={formatPercent(alt.expenseRatio, 2)} />
        <AltMetric label="AUM" value={formatCurrency(alt.aum, { abbreviate: true })} />
        <AltMetric label="Overlap" value={`${(alt.similarity * 100).toFixed(0)}%`} />
      </div>
      <div className="dv-alt-card__actions">
        <Link href={`/compare?a=${targetSymbol}&b=${alt.symbol}`} className="btn btn--ghost dv-alt-card__compare">
          Compare side-by-side →
        </Link>
      </div>
    </article>
  );
}

function AltMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dv-alt-card__metric">
      <span className="dv-alt-card__metric-label">{label}</span>
      <span className="dv-alt-card__metric-value">{value}</span>
    </div>
  );
}

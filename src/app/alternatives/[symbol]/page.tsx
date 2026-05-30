import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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
  return {
    title: `Alternatives to ${symbol}: Similar Dividend Stocks & ETFs`,
    description: `Find peers to ${symbol} ranked by higher yield, better rating, cheaper valuation, stronger balance sheet, and better recent returns. Side-by-side comparison from ${APP_NAME}.`,
    keywords: [
      `alternatives to ${symbol}`,
      `${symbol} alternative`,
      `stocks similar to ${symbol}`,
      `${symbol} competitors`,
      `${symbol} comparison`,
      `${symbol} peers`,
      `${symbol} similar dividend`,
    ],
    alternates: { canonical: `/alternatives/${symbol}` },
    openGraph: {
      title: `Alternatives to ${symbol} | ${APP_NAME}`,
      description: `Peers to ${symbol} ranked by yield, rating, valuation, balance sheet, and return. Data-driven, no editorializing.`,
      type: "website",
      url: `https://uncoverd.org/alternatives/${symbol}`,
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

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section className="dv-compare-hero">
          <div className="dv-eyebrow">Alternatives</div>
          <h1 style={{ margin: "0.4rem 0", fontSize: "2.05rem", letterSpacing: "-0.02em" }}>
            Alternatives to {symbol}
            {targetName ? <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}> · {targetName}</span> : null}
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: 720 }}>
            Comparable {targetKind === "ETF" ? "dividend ETFs" : `dividend stocks in ${stockReport?.target.sector ?? "the same sector"}`},
            ranked by what each does better than {symbol}. Data-driven only — pick your own axis.
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href={`/compare?a=${symbol}`} className="btn btn--ghost">
              Open in Compare →
            </Link>
            <Link href={isEtf ? `/etfs/symbol/${symbol}` : `/stocks/${symbol}`} className="btn btn--ghost">
              View {symbol} profile
            </Link>
          </div>
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

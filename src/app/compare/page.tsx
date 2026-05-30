import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { CompareSearch } from "./compare-search";
import {
  getStock,
  getEtfDetail,
  getStockRating,
  getEtfHoldings,
} from "@/lib/data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { APP_NAME } from "@/lib/branding";

// Compare tool: side-by-side view of 2–4 stocks/ETFs. Drives SEO via the
// long-tail "X vs Y" queries (always pulled by ranking algos when comparing
// dividend ETFs), and gives the operator a shareable link with their
// brand in the URL.
//
// Query params: ?a=AAPL&b=MSFT&c=KO[&d=...] — any combination of stocks
// and ETFs (mixed comparisons render only the metrics each side has).
//
// For pairs/triples of ETFs we compute a holding-weighted cosine
// similarity score to surface the "two of these are basically the same
// fund" insight, which is one of the legitimate reasons people land on
// ETF comparison pages.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_SYMBOLS = 4;
const SLOTS = ["a", "b", "c", "d"] as const;

function parseSymbols(sp: Record<string, string | string[] | undefined>): string[] {
  const out: string[] = [];
  for (const slot of SLOTS) {
    const v = sp[slot];
    if (typeof v === "string" && v.trim().length > 0) {
      out.push(v.trim().toUpperCase());
    }
  }
  // Dedup while preserving order.
  return Array.from(new Set(out)).slice(0, MAX_SYMBOLS);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const symbols = parseSymbols(sp);
  if (symbols.length < 2) {
    return {
      title: "Compare dividend stocks & ETFs",
      description:
        "Compare any two dividend stocks or ETFs side by side — yield, expense ratio, AUM, rating, top holdings, and overlap. Built for fast research.",
      alternates: { canonical: "/compare" },
    };
  }
  const joined = symbols.join(" vs ");
  return {
    title: `${joined} — Dividend Comparison`,
    description: `Side-by-side comparison of ${joined}: yield, market cap / AUM, expense ratio, rating, and top holdings. Real-time data from ${APP_NAME}.`,
    alternates: { canonical: `/compare?${symbols.map((s, i) => `${SLOTS[i]}=${s}`).join("&")}` },
    openGraph: {
      title: `${joined} — Dividend Comparison`,
      description: `Side-by-side: yield, rating, expense ratio, holdings. ${APP_NAME}.`,
      type: "website",
      url: `https://uncoverd.org/compare?${symbols.map((s, i) => `${SLOTS[i]}=${s}`).join("&")}`,
    },
  };
}

type ColumnData = {
  symbol: string;
  name: string | null;
  kind: "stock" | "etf" | "missing";
  price: number | null;
  marketCap: number | null;
  aum: number | null;
  yieldPct: number | null;
  expenseRatio: number | null;
  peRatio: number | null;
  beta: number | null;
  changePercent: number | null;
  range52w: string | null;
  sector: string | null;
  industry: string | null;
  // Stock rating
  composite: number | null;
  grade: string | null;
  // Top holdings (ETF only)
  topHoldings: { asset: string; name: string | null; weight: number | null }[];
};

async function loadColumn(symbol: string): Promise<ColumnData> {
  // Try stock first; if not found, try ETF.
  const [stock, etf] = await Promise.all([getStock(symbol), getEtfDetail(symbol)]);

  if (etf) {
    const holdings = await getEtfHoldings(symbol, 25);
    return {
      symbol,
      name: etf.name,
      kind: "etf",
      price: etf.price ?? null,
      marketCap: null,
      aum: etf.aum ?? null,
      yieldPct: etf.dividend_yield ?? null,
      expenseRatio: etf.expense_ratio ?? null,
      peRatio: null,
      beta: null,
      changePercent: etf.change_percent ?? null,
      range52w: etf.range ?? null,
      sector: null,
      industry: null,
      composite: null,
      grade: null,
      topHoldings: holdings.map((h) => ({
        asset: h.asset,
        name: h.name,
        weight: h.weight_percentage,
      })),
    };
  }

  if (stock) {
    const rating = await getStockRating(symbol).catch(() => null);
    return {
      symbol,
      name: stock.name,
      kind: "stock",
      price: stock.price ?? null,
      marketCap: stock.market_cap ?? null,
      aum: null,
      yieldPct: stock.dividend_yield ?? null,
      expenseRatio: null,
      peRatio: stock.pe_ratio ?? null,
      beta: stock.beta ?? null,
      changePercent: stock.change_percent ?? null,
      range52w: stock.range ?? null,
      sector: stock.sector ?? null,
      industry: stock.industry ?? null,
      composite: rating?.composite_total ?? null,
      grade: rating?.composite_grade ?? null,
      topHoldings: [],
    };
  }

  return {
    symbol,
    name: null,
    kind: "missing",
    price: null,
    marketCap: null,
    aum: null,
    yieldPct: null,
    expenseRatio: null,
    peRatio: null,
    beta: null,
    changePercent: null,
    range52w: null,
    sector: null,
    industry: null,
    composite: null,
    grade: null,
    topHoldings: [],
  };
}

// Cosine similarity on holding-weight vectors. Two ETFs with the same
// holdings at the same weights score 1.0; completely disjoint = 0.0.
// More meaningful than Jaccard for ETF overlap because it accounts for
// how much weight each side puts on the overlapping names.
function holdingsSimilarity(
  a: { asset: string; weight: number | null }[],
  b: { asset: string; weight: number | null }[],
): number {
  const am = new Map<string, number>();
  const bm = new Map<string, number>();
  for (const h of a) if (h.weight != null) am.set(h.asset, Number(h.weight));
  for (const h of b) if (h.weight != null) bm.set(h.asset, Number(h.weight));
  const keys = new Set([...am.keys(), ...bm.keys()]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const k of keys) {
    const av = am.get(k) ?? 0;
    const bv = bm.get(k) ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildSwapUrl(currentSymbols: string[], replaceIndex: number, withSymbol: string | null): string {
  const next = [...currentSymbols];
  if (withSymbol === null) next.splice(replaceIndex, 1);
  else next[replaceIndex] = withSymbol;
  const filtered = next.filter(Boolean);
  if (filtered.length === 0) return "/compare";
  return `/compare?${filtered.map((s, i) => `${SLOTS[i]}=${encodeURIComponent(s)}`).join("&")}`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const symbols = parseSymbols(sp);

  // Empty / single-symbol state — show the search prompt.
  if (symbols.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="dv-page">
          <PageHeader
            eyebrow="Tools"
            title="Compare dividend stocks & ETFs"
            description="Drop in 2–4 tickers and see them side by side: yield, rating, expense ratio, top holdings, and overlap. Stocks vs stocks, ETFs vs ETFs, or mixed."
          />
          <section className="panel stack" style={{ marginTop: "1rem" }}>
            <CompareSearch slot="a" currentSymbols={[]} />
          </section>
          <section style={{ marginTop: "2rem", color: "var(--text-muted)", fontSize: "0.92rem" }}>
            <p style={{ margin: 0 }}>Examples:</p>
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", lineHeight: 1.8 }}>
              <li>
                <Link href="/compare?a=SCHD&b=VYM&c=DGRO" className="dv-action-link dv-action-link--accent">
                  SCHD vs VYM vs DGRO
                </Link>{" "}
                — three popular dividend ETFs, find the one with the holdings you actually want
              </li>
              <li>
                <Link href="/compare?a=JNJ&b=KO&c=PG" className="dv-action-link dv-action-link--accent">
                  JNJ vs KO vs PG
                </Link>{" "}
                — three Dividend Kings head-to-head on yield, payout, rating
              </li>
              <li>
                <Link href="/compare?a=JEPI&b=JEPQ" className="dv-action-link dv-action-link--accent">
                  JEPI vs JEPQ
                </Link>{" "}
                — covered-call income ETFs from the same shop
              </li>
            </ul>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const columns = await Promise.all(symbols.map((s) => loadColumn(s)));

  // Compute pairwise similarity for ETFs only.
  const etfCols = columns.filter((c) => c.kind === "etf");
  const similarities: { a: string; b: string; score: number }[] = [];
  for (let i = 0; i < etfCols.length; i++) {
    for (let j = i + 1; j < etfCols.length; j++) {
      similarities.push({
        a: etfCols[i].symbol,
        b: etfCols[j].symbol,
        score: holdingsSimilarity(etfCols[i].topHoldings, etfCols[j].topHoldings),
      });
    }
  }

  const headline = symbols.join(" vs ");

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Compare"
          title={`${headline}`}
          description={`Side-by-side comparison of ${columns.length} ${columns.length === 1 ? "ticker" : "tickers"}. Click any value to dig into the source page.`}
        />

        {/* Add another ticker (if we have room) */}
        {columns.length < MAX_SYMBOLS && (
          <section className="panel" style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
            <CompareSearch slot={SLOTS[columns.length]} currentSymbols={symbols} />
          </section>
        )}

        {/* Main comparison grid. CSS grid with one column per ticker —
            responsive: stacks on mobile, side-by-side from 720px up. */}
        <section className="dv-compare-grid" style={gridStyle(columns.length)}>
          {columns.map((c, i) => (
            <CompareColumn
              key={c.symbol}
              col={c}
              removeUrl={buildSwapUrl(symbols, i, null)}
            />
          ))}
        </section>

        {/* ETF similarity readout */}
        {similarities.length > 0 && (
          <section className="dv-section" style={{ marginTop: "2rem" }}>
            <h2 className="dv-section__title">Holdings overlap (ETF similarity)</h2>
            <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Cosine similarity on the top 25 holdings, weighted by position size.
              A score of 1.0 means the funds hold identical positions at identical
              weights; 0.0 means no overlap. Useful for spotting near-duplicate
              dividend ETFs from different issuers.
            </p>
            <table className="dv-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Pair</th>
                  <th style={{ textAlign: "right" }}>Similarity</th>
                  <th style={{ textAlign: "right" }}>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {similarities.map((s) => (
                  <tr key={`${s.a}-${s.b}`}>
                    <td>
                      <strong>{s.a}</strong> ↔ <strong>{s.b}</strong>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      {(s.score * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color:
                          s.score >= 0.85
                            ? "#fbbf24"
                            : s.score >= 0.5
                              ? "#a7f3d0"
                              : "var(--text-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {s.score >= 0.85
                        ? "Near-duplicate"
                        : s.score >= 0.5
                          ? "Strong overlap"
                          : s.score >= 0.2
                            ? "Some overlap"
                            : "Mostly distinct"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Share block — preserves URL prominence + branded credit */}
        <section
          className="panel"
          style={{
            marginTop: "2rem",
            padding: "1.25rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Shareable comparison
            </div>
            <div style={{ marginTop: "0.3rem", fontSize: "0.92rem", color: "var(--text-primary)" }}>
              {`uncoverd.org/compare?${symbols.map((s, i) => `${SLOTS[i]}=${s}`).join("&")}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a
              className="btn btn--ghost"
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(`${headline} — dividend comparison via @uncoverd`)}&url=${encodeURIComponent(`https://uncoverd.org/compare?${symbols.map((s, i) => `${SLOTS[i]}=${s}`).join("&")}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on X
            </a>
            <a
              className="btn btn--ghost"
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://uncoverd.org/compare?${symbols.map((s, i) => `${SLOTS[i]}=${s}`).join("&")}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on LinkedIn
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function gridStyle(n: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
    gap: "0.85rem",
    marginTop: "0.75rem",
  };
}

function CompareColumn({
  col,
  removeUrl,
}: {
  col: ColumnData;
  removeUrl: string;
}) {
  if (col.kind === "missing") {
    return (
      <div
        style={{
          padding: "1.25rem 1.25rem 1.4rem",
          border: "1px solid var(--border-subtle)",
          borderRadius: 14,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>{col.symbol}</strong>
          <Link
            href={removeUrl}
            aria-label={`Remove ${col.symbol}`}
            style={{ color: "var(--text-muted)", fontSize: "1.2rem", textDecoration: "none" }}
          >
            ×
          </Link>
        </header>
        <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
          Not found. Check the ticker symbol and try again.
        </div>
      </div>
    );
  }

  const detailHref = col.kind === "etf" ? `/etfs/symbol/${col.symbol}` : `/stocks/${col.symbol}`;

  return (
    <article
      style={{
        padding: "1.25rem 1.25rem 1.4rem",
        border: "1px solid var(--border-subtle)",
        borderRadius: 14,
        background:
          "radial-gradient(120% 200% at 0% 0%, rgba(52,211,153,0.05) 0%, rgba(52,211,153,0) 55%), rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Link
            href={detailHref}
            style={{ textDecoration: "none", color: "var(--text-primary)" }}
          >
            <strong style={{ fontSize: "1.05rem", display: "block" }}>{col.symbol}</strong>
            {col.name && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem", lineHeight: 1.3 }}>
                {col.name}
              </div>
            )}
          </Link>
          <span
            style={{
              display: "inline-block",
              marginTop: "0.45rem",
              padding: "0.1rem 0.5rem",
              borderRadius: 999,
              background: "rgba(52,211,153,0.1)",
              color: "var(--positive)",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            {col.kind === "etf" ? "ETF" : "Stock"}
          </span>
        </div>
        <Link
          href={removeUrl}
          aria-label={`Remove ${col.symbol}`}
          style={{ color: "var(--text-muted)", fontSize: "1.2rem", textDecoration: "none", lineHeight: 1 }}
        >
          ×
        </Link>
      </header>

      <Metric label="Price" value={col.price != null ? formatCurrency(col.price) : "—"} />
      <Metric
        label="Day change"
        value={col.changePercent != null ? formatPercent(col.changePercent, 2) : "—"}
        valueColor={
          col.changePercent == null
            ? undefined
            : col.changePercent >= 0
              ? "var(--positive)"
              : "#f87171"
        }
      />
      <Metric label="Yield" value={col.yieldPct != null ? formatPercent(col.yieldPct, 2) : "—"} />
      <Metric
        label={col.kind === "etf" ? "AUM" : "Market cap"}
        value={
          col.kind === "etf"
            ? col.aum != null
              ? formatCurrency(col.aum, { abbreviate: true })
              : "—"
            : col.marketCap != null
              ? formatCurrency(col.marketCap, { abbreviate: true })
              : "—"
        }
      />
      {col.kind === "etf" ? (
        <Metric
          label="Expense ratio"
          value={col.expenseRatio != null ? formatPercent(col.expenseRatio, 2) : "—"}
        />
      ) : (
        <>
          <Metric label="P/E" value={col.peRatio != null ? col.peRatio.toFixed(2) : "—"} />
          <Metric label="Beta" value={col.beta != null ? col.beta.toFixed(2) : "—"} />
          <Metric
            label="Rating"
            value={col.grade ? `${col.grade} (${col.composite ?? "?"})` : "—"}
            valueColor={
              col.grade?.startsWith("A")
                ? "#34d399"
                : col.grade?.startsWith("B")
                  ? "#a7f3d0"
                  : col.grade?.startsWith("C")
                    ? "var(--text-muted)"
                    : col.grade?.startsWith("D") || col.grade?.startsWith("F")
                      ? "#fbbf24"
                      : undefined
            }
          />
          <Metric label="Sector" value={col.sector ?? "—"} />
          <Metric label="Industry" value={col.industry ?? "—"} />
        </>
      )}
      <Metric label="52-week range" value={col.range52w ?? "—"} small />

      {col.kind === "etf" && col.topHoldings.length > 0 && (
        <div style={{ marginTop: "0.4rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            Top 5 holdings
          </div>
          {col.topHoldings.slice(0, 5).map((h) => (
            <div
              key={h.asset}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                padding: "0.2rem 0",
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{h.asset}</span>
              <span>{h.weight != null ? `${Number(h.weight).toFixed(2)}%` : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  valueColor,
  small,
}: {
  label: string;
  value: string;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: small ? "0.78rem" : "0.92rem",
          fontWeight: 600,
          color: valueColor ?? "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

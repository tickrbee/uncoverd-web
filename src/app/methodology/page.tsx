import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  // Plain string → the `%s | uncoverd` template appends the brand. Don't put
  // "uncoverd" in the string too, or it double-brands ("… — uncoverd | uncoverd").
  title: "Rating Methodology",
  description:
    "How uncoverd computes its dividend stock and ETF ratings. Composite scoring, dimension definitions, data sources, and update cadence.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Methodology"
          title="How uncoverd ratings work"
          description="A transparent look at what each rating measures, how it's calculated, and how often it's refreshed."
        />

        <section className="dv-section">
          <h2 className="dv-section__title">Composite stock rating</h2>
          <div className="dv-prose">
            <p>
              Every active US dividend payer is scored on five pillars. Each pillar is a
              0&ndash;4 score derived from industry-relative percentiles. The composite is
              the sum of all five (0&ndash;20) and is mapped to a letter grade:
            </p>
            <ul>
              <li><strong>A</strong> &mdash; composite 17&ndash;20</li>
              <li><strong>B</strong> &mdash; composite 14&ndash;16</li>
              <li><strong>C</strong> &mdash; composite 12&ndash;13</li>
              <li><strong>D</strong> &mdash; composite 10&ndash;11</li>
              <li><strong>F</strong> &mdash; below 10</li>
            </ul>
            <p>
              Ratings recompute every day at 02:30 UTC after the underlying data refresh
              has loaded the latest fundamentals into <code>backend.stock_ratings_daily</code>.
            </p>
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">The five pillars</h2>
          <div className="dv-card-grid">
            <Pillar
              title="Value"
              what="How cheap the stock looks vs peers in its industry."
              inputs={[
                "Trailing & forward P/E ratio",
                "P/B (price-to-book) ratio",
                "Dividend yield percentile vs industry cohort",
              ]}
              math="Each component is converted to an industry-relative percentile (lower P/E = higher percentile). The Value score is the average of those percentiles, mapped to 0–4."
            />
            <Pillar
              title="Growth"
              what="How consistently the business is compounding."
              inputs={[
                "5-year revenue CAGR",
                "5-year EPS CAGR",
                "5-year dividend per share CAGR",
              ]}
              math="Each CAGR is winsorized at the 5th/95th percentile of its cohort then averaged into an industry-relative percentile, mapped to 0–4."
            />
            <Pillar
              title="Profitability"
              what="How much profit the business squeezes out of its sales and capital."
              inputs={[
                "Net profit margin",
                "Return on equity (ROE)",
                "Return on invested capital (ROIC)",
              ]}
              math="The three margins are percentile-ranked against the cohort, then averaged and mapped to 0–4."
            />
            <Pillar
              title="Momentum"
              what="How the market has been rewarding the stock recently."
              inputs={[
                "1-year total return percentile",
                "3-month total return percentile",
              ]}
              math="Weighted 60/40 in favor of the longer 1-year window. Mapped to 0–4."
            />
            <Pillar
              title="Health"
              what="Balance-sheet strength and dividend coverage."
              inputs={[
                "Net debt / EBITDA",
                "Interest coverage ratio",
                "Dividend payout ratio (FCF-based)",
              ]}
              math="Lower leverage and better-covered dividends score higher. Each component is percentile-ranked, averaged, and mapped to 0–4."
            />
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">Composite ETF rating</h2>
          <div className="dv-prose">
            <p>
              ETFs use a four-component composite that fits how investors actually pick
              funds &mdash; cost, size, yield, and recent performance. The composite is
              the average of the four components on a 0&ndash;5 scale.
            </p>
          </div>
          <div className="dv-card-grid">
            <Pillar
              title="Yield"
              what="Distribution yield over the trailing 12 months."
              inputs={["Forward dividend yield", "Trailing 12-month distribution yield"]}
              math="0% yield → 0, 4% → 3, 6%+ → 5 (capped to avoid rewarding yield traps)."
            />
            <Pillar
              title="AUM / Size"
              what="Asset base — proxy for liquidity and survivorship risk."
              inputs={["Total assets under management"]}
              math="Below $100M → 0.5, $1B → ~3, $50B+ → 5. Larger funds score higher because they're cheaper to trade and less likely to be closed."
            />
            <Pillar
              title="Cost (Expense Ratio)"
              what="Annual fee drag on returns."
              inputs={["Expense ratio (% of AUM)"]}
              math="Below 0.10% → 5, 0.50% → 3, above 1.00% → 1. Lower fees compound to higher long-run returns."
            />
            <Pillar
              title="1-Year Return"
              what="Trailing 12-month total return."
              inputs={["1-year price + distribution total return"]}
              math="Negative → 0, 8% → 3, 20%+ → 5. The horizon is short on purpose — long-term performance is captured by Yield + Cost; this measures whether the fund is currently delivering."
            />
          </div>
          <div className="dv-prose" style={{ marginTop: "1rem" }}>
            <p>
              Grade mapping: A &ge; 4, B &ge; 3, C &ge; 2, D &ge; 1, otherwise F.
              Components with missing data are dropped from the average rather than
              penalized; we don&apos;t punish ETFs for inputs we don&apos;t have.
            </p>
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">Data sources & cadence</h2>
          <div className="dv-prose">
            <ul>
              <li>
                <strong>Fundamentals</strong> &mdash; income statements, balance sheets, cash
                flow statements, ratios and key metrics are sourced from SEC filings via a
                leading financial data provider. Refreshed daily; quarterly statements rotate
                in within hours of filing.
              </li>
              <li>
                <strong>Prices</strong> &mdash; end-of-day prices refreshed every weekday
                evening for the prior 7 days. Long-history backfills run on a rolling cadence
                to keep multi-year charts current.
              </li>
              <li>
                <strong>Dividends</strong> &mdash; full per-symbol dividend history including
                ex-dividend, record, payment and declaration dates. The next ex-dividend date
                is materialized on each ticker so listings can filter cleanly to upcoming-only.
              </li>
              <li>
                <strong>ETF metadata</strong> &mdash; expense ratio, AUM, holdings count and
                asset class refresh nightly. Top-500 holdings + sector breakdowns refresh
                weekly.
              </li>
              <li>
                <strong>News</strong> &mdash; the global news feed sweeps daily; per-symbol
                feeds backfill on a rolling sharded schedule.
              </li>
            </ul>
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">What we deliberately don&apos;t do</h2>
          <div className="dv-prose">
            <ul>
              <li>
                We don&apos;t make stock recommendations. The composite is a structured
                summary, not advice. The Recommendation tab is a rules-based summary of the
                composite, gated behind Premium because it&apos;s opinionated.
              </li>
              <li>
                We don&apos;t weight pillars differently for different sectors. Industry
                normalization happens inside each pillar via percentile ranking; the pillar
                weights themselves are equal.
              </li>
              <li>
                We don&apos;t hide data behind paywalls for components we&apos;ve already
                computed. If a pillar has missing inputs we surface that with an em-dash
                rather than filling in a zero.
              </li>
            </ul>
            <p>
              Found a calculation that looks wrong?{" "}
              <Link href="/contact" className="dv-action-link dv-action-link--accent">
                Let us know
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Pillar({
  title,
  what,
  inputs,
  math,
}: {
  title: string;
  what: string;
  inputs: string[];
  math: string;
}) {
  return (
    <div className="dv-stat-card" style={{ textAlign: "left" }}>
      <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem" }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.86rem" }}>{what}</p>
      <p
        style={{
          margin: "0.65rem 0 0.3rem",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Inputs
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        {inputs.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p
        style={{
          margin: "0.65rem 0 0.3rem",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Calculation
      </p>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
        {math}
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Press kit & data embeds",
  description: `Brand assets, fact sheet, and free embeddable widgets you can drop on your blog or newsletter — credit ${APP_NAME} and grab a copy-paste iframe.`,
  alternates: { canonical: "/press" },
};

const EMBEDS = [
  {
    slug: "upcoming-ex-dates",
    title: "Upcoming ex-dividend dates",
    description: "The next 10 confirmed ex-dividend events with symbol, ex-date, payment date and amount. Refreshes daily.",
    height: 540,
  },
  {
    slug: "most-held-by-etfs",
    title: "Stocks most held by ETFs",
    description: "Heatmap of the 15 stocks that show up in the most ETFs — a snapshot of basket-exposure crowding.",
    height: 620,
  },
];

const FAST_FACTS = [
  ["Stocks covered", "65,000+ active tickers worldwide"],
  ["ETFs covered", "13,800+ dividend-focused ETFs + funds"],
  ["Data source", "SEC filings via a leading financial data provider"],
  ["Refresh cadence", "Daily for prices/quotes, nightly for fundamentals"],
  ["Rating system", "5-pillar composite (Value, Growth, Profitability, Momentum, Health)"],
  ["Pricing", "Free + Premium at €100/year"],
];

export default function PressPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Press"
          title="Press kit & data embeds"
          description={`Reporters, bloggers, podcasters — everything you need to write about, cite, or embed ${APP_NAME}.`}
        />

        <section className="dv-section">
          <h2 className="dv-section__title">Fast facts</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {FAST_FACTS.map(([k, v]) => (
              <div
                key={k}
                style={{
                  padding: "0.85rem 1rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {k}
                </div>
                <div style={{ marginTop: "0.25rem", color: "var(--text-primary)", fontSize: "0.92rem", fontWeight: 600 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">One-line pitches</h2>
          <div className="dv-prose">
            <ul>
              <li>
                <strong>Short:</strong> {APP_NAME} is a dividend research platform with ratings, screener, and model portfolios — built on SEC filings, €100/year.
              </li>
              <li>
                <strong>Medium:</strong> {APP_NAME} is an independent dividend research platform covering 65,000+ stocks and 13,800+ ETFs worldwide. We compute a 5-pillar composite rating for every ratable US stock, surface upcoming ex-dividend dates, and build model portfolios across yield/growth/safety themes — all from SEC filings, at less than half the price of comparable US tools.
              </li>
              <li>
                <strong>Long-form (use for &quot;About&quot; backgrounders):</strong>{" "}
                {APP_NAME} was built to give serious income investors what dividend.com and similar US tools already provide, at half the price and with a more transparent methodology. The platform covers every actively-traded stock and ETF in our dataset (65K+ stocks, 13.8K+ ETFs), refreshes daily from SEC filings, and computes proprietary 5-pillar ratings (Value, Growth, Profitability, Momentum, Health). It also includes a screener, ETF screener, ex-dividend calendar, capture-strategy analysis, and reverse ETF lookups (which ETFs hold a given stock).
              </li>
            </ul>
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">Embeddable widgets</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Drop any of these on your blog or newsletter. We auto-refresh the
            data; no API key needed. The only ask: keep the &quot;Data: uncoverd&quot;
            credit visible.
          </p>

          {EMBEDS.map((e) => (
            <div key={e.slug} style={{ marginBottom: "2rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{e.title}</h3>
              <p style={{ margin: "0 0 0.85rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {e.description}
              </p>
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1rem",
                  marginBottom: "0.75rem",
                }}
              >
                <iframe
                  src={`/embed/${e.slug}`}
                  width="100%"
                  height={e.height}
                  style={{ border: 0, borderRadius: 8 }}
                  title={e.title}
                  loading="lazy"
                />
              </div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Copy this snippet:
              </p>
              <pre
                style={{
                  background: "#000",
                  color: "#a7f3d0",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  overflow: "auto",
                  fontSize: "0.82rem",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
{`<iframe src="https://uncoverd.org/embed/${e.slug}"
        width="100%" height="${e.height}"
        style="border:0;border-radius:8px;"
        title="${e.title}"></iframe>`}
              </pre>
            </div>
          ))}
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">Brand assets</h2>
          <div className="dv-prose">
            <p>
              Logo and screenshots are available on request. Email{" "}
              <Link href="/contact" className="dv-action-link">our contact page</Link> with
              your publication and we&apos;ll send a zip with high-res PNG, SVG, and a
              press-ready screenshot set within 24 hours.
            </p>
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">For reporters needing sources</h2>
          <div className="dv-prose">
            <p>
              {APP_NAME} replies to journalist requests via{" "}
              <a href="https://www.helpareporter.com" target="_blank" rel="noopener" className="dv-action-link">
                HARO
              </a>{" "}
              and Qwoted on dividend-investing, ETF flows, and US dividend-stock
              market structure topics. For specific data pulls
              (&quot;how many dividend aristocrats yield over 4%?&quot; etc.), email us
              and we&apos;ll typically respond same-day with a CSV and an attribution
              line.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

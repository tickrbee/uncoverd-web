import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "About",
  description: `${APP_NAME} is independent dividend-research software, sourced from SEC filings and rebuilt for serious income investors.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="About"
          title="Built for dividend investors who actually want the data."
          description={`${APP_NAME} is independent dividend-research software. We rebuilt the screener, the ratings, and the model portfolios from scratch on top of SEC filings.`}
        />

        <section className="dv-section">
          <div className="dv-prose">
            <h2>Why we exist</h2>
            <p>
              Most dividend tools either lock the data behind US$200+ annual subscriptions or
              hand-wave the methodology. We thought income investors deserved a tool that:
            </p>
            <ul>
              <li>Shows the same data dividend.com shows, for less than half the price.</li>
              <li>Tells you exactly how every rating is computed (see our{" "}
                <Link href="/methodology" className="dv-action-link">methodology page</Link>).</li>
              <li>Covers global markets &mdash; not just the S&amp;P 500.</li>
              <li>Treats the underlying SEC filings as the source of truth.</li>
            </ul>

            <h2>What you get</h2>
            <ul>
              <li>
                <strong>Screener</strong> &mdash; 38K+ active dividend-paying stocks and 13K+ ETFs,
                filterable by sector, yield, market cap, country.
              </li>
              <li>
                <strong>Ratings</strong> &mdash; Value, Growth, Profitability, Momentum, Health,
                plus a composite letter grade. Industry-normalized.
              </li>
              <li>
                <strong>Model Portfolios</strong> &mdash; Best High Yield, Best Growth, Best
                Protection, Best Monthly, Dividend Capture &mdash; rebuilt against the current
                composite rating.
              </li>
              <li>
                <strong>Ex-Dividend Calendar</strong> &mdash; every upcoming ex-dividend, record
                and payment date for the next 365 days.
              </li>
              <li>
                <strong>Full Financials</strong> &mdash; income statement, balance sheet and cash
                flow with multi-year history and per-statement detail pages.
              </li>
              <li>
                <strong>ETF Detail</strong> &mdash; expense ratio, AUM, top-50 holdings, sector
                breakdown, distribution history, composite rating.
              </li>
            </ul>

            <h2>Pricing</h2>
            <p>
              Free tier: explore everything, the data is just visually paywalled on identifying
              fields. Premium is &euro;100/year &mdash; less than half what comparable US tools
              charge.{" "}
              <Link href="/pricing" className="dv-action-link dv-action-link--accent">
                See plans →
              </Link>
            </p>

            <h2>Independence</h2>
            <p>
              We&apos;re not a broker, we&apos;re not an investment adviser, and we don&apos;t
              accept payment for ratings. Read our{" "}
              <Link href="/legal/disclaimer" className="dv-action-link">Investment Disclaimer</Link>{" "}
              for the full statement.
            </p>

            <h2>Contact</h2>
            <p>
              Spot a bug? Want a feature? Found data that looks off?{" "}
              <Link href="/contact" className="dv-action-link">Tell us</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Investment Disclaimer",
  description: `${APP_NAME} provides educational research, not investment advice. Read the full disclaimer.`,
};

const LAST_UPDATED = "2026-05-27";

export default function DisclaimerPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Legal"
          title="Investment Disclaimer"
          description={`${APP_NAME} provides educational research. It is not, and should not be construed as, personal investment advice.`}
          meta={`Last updated: ${LAST_UPDATED}.`}
        />

        <section className="dv-section">
          <div className="dv-prose">
            <h2>Not investment advice</h2>
            <p>
              <strong>
                The content on {APP_NAME} is for general informational and educational purposes only.
                It does not constitute investment advice, financial advice, trading advice, tax advice,
                legal advice, or any other professional advice.
              </strong>{" "}
              {APP_NAME} is not a registered investment adviser, broker-dealer, or financial planner
              in any jurisdiction, and nothing on this Service should be construed as a recommendation
              to buy, sell, or hold any security.
            </p>

            <h2>No personalization</h2>
            <p>
              Our ratings, model portfolios, capture-strategy analyses, dividend projections and
              screener results are derived from publicly available financial data using rule-based
              models. They do not take into account your specific financial situation, objectives,
              risk tolerance, tax position or jurisdiction. They are not personal recommendations.
            </p>

            <h2>Risk of loss</h2>
            <p>
              Investing in equities involves risk, including the loss of principal. Dividends are not
              guaranteed: companies may cut, suspend or eliminate their dividends at any time. Past
              performance is not indicative of future results. Forward-looking statements (such as
              projected yields, recovery days, or growth rates) are estimates and may differ materially
              from actual outcomes.
            </p>

            <h2>Data accuracy</h2>
            <p>
              Market data is sourced from SEC filings and a leading financial data provider. While we
              strive for accuracy, we do not guarantee that any information shown is complete,
              current, or error-free. <strong>Do not make investment decisions based solely on data
              displayed on {APP_NAME}.</strong> Always verify with primary sources (issuer filings,
              your broker, the issuer&apos;s investor-relations site) before trading.
            </p>

            <h2>Do your own research</h2>
            <p>
              You alone are responsible for your investment decisions. Before acting on any information
              displayed on {APP_NAME}, you should:
            </p>
            <ul>
              <li>Conduct independent research and read the relevant SEC filings.</li>
              <li>Consider your personal financial situation, goals and time horizon.</li>
              <li>Consult a licensed financial adviser, accountant and/or attorney as appropriate.</li>
            </ul>

            <h2>Affiliate links & conflicts of interest</h2>
            <p>
              {APP_NAME} may include affiliate or partner links in the future. If we do, we will
              clearly disclose them. Authors and operators of {APP_NAME} may personally hold positions
              in securities discussed on the Service; this does not constitute a recommendation.
            </p>

            <h2>Jurisdiction</h2>
            <p>
              {APP_NAME} is offered globally but is not directed at any specific jurisdiction. Some
              content may not be appropriate or available for use in certain jurisdictions. It is
              your responsibility to comply with local laws governing securities information.
            </p>

            <h2>By using the Service you acknowledge that you have read and accepted this disclaimer.</h2>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

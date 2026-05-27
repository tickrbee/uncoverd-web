import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing your use of the ${APP_NAME} dividend research platform.`,
};

const LAST_UPDATED = "2026-05-27";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Legal"
          title="Terms of Service"
          description={`These Terms govern your use of ${APP_NAME}. Please read them carefully before using the platform.`}
          meta={`Last updated: ${LAST_UPDATED}.`}
        />

        <section className="dv-section">
          <div className="dv-prose">
            <h2>1. Acceptance of these Terms</h2>
            <p>
              By accessing or using {APP_NAME} (the &quot;Service&quot;), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service. We may update these Terms
              from time to time; continued use after an update constitutes acceptance.
            </p>

            <h2>2. Not investment advice</h2>
            <p>
              <strong>
                {APP_NAME} is an informational and research tool. Nothing on the Service is, or should
                be construed as, investment, financial, tax, legal or accounting advice.
              </strong>{" "}
              We are not a registered investment adviser, broker-dealer, or financial planner. Ratings,
              model portfolios, capture-strategy analyses, dividend projections and any other output
              are educational summaries derived from publicly available data &mdash; not personal
              recommendations.
            </p>
            <p>
              Past performance is not indicative of future results. All investments carry risk,
              including the loss of principal. You should consult a licensed financial professional
              before making any investment decision and conduct your own due diligence. See our{" "}
              <Link href="/legal/disclaimer" className="dv-action-link">Investment Disclaimer</Link>{" "}
              for the full statement.
            </p>

            <h2>3. Eligibility & accounts</h2>
            <p>
              You must be at least 18 years old (or the age of majority in your jurisdiction) to use
              the Service. You are responsible for the accuracy of the information you provide and for
              maintaining the confidentiality of your account credentials. You agree to notify us
              promptly of any unauthorized use of your account.
            </p>

            <h2>4. Subscriptions, billing & refunds</h2>
            <p>
              The Service offers a free tier and a Premium subscription tier (currently &euro;100/year,
              billed annually). Premium auto-renews at the end of each billing period unless cancelled
              before renewal through your account settings.
            </p>
            <p>
              Payments are processed by Stripe. By subscribing, you authorize us to charge your
              payment method for the subscription fee plus applicable taxes. Subscription fees are
              non-refundable except where required by law. If you are an EU/UK consumer you may have
              statutory withdrawal rights; cancelling within 14 days of initial subscription will
              produce a pro-rated refund unless you have begun using paid features.
            </p>
            <p>
              You may cancel at any time from your{" "}
              <Link href="/account" className="dv-action-link">Account</Link> page. Cancellation
              takes effect at the end of the current billing period.
            </p>

            <h2>5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Scrape, reverse-engineer, or systematically extract data from the Service without our written permission.</li>
              <li>Use the Service to build a competing product or republish our ratings, model portfolios, or research output.</li>
              <li>Circumvent paywalls, share login credentials, or use multiple accounts to evade limits.</li>
              <li>Upload malware, attempt to interfere with the Service&apos;s operation, or probe its security without authorization.</li>
              <li>Use the Service for any unlawful purpose or to violate the rights of others.</li>
            </ul>

            <h2>6. Intellectual property</h2>
            <p>
              The Service, including its design, code, ratings methodology and editorial content, is
              owned by {APP_NAME} and protected by intellectual-property laws. Market data (prices,
              dividends, fundamentals) is licensed from third-party providers and ultimately derived
              from SEC filings and other public sources. We grant you a personal, non-exclusive,
              non-transferable license to access the Service for individual research use.
            </p>

            <h2>7. Third-party services & data accuracy</h2>
            <p>
              We rely on third parties for market data, payment processing, authentication, hosting
              and analytics. While we strive for accuracy, we do not guarantee that any data shown is
              complete, current, or error-free. <strong>Do not make investment decisions solely on
              the basis of data displayed on the Service.</strong>
            </p>

            <h2>8. Disclaimers & limitation of liability</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
              of any kind, express or implied. To the maximum extent permitted by law, {APP_NAME}{" "}
              disclaims all warranties, including merchantability, fitness for a particular purpose,
              and non-infringement.
            </p>
            <p>
              In no event shall {APP_NAME}, its officers, employees or affiliates be liable for any
              indirect, incidental, special, consequential or punitive damages, or any loss of
              profits, revenue, data, or investments, arising from your use of the Service. Our total
              aggregate liability is capped at the amount you paid us in the 12 months preceding the
              claim, or &euro;100, whichever is greater.
            </p>

            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate your access at any time for breach of these Terms or for
              any other reason at our reasonable discretion. You may terminate your account at any
              time. Sections that by their nature should survive termination (intellectual property,
              disclaimers, limitation of liability, governing law) will survive.
            </p>

            <h2>10. Changes to the Service</h2>
            <p>
              We may modify, suspend or discontinue features at any time. If a material change
              adversely affects your paid subscription, we will offer a pro-rated refund of the unused
              portion.
            </p>

            <h2>11. Governing law & disputes</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which {APP_NAME} is
              established, without regard to conflict-of-laws principles. Any disputes will be
              resolved in the competent courts of that jurisdiction, subject to any mandatory consumer
              protections in your country of residence.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <Link href="/contact" className="dv-action-link">our contact page</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

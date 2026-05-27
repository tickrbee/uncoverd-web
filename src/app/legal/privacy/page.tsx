import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_NAME} collects, uses, and protects your personal data.`,
};

const LAST_UPDATED = "2026-05-27";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          description={`How ${APP_NAME} collects, uses, and protects your personal information.`}
          meta={`Last updated: ${LAST_UPDATED}.`}
        />

        <section className="dv-section">
          <div className="dv-prose">
            <h2>1. Who we are</h2>
            <p>
              {APP_NAME} (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is the data controller for
              personal information collected through this Service. If you have any privacy questions,
              reach us via the{" "}
              <Link href="/contact" className="dv-action-link">Contact</Link> page.
            </p>

            <h2>2. What we collect</h2>
            <p>We only collect what we need to deliver the Service:</p>
            <ul>
              <li>
                <strong>Account data</strong> &mdash; email address, hashed password, display name, and
                subscription tier. Required to give you access to your account.
              </li>
              <li>
                <strong>Payment data</strong> &mdash; billing information is collected and processed by
                Stripe. We receive a subscription identifier and metadata (status, amount, currency)
                but never store full card numbers on our servers.
              </li>
              <li>
                <strong>Usage data</strong> &mdash; pages viewed, watchlist items, screener filters,
                and similar product-usage signals stored under your account.
              </li>
              <li>
                <strong>Diagnostic & analytics data</strong> &mdash; aggregate, anonymized traffic
                signals collected via Vercel Analytics and Vercel Speed Insights (page paths, device
                type, country, performance metrics). These do not use cookies and do not identify
                individuals.
              </li>
              <li>
                <strong>Logs</strong> &mdash; standard server logs (IP address, user-agent, timestamps)
                retained for up to 30 days for security and debugging purposes.
              </li>
            </ul>

            <h2>3. How we use it</h2>
            <ul>
              <li>To provide and improve the Service (account access, watchlists, ratings, billing).</li>
              <li>To send transactional emails (sign-up confirmation, password reset, billing receipts).</li>
              <li>To detect, investigate and prevent fraud, abuse and security incidents.</li>
              <li>To comply with legal obligations (tax, accounting, lawful requests from authorities).</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal information to third parties. We do not
              run targeted advertising trackers on the Service today.
            </p>

            <h2>4. Legal bases (GDPR)</h2>
            <p>If you are in the EEA/UK, we process your personal data on the following legal bases:</p>
            <ul>
              <li><strong>Contract</strong> &mdash; processing necessary to provide the Service you signed up for.</li>
              <li><strong>Legitimate interests</strong> &mdash; product analytics, security, fraud prevention.</li>
              <li><strong>Consent</strong> &mdash; optional marketing emails (you can opt out at any time).</li>
              <li><strong>Legal obligation</strong> &mdash; tax records, regulatory compliance.</li>
            </ul>

            <h2>5. Sub-processors</h2>
            <p>We use the following sub-processors to run the Service:</p>
            <ul>
              <li><strong>Supabase</strong> &mdash; authentication, application database, file storage (EU region).</li>
              <li><strong>Stripe</strong> &mdash; payment processing.</li>
              <li><strong>Vercel</strong> &mdash; web hosting, analytics, and performance monitoring.</li>
              <li><strong>Resend / email provider</strong> &mdash; transactional email delivery.</li>
            </ul>
            <p>
              Each sub-processor is bound by appropriate data-protection agreements. International
              transfers (e.g., to the US) rely on Standard Contractual Clauses or equivalent
              safeguards.
            </p>

            <h2>6. Cookies & local storage</h2>
            <p>We use a minimal set of first-party cookies / local storage:</p>
            <ul>
              <li><strong>Strictly necessary</strong> &mdash; session token (Supabase auth) and your selected display currency. These are required for the Service to work and do not need consent under GDPR.</li>
              <li><strong>No third-party advertising cookies</strong> are set on this Service.</li>
            </ul>

            <h2>7. Data retention</h2>
            <ul>
              <li>Account data: kept while your account is active, plus up to 90 days after deletion for backups.</li>
              <li>Billing records: retained for the period required by tax law (typically 7 years in most jurisdictions).</li>
              <li>Server logs: 30 days.</li>
            </ul>

            <h2>8. Your rights</h2>
            <p>If you are in the EEA/UK/California, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data (subject to legal retention requirements).</li>
              <li>Restrict or object to processing.</li>
              <li>Data portability (export your account data).</li>
              <li>Lodge a complaint with your local data-protection authority.</li>
            </ul>
            <p>
              To exercise any of these rights, email us via the{" "}
              <Link href="/contact" className="dv-action-link">Contact</Link> page from the email
              address associated with your account.
            </p>

            <h2>9. Security</h2>
            <p>
              We protect your data with industry-standard measures: TLS in transit, encryption at
              rest, hashed passwords, row-level security on the database, and least-privilege access
              for staff. No system is perfectly secure; if we discover a breach affecting your
              personal data we will notify you and the relevant authorities within the timeframes
              required by law.
            </p>

            <h2>10. Children</h2>
            <p>
              The Service is not directed at children under 18 and we do not knowingly collect their
              personal data. If you believe we have done so, contact us and we will delete it.
            </p>

            <h2>11. Changes to this Policy</h2>
            <p>
              We may update this Policy occasionally. When we make material changes we will notify
              you by email or via an in-app banner and update the &quot;last updated&quot; date above.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions or rights requests? Reach us at our{" "}
              <Link href="/contact" className="dv-action-link">Contact</Link> page.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { faqJsonLd, jsonLdScript } from "@/lib/structured-data";
import { metaDescription } from "@/lib/seo";
import { DividendCalculator } from "./calculator";

const FAQS = [
  {
    q: "How do you calculate dividend income?",
    a: "Multiply the number of shares you own by the annual dividend per share. For example, 100 shares paying $2.00 per share = $200 per year. Divide by 12 for monthly income or by 4 for quarterly.",
  },
  {
    q: "How is dividend yield calculated?",
    a: "Dividend yield = annual dividend per share ÷ share price. A $2.00 dividend on a $50 stock is a 4% yield. When the price falls the yield rises, so a very high yield can be a warning sign.",
  },
  {
    q: "What does reinvesting dividends (DRIP) do?",
    a: "A Dividend Reinvestment Plan uses each payout to buy more shares, which then pay their own dividends. Over years this compounding meaningfully increases both your share count and your income — toggle DRIP on in the calculator to see the difference.",
  },
  {
    q: "Does this account for dividend growth?",
    a: "Yes. The annual dividend-growth input raises the per-share dividend each year, which is how quality dividend stocks tend to behave. It assumes a constant share price, so treat the projection as an income estimate, not a price forecast.",
  },
];

export const metadata: Metadata = {
  title: "Dividend Calculator",
  description: metaDescription(
    "Free dividend calculator: work out your annual, quarterly and monthly dividend income, yield, and projected growth with dividend reinvestment (DRIP) over time.",
  ),
  alternates: { canonical: "/tools/dividend-calculator" },
  openGraph: {
    title: "Dividend Calculator",
    description:
      "Calculate dividend income, yield, and DRIP-reinvested growth over time.",
    type: "website",
    url: "/tools/dividend-calculator",
  },
};

export default function DividendCalculatorPage() {
  const faqSchema = faqJsonLd(FAQS);
  return (
    <>
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }} />
      )}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Tools"
          title="Dividend Calculator"
          description="Work out your dividend income and yield, then project how reinvesting dividends compounds your income over time."
        />

        <section className="dv-section">
          <DividendCalculator />
        </section>

        <section className="dv-section">
          <div className="dv-prose dv-blog-prose">
            <h2>How the dividend calculator works</h2>
            <p>Three simple formulas drive every result:</p>
            <ul>
              <li><strong>Dividend income</strong> = shares × annual dividend per share</li>
              <li><strong>Dividend yield</strong> = annual dividend per share ÷ share price</li>
              <li><strong>With DRIP</strong>, each payout buys more shares, so next year&apos;s income is paid on a larger position — that&apos;s compounding.</li>
            </ul>
            <p>
              To find a real stock&apos;s dividend and yield, open its profile from the{" "}
              <Link href="/screener" className="dv-action-link">dividend screener</Link> or browse{" "}
              <Link href="/stocks" className="dv-action-link">all dividend stocks A–Z</Link>. For the maths in
              detail, see{" "}
              <Link href="/blog/how-to-calculate-dividend-payout" className="dv-action-link">
                how to calculate dividend payout
              </Link>.
            </p>
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">Frequently asked questions</h2>
          <div className="dv-faq-list">
            {FAQS.map((qa, i) => (
              <details key={i} className="dv-faq-item">
                <summary>{qa.q}</summary>
                <p>{qa.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

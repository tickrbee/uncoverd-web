import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PricingCards } from "@/components/pricing-cards";
import { SessionRestorer } from "@/components/session-restorer";
import { T } from "@/components/t";

export const metadata: Metadata = {
  title: "Pricing — uncoverd Premium",
  description:
    "uncoverd Premium is $100/year (about $8.33/mo): dividend ratings on every stock, model portfolios, best-dividend lists, dividend-capture picks, a payout estimator, watchlist alerts, CSV export and ad-free research. Cancel anytime.",
  alternates: { canonical: "/pricing" },
};

// Free vs Premium. true = included · false = not · string = a qualifier.
const COMPARISON: { label: string; free: boolean | string; premium: boolean | string }[] = [
  { label: "Stock & ETF screener", free: "Basic filters", premium: "Advanced filters" },
  { label: "Ex-dividend calendar", free: true, premium: true },
  { label: "Dividend news feed", free: true, premium: "In-depth + research" },
  { label: "Stock profiles & full dividend history", free: true, premium: true },
  { label: "Dividend ratings (A–F) on every stock", free: false, premium: true },
  { label: "Model Portfolios — High Yield, Growth, Protection", free: false, premium: true },
  { label: "Best Monthly & Best-by-Sector dividend lists", free: false, premium: true },
  { label: "Best Dividend-Capture stocks", free: false, premium: true },
  { label: "Upcoming increases, cuts, initiations & specials", free: false, premium: true },
  { label: "Payout estimator & compounding calculator", free: false, premium: true },
  { label: "Watchlist with dividend alerts", free: false, premium: true },
  { label: "CSV / spreadsheet downloads", free: false, premium: true },
  { label: "Ad-free experience", free: false, premium: true },
];

const HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: "A rating on every stock",
    body: "An A–F dividend score for all 65,000+ tickers — Value, Growth, Profitability, Momentum and Health, each standardised against industry peers so the grade actually means something.",
  },
  {
    title: "Model Portfolios",
    body: "Ready-built High-Yield, Growth and Protection baskets, constructed from our ratings — so you start from a vetted shortlist, not a blank screener.",
  },
  {
    title: "Curated best-of lists",
    body: "The best monthly payers, the best in each sector, and the best dividend-capture candidates — screened and ranked, not just sorted by yield.",
  },
  {
    title: "Never miss a change",
    body: "Upcoming increasers, cuts, initiations and special dividends — see who's about to raise (or slash) the payout before the market reprices it.",
  },
  {
    title: "Income tools",
    body: "A payout estimator and compounding calculator to project real income over time, plus a watchlist that alerts you on the names you follow.",
  },
  {
    title: "Your data, exportable",
    body: "Download any list or screen to CSV for your own spreadsheets and models — and browse the entire site completely ad-free.",
  },
];

const FAQ: { q: string; a: string }[] = [
  { q: "How much is Premium?", a: "$100 per year — about $8.33 a month — for everything listed above. One plan, no hidden tiers." },
  { q: "Can I cancel anytime?", a: "Yes. Manage or cancel in one click from your account, and you keep full access until the end of the billing period." },
  { q: "What stays free?", a: "The screener with basic filters, the ex-dividend calendar, the dividend news feed, and every stock's profile and dividend history are free forever — no account required." },
  { q: "How do payments work?", a: "Checkout and billing are handled securely by Stripe. We never see or store your card details, and you'll get a receipt for every charge." },
  { q: "How is this different from other dividend sites?", a: "You get ratings, curated best-of lists, model portfolios, an ex-dividend calendar, alerts, income tools and a screener — the core of a premium dividend-research suite — for a flat $100/year, typically well below comparable services." },
];

function Mark({ v }: { v: boolean | string }) {
  if (v === true) return <span aria-label="Included" style={{ color: "var(--positive)", fontWeight: 700 }}>✓</span>;
  if (v === false) return <span aria-label="Not included" style={{ color: "var(--text-muted)" }}>—</span>;
  return <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <SessionRestorer />
      <SiteHeader />
      <main className="dv-page">
        {/* Hero */}
        <section
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 100%)" }}
        >
          <p className="dv-eyebrow"><T>Pricing</T></p>
          <h1><T>Serious dividend research, without the Wall-Street price tag</T></h1>
          <p style={{ maxWidth: "60ch", marginTop: "0.6rem", color: "rgba(255,255,255,0.85)" }}>
            <T>
              Ratings on every stock, model portfolios, curated best-of lists, dividend-capture
              picks, income tools and alerts — all of it for one flat price.
            </T>
          </p>
          <p style={{ marginTop: "0.85rem", fontSize: "1.05rem" }}>
            <strong>Premium — $100 / year</strong>{" "}
            <span style={{ color: "rgba(255,255,255,0.75)" }}>(<T>about $8.33 / month</T>)</span>
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>
            <T>Cancel anytime · Secure checkout via Stripe · Instant access</T>
          </p>
        </section>

        {/* Plan cards (checkout) */}
        <PricingCards />

        {/* What Premium unlocks */}
        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <h2 className="dv-section__title"><T>What Premium unlocks</T></h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                style={{
                  padding: "1.1rem 1.2rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <h3 style={{ margin: "0 0 0.45rem", fontSize: "1rem" }}><T>{h.title}</T></h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  <T>{h.body}</T>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Free vs Premium comparison */}
        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <h2 className="dv-section__title"><T>Free vs Premium</T></h2>
          <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th style={{ width: "55%" }}><T>Feature</T></th>
                    <th className="dv-th--num"><T>Free</T></th>
                    <th className="dv-th--num"><T>Premium</T></th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.label}>
                      <td><T>{row.label}</T></td>
                      <td className="dv-td--num"><Mark v={row.free} /></td>
                      <td className="dv-td--num"><Mark v={row.premium} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <h2 className="dv-section__title"><T>Pricing FAQ</T></h2>
          <div className="dv-faq-list">
            {FAQ.map((qa) => (
              <details key={qa.q} className="dv-faq-item">
                <summary><T>{qa.q}</T></summary>
                <p><T>{qa.a}</T></p>
              </details>
            ))}
          </div>
        </section>

        <p style={{ margin: "2rem 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          <T>Questions before you upgrade?</T>{" "}
          <Link href="/contact" className="dv-action-link"><T>Get in touch</T></Link>
          {" · "}
          <Link href="/screener" className="dv-action-link"><T>Explore the free screener</T></Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

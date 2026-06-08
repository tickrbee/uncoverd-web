import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DividendTable } from "@/components/dividend-table";
import { redactRowsForFree, getStockRatings, type StockRow } from "@/lib/data";
import { buildBestYearRows, getMonthlyTopPick } from "@/lib/picks";
import { MonthlyCountdown } from "@/components/monthly-countdown";
import { breadcrumbList, faqJsonLd, jsonLdScript } from "@/lib/structured-data";

// Revalidate hourly so the pinned monthly pick rolls over to the new month and
// the ranking refreshes without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Best Dividend Stocks This Month — uncoverd's Top-Rated Picks",
  description:
    "uncoverd's top-rated dividend stocks, re-ranked daily by our A–F composite rating across Value, Growth, Profitability, Momentum and Health. See this month's #1 pick.",
  alternates: { canonical: "/best-stocks" },
};

const MONTH = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
const ACCENT = "#15b87f";

export default async function BestStocksFunnelPage() {
  let realRows: StockRow[] = [];
  try {
    realRows = await buildBestYearRows();
  } catch (e) {
    console.error(e);
  }
  // Featured pick = this month's PINNED top pick (stable all month), so the
  // headline doesn't change day to day. We only surface its sector + grade; the
  // name stays gated behind sign-up / Pro. Falls back to the live #1.
  const pick = await getMonthlyTopPick();
  let topGrade = pick?.grade || "A";
  const topSector = pick?.sector || realRows[0]?.sector || "large-cap";
  if (!pick && realRows[0]) {
    try {
      const r = (await getStockRatings([realRows[0].symbol])).get(realRows[0].symbol);
      if (r?.composite_grade) topGrade = r.composite_grade;
    } catch { /* ignore */ }
  }
  const rows = redactRowsForFree(realRows, false);

  const breadcrumbs = breadcrumbList([
    { name: "Home", url: "/" },
    { name: "Best Stocks This Month", url: "/best-stocks" },
  ]);
  const faqs = [
    { q: "How is the monthly top pick chosen?", a: "It's the dividend stock with the highest uncoverd composite rating — a 5-pillar score combining Value, Growth, Profitability, Momentum and Health, standardised against industry peers. There's no editorial hand-picking; the ranking is produced by the model and re-ranks as data updates." },
    { q: "Is this investment advice?", a: "No. uncoverd produces independent research and rankings. This is educational information, not personalised advice — do your own due diligence and consider consulting a licensed professional before investing." },
    { q: "What do I get for free vs Pro?", a: "A free account lets you follow along; the full ranking with every stock's A–F rating, the pillar breakdown and the research thesis is part of uncoverd Pro ($100/year)." },
  ];
  const faqSchema = faqJsonLd(faqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }} />}
      <SiteHeader />
      <main className="dv-page">
        {/* Hero */}
        <section className="dv-section" style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT, marginBottom: 12 }}>
            Top-Rated Dividend Stocks · {MONTH}
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 auto 14px", maxWidth: 760, lineHeight: 1.1 }}>
            This month's highest-rated dividend stocks
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.02rem", lineHeight: 1.6, maxWidth: 620, margin: "0 auto 18px" }}>
            Ranked by uncoverd's A–F composite rating across Value, Growth, Profitability, Momentum and Health — re-ranked automatically as the data updates, with no hand-picking.
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <span>✓ 65,000+ tickers rated</span>
            <span>✓ 5-pillar methodology</span>
            <span>✓ Updates daily</span>
          </div>
        </section>

        {/* #1 pick teaser (gated) */}
        <section className="dv-section">
          <div style={{ position: "relative", border: `1px solid ${ACCENT}55`, borderRadius: 16, padding: "26px 24px", background: `linear-gradient(180deg, ${ACCENT}10, transparent)`, textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>
              🔒 This month's #1-rated pick
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              A <span style={{ color: ACCENT }}>{topSector}</span> dividend stock rated <span style={{ color: ACCENT }}>{topGrade}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <MonthlyCountdown accent={ACCENT} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: "0 auto 18px", maxWidth: 480 }}>
              Create a free account to reveal the name — and unlock the full top-30 ranking with every stock's rating.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/signup?next=%2Fbest-stocks" className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 700 }}>
                Create your free account →
              </Link>
              <Link href="/pricing" className="btn btn--ghost">See Pro plans</Link>
            </div>
          </div>
        </section>

        {/* Gated ranking */}
        <section className="dv-section">
          <h2 className="dv-section__title">This month's ranking</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 14 }}>
            Names and ratings unlock with a free account; the full A–F breakdown and research thesis are part of uncoverd Pro.
          </p>
          <DividendTable
            rows={rows}
            isPremium={false}
            revealPremium
            revealRowsEndpoint="/api/picks/premium?list=best-year"
            view="ratings"
          />
        </section>

        {/* CTA band */}
        <section className="dv-section">
          <div style={{ border: `1px solid ${ACCENT}44`, borderRadius: 16, padding: "30px 24px", textAlign: "center", background: `linear-gradient(135deg, ${ACCENT}14, transparent 70%)` }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px" }}>Stop guessing which dividend stock to buy</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 auto 20px", maxWidth: 520 }}>
              Get every stock's A–F rating, the pillar breakdown, model portfolios and the monthly top pick — for $100/year. Cancel anytime.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/pricing" className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 700 }}>Get Pro — $100 / year</Link>
              <Link href="/signup?next=%2Fbest-stocks" className="btn btn--ghost">Start with a free account</Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="dv-section">
          <h2 className="dv-section__title">FAQ</h2>
          <div className="dv-faq-list">
            {faqs.map((qa, i) => (
              <details key={i} className="dv-faq-item">
                <summary>{qa.q}</summary>
                <p>{qa.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Educational research, not investment advice. See also{" "}
          <Link href="/best-dividend-stocks" className="dv-action-link">Best Dividend Stocks by year</Link> and{" "}
          <Link href="/high-yield" className="dv-action-link">High-Yield picks</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

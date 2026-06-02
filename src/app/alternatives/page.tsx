import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareSearch } from "../compare/compare-search";
import { T } from "@/components/t";

export const metadata: Metadata = {
  title: "Find Alternatives to Any Dividend Stock or ETF",
  description:
    "Type a ticker and see comparable dividend stocks or ETFs with higher yield, better rating, cheaper valuation, lower expense ratio, or stronger balance sheet. Data-driven peer analysis.",
  alternates: { canonical: "/alternatives" },
};

// Empty landing for /alternatives — the actual report lives at
// /alternatives/[symbol]. This page exists so the URL is discoverable
// in search and there's somewhere for users to land if they hit
// /alternatives directly. Routes the picker straight to a per-symbol page.

export default function AlternativesIndex() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section className="dv-compare-hero">
          <div className="dv-eyebrow"><T>Tools</T></div>
          <h1 style={{ margin: "0.4rem 0", fontSize: "2.1rem", letterSpacing: "-0.02em" }}>
            <T>Find an alternative</T>
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", maxWidth: 660, fontSize: "1.02rem", lineHeight: 1.55 }}>
            <T>Type a dividend stock or ETF and see comparable peers ranked by what they do better — higher yield, better rating, cheaper valuation, lower expense ratio, or stronger balance sheet.</T>
          </p>
        </section>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          {/* Reuse the compare-search picker — it does ticker typeahead. We
              wrap with a per-symbol redirect via a custom slot prefix... but
              since the picker pushes to /compare, we add a simple text input
              alternative that navigates to /alternatives/[symbol]. */}
          <AlternativeSearchInline />
        </section>

        <section className="dv-section" style={{ marginTop: "2.5rem" }}>
          <h2 className="dv-section__title">Popular alternatives lookups</h2>
          <div className="dv-compare-examples">
            {[
              { sym: "SCHD", desc: "Alternative dividend ETFs to SCHD" },
              { sym: "VYM", desc: "Find a higher-yield VYM peer" },
              { sym: "JEPI", desc: "Other covered-call income ETFs" },
              { sym: "JNJ", desc: "Dividend Kings comparable to JNJ" },
              { sym: "KO", desc: "Consumer-staples dividend peers" },
              { sym: "O", desc: "Monthly-paying REIT alternatives" },
              { sym: "XOM", desc: "Energy dividend peers" },
              { sym: "T", desc: "High-yield telecom alternatives" },
            ].map((e) => (
              <Link key={e.sym} href={`/alternatives/${e.sym}`} className="dv-compare-example-card">
                <span className="dv-compare-example-card__title">Alternatives to {e.sym}</span>
                <span className="dv-compare-example-card__desc">{e.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Tiny no-JS fallback explanation under the picker — when the page is
            rendered server-side / before JS hydrates. */}
        <section className="dv-section" style={{ marginTop: "2rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Tip: you can also link directly to a ticker — e.g.
            {" "}<Link href="/alternatives/SCHD" className="dv-action-link dv-action-link--accent">/alternatives/SCHD</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// Inline picker that navigates to /alternatives/[symbol] on selection.
// Reuses CompareSearch's UI by passing currentSymbols=[] and intercepting.
// Simpler than duplicating: we render a basic input + suggestion list here.
function AlternativeSearchInline() {
  return <CompareSearch slot="a" currentSymbols={[]} mode="alternative" />;
}

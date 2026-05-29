import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { GLOSSARY } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Dividend investing glossary",
  description:
    "Plain-English definitions of every dividend-investing term: dividend yield, ex-dividend date, payout ratio, dividend aristocrats, yield traps, and more.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryIndexPage() {
  const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Glossary"
          title="Dividend investing glossary"
          description="Plain-English definitions of every term you'll see on uncoverd — written with concrete examples and links to the data."
        />
        <section className="dv-section">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {sorted.map((e) => (
              <Link
                key={e.slug}
                href={`/glossary/${e.slug}`}
                style={{
                  display: "block",
                  padding: "1rem 1.1rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{e.term}</h3>
                <p
                  style={{
                    margin: "0.35rem 0 0",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    lineHeight: 1.4,
                  }}
                >
                  {e.short}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

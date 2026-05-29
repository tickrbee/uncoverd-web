import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { GLOSSARY, getEntry } from "@/lib/glossary";
import { breadcrumbList, faqJsonLd, jsonLdScript } from "@/lib/structured-data";

export async function generateStaticParams() {
  return GLOSSARY.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = getEntry(slug);
  if (!e) return { title: "Glossary" };
  return {
    title: `${e.term} — definition + examples`,
    description: e.short,
    alternates: { canonical: `/glossary/${e.slug}` },
    openGraph: {
      title: `What is ${e.term}?`,
      description: e.short,
      type: "article",
      url: `/glossary/${e.slug}`,
    },
  };
}

export default async function GlossaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  const related = (entry.relatedSlugs ?? [])
    .map((s) => getEntry(s))
    .filter((e): e is NonNullable<typeof e> => !!e);

  const breadcrumbs = breadcrumbList([
    { name: "Home", url: "/" },
    { name: "Glossary", url: "/glossary" },
    { name: entry.term, url: `/glossary/${entry.slug}` },
  ]);
  const faqSchema = entry.faq ? faqJsonLd(entry.faq) : null;
  const definitionSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `https://uncoverd.org/glossary/${entry.slug}`,
    name: entry.term,
    description: entry.body,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": "https://uncoverd.org/glossary",
      name: "uncoverd dividend investing glossary",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(definitionSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }}
        />
      )}
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Glossary"
          title={entry.term}
          description={entry.short}
        />

        <section className="dv-section">
          <div className="dv-prose">
            <p>{entry.body}</p>
            {entry.examples && entry.examples.length > 0 && (
              <>
                <h3>Examples</h3>
                <ul>
                  {entry.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        {entry.faq && entry.faq.length > 0 && (
          <section className="dv-section">
            <h2 className="dv-section__title">Frequently asked</h2>
            <div className="dv-faq-list">
              {entry.faq.map((qa, i) => (
                <details key={i} className="dv-faq-item">
                  <summary>{qa.q}</summary>
                  <p>{qa.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="dv-section">
            <h2 className="dv-section__title">Related terms</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/glossary/${r.slug}`}
                  style={{
                    display: "block",
                    padding: "0.85rem 1rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{r.term}</h3>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      color: "var(--text-secondary)",
                      fontSize: "0.82rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {r.short}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/glossary" className="dv-action-link">
            ← Back to glossary
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

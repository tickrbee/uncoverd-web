import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DirectoryIndex } from "@/components/directory-index";
import { Pager } from "@/components/pager";
import { listDirectory, countDirectory } from "@/lib/data";
import { isValidBucket, bucketLabel, DIRECTORY_PAGE_SIZE, DIRECTORY_BUCKETS } from "@/lib/directory";
import { metaDescription } from "@/lib/seo";

export const revalidate = 86400;

// Prerender the A–Z hub shells at build; deeper pages render on demand.
export function generateStaticParams() {
  return DIRECTORY_BUCKETS.map((b) => ({ letter: b.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ letter: string }>;
}): Promise<Metadata> {
  const { letter } = await params;
  if (!isValidBucket(letter)) return { title: "Browse Dividend Stocks" };
  const label = bucketLabel(letter);
  return {
    title: `Dividend Stocks Starting With ${label}`,
    description: metaDescription(
      `Every dividend-paying stock with a ticker starting with ${label}. Open any company for its dividend yield, payout history, ratings and financials on uncoverd.`
    ),
    alternates: { canonical: `/stocks/browse/${letter.toLowerCase()}` },
  };
}

export default async function StocksBrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ letter: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { letter } = await params;
  const sp = await searchParams;
  if (!isValidBucket(letter)) notFound();
  const bucket = letter.toUpperCase();
  const label = bucketLabel(bucket);
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * DIRECTORY_PAGE_SIZE;

  const [rows, total] = await Promise.all([
    listDirectory({ kind: "stocks", bucket, offset, limit: DIRECTORY_PAGE_SIZE }),
    countDirectory({ kind: "stocks", bucket }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Directory"
          title={`Dividend stocks starting with ${label}`}
          description={`${total.toLocaleString()} dividend ${total === 1 ? "stock" : "stocks"} — open any ticker for its full profile.`}
        />
        <section className="dv-section">
          <DirectoryIndex basePath="/stocks" active={bucket} />
        </section>
        <section className="dv-section">
          {rows.length === 0 ? (
            <div className="dv-empty">No stocks found for “{label}”.</div>
          ) : (
            <ul className="dv-az-list">
              {rows.map((r) => (
                <li key={r.symbol}>
                  <Link href={`/stocks/${r.symbol}`} className="dv-action-link">
                    <strong>{r.symbol}</strong>
                    {r.name ? <span> — {r.name}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pager page={page} totalPages={totalPages} baseHref={`/stocks/browse/${letter.toLowerCase()}`} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

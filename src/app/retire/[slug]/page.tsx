import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";

const GUIDES: Record<string, { title: string; description: string; sections: { h: string; p: string[] }[] }> = {
  "ira-guide": {
    title: "IRA Guide for Dividend Investors",
    description: "How IRAs work for dividend investors and how to maximize tax-deferred income.",
    sections: [
      {
        h: "Traditional vs. Roth IRAs",
        p: [
          "Dividends in a Traditional IRA grow tax-deferred — you pay ordinary income tax on withdrawals in retirement.",
          "In a Roth IRA, dividends grow tax-free forever and qualified withdrawals are completely tax-free, making Roths especially attractive for high-yield dividend portfolios.",
        ],
      },
      {
        h: "REITs and BDCs in an IRA",
        p: [
          "REIT and BDC distributions are taxed as ordinary income in taxable accounts. Holding them in an IRA shields you from that ordinary-income hit and lets the full distribution compound.",
        ],
      },
    ],
  },
  "life-insurance": {
    title: "Life Insurance & Annuities",
    description: "How life insurance and annuities fit into a dividend retirement plan.",
    sections: [
      {
        h: "Annuities for income",
        p: [
          "Income annuities provide guaranteed monthly income — useful as a complement to a dividend portfolio, especially if you want to lock in a portion of expenses regardless of market movements.",
        ],
      },
      {
        h: "Life insurance",
        p: [
          "Permanent life insurance can build cash value tax-deferred, but typically has higher fees than dividend-focused investments. Term insurance is usually a better pure-protection tool.",
        ],
      },
    ],
  },
  "retirement-apps": {
    title: "5 Retirement Apps Worth Trying",
    description: "Apps to plan your retirement income and track progress.",
    sections: [
      {
        h: "Top picks",
        p: [
          "1. uncoverd — dividend research and Model Portfolios.",
          "2. Personal Capital — net worth and retirement planning.",
          "3. Empower Retirement — employer plan management.",
          "4. NewRetirement — comprehensive retirement modeling.",
          "5. Quicken Simplifi — budgeting and cash flow.",
        ],
      },
    ],
  },
  "budgeting-apps": {
    title: "5 Budgeting Apps for Dividend Investors",
    description: "Track your spending and free up cash for dividend investing.",
    sections: [
      {
        h: "Recommended apps",
        p: [
          "1. YNAB (You Need A Budget) — proactive zero-based budgeting.",
          "2. Quicken Simplifi — simple, modern personal finance.",
          "3. Monarch Money — household budgeting and net worth tracking.",
          "4. Copilot — beautiful native iOS budgeting.",
          "5. Empower — free with strong investment tracking.",
        ],
      },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDES[slug];
  if (!g) return { title: "Retire" };
  return { title: g.title, description: g.description };
}

export default async function RetireGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = GUIDES[slug];
  if (!g) notFound();

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="Retire" title={g.title} description={g.description} />
        <article className="dv-prose">
          {g.sections.map((s, i) => (
            <section key={i}>
              <h2>{s.h}</h2>
              {s.p.map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

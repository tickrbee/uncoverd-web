import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";

const ARTICLES: Record<string, { title: string; description: string; content: { h: string; p: string[] }[] }> = {
  "what-is-a-dividend": {
    title: "What is a Dividend?",
    description: "Dividends are payments companies make to shareholders out of profits.",
    content: [
      {
        h: "The basics",
        p: [
          "A dividend is a portion of a company's earnings paid out to shareholders, usually in cash. Dividends are typically paid quarterly in the U.S., though some companies pay monthly, semi-annually, or annually.",
          "Boards of directors declare dividends. Once declared, three dates matter: the declaration date, the ex-dividend date (the cutoff to be eligible), and the payment date.",
        ],
      },
      {
        h: "Why companies pay dividends",
        p: [
          "Mature, profitable companies that generate more cash than they can reinvest at attractive returns often return excess capital to shareholders through dividends. Younger growth companies typically reinvest profits instead.",
        ],
      },
      {
        h: "Yield vs. growth",
        p: [
          "Dividend yield is the annual dividend divided by the share price. A 4% yield on a $50 stock means you're getting $2 per share per year. But yield alone doesn't tell the whole story — dividend growth (how fast the payout increases over time) is just as important for long-term income.",
        ],
      },
    ],
  },
  "dividend-investing-101": {
    title: "Dividend Investing 101",
    description: "The fundamentals of building a portfolio around dividend-paying stocks.",
    content: [
      {
        h: "Why dividend investing?",
        p: [
          "Dividends provide a steady cash return regardless of stock price movements. Reinvested dividends are the single biggest driver of long-term total returns in U.S. stocks.",
        ],
      },
      {
        h: "Building a dividend portfolio",
        p: [
          "Diversification matters. Spread holdings across sectors, market caps, and dividend profiles (high-yield vs. dividend growth).",
          "Look for sustainable payout ratios (the dividend as a share of earnings) — under 60% is generally healthy for most industries.",
        ],
      },
      {
        h: "Reinvest or take income?",
        p: [
          "DRIPs (Dividend Reinvestment Plans) automatically reinvest payouts into more shares, compounding returns. Investors closer to retirement may prefer to take dividends as income.",
        ],
      },
    ],
  },
  "intro-to-dividend-stocks": {
    title: "Intro to Dividend Stocks",
    description: "How to think about dividend stocks as part of your portfolio.",
    content: [
      {
        h: "What makes a good dividend stock?",
        p: [
          "Look for companies with stable earnings, strong cash flow, low debt, and a history of dividend growth. Dividend Aristocrats — S&P 500 companies that have raised dividends for 25+ years — are a classic starting point.",
        ],
      },
      {
        h: "Categories of dividend stocks",
        p: [
          "High Yield: stocks paying 5%+ yields, often REITs, MLPs, BDCs.",
          "Dividend Growth: lower current yield, but the payout grows rapidly each year.",
          "Dividend Aristocrats / Kings: long histories of consecutive increases.",
        ],
      },
    ],
  },
  drip: {
    title: "Dividend Reinvestment Plans (DRIPs)",
    description: "Compound dividend income by automatically reinvesting payouts.",
    content: [
      {
        h: "What is a DRIP?",
        p: [
          "A Dividend Reinvestment Plan automatically uses your cash dividends to buy more shares (or fractional shares) of the company paying them. Many brokerages offer free DRIPs on any dividend-paying stock.",
        ],
      },
      {
        h: "Why use a DRIP",
        p: [
          "Reinvested dividends compound. Over decades, this drives a substantial share of total returns. DRIPs also avoid the temptation to spend payouts and reduce transaction friction.",
        ],
      },
    ],
  },
  "dividend-dates": {
    title: "Key Dividend Dates Explained",
    description: "Declaration, ex-dividend, record, and payment dates.",
    content: [
      {
        h: "The four dividend dates",
        p: [
          "Declaration date: when the board approves the dividend.",
          "Ex-dividend date: you must own the stock before this date to receive the dividend. Buy on or after the ex-date and you miss the payout.",
          "Record date: usually one business day after the ex-date — the company looks at the books to see who owns the shares.",
          "Payment date: when the cash actually hits your brokerage account.",
        ],
      },
    ],
  },
  "what-is-div-yield": {
    title: "What is a Dividend Yield?",
    description: "How to interpret and compare dividend yields.",
    content: [
      {
        h: "Dividend yield = dividend / price",
        p: [
          "Yield = (annual dividend per share) / (current share price). A $4 annual dividend on a $100 stock is a 4% yield.",
          "When share prices fall, yields rise. So a very high yield often signals concern about the underlying business — always check whether the dividend is covered by earnings and cash flow before chasing yield.",
        ],
      },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLES[slug];
  if (!a) return { title: "Education" };
  return { title: a.title, description: a.description };
}

export default async function EducationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) notFound();

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="Education" title={article.title} description={article.description} />
        <article className="dv-prose">
          {article.content.map((section, i) => (
            <section key={i}>
              <h2>{section.h}</h2>
              {section.p.map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </section>
          ))}
        </article>
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/news" className="dv-action-link dv-action-link--accent">
            ← Back to news &amp; resources
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

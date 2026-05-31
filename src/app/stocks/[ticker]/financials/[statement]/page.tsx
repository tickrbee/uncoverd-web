import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatementDetail, type StatementKey } from "@/components/statement-detail";
import {
  getStock,
  incomeStatementAnnual,
  incomeStatementQuarterly,
  balanceSheetAnnual,
  balanceSheetQuarterly,
  cashFlowAnnual,
  cashFlowQuarterly,
} from "@/lib/data";
import { pickTitle, metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

const STATEMENTS: Record<StatementKey, { label: string; description: string }> = {
  income: {
    label: "Income statement",
    description: "Revenue, gross profit, operating income, EBITDA, net income and EPS — full reported history.",
  },
  "balance-sheet": {
    label: "Balance sheet",
    description: "Assets, liabilities and equity — full reported history.",
  },
  "cash-flow": {
    label: "Cash flow statement",
    description: "Operating, investing and financing activities plus free cash flow — full reported history.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string; statement: string }>;
}): Promise<Metadata> {
  const { ticker, statement } = await params;
  const upper = ticker.toUpperCase();
  const meta = STATEMENTS[statement as StatementKey];
  if (!meta) return { title: `${upper} Financials` };
  return {
    title: pickTitle([`${upper} ${meta.label} — Full History`, `${upper} ${meta.label}`]),
    description: metaDescription(`${upper} ${meta.label.toLowerCase()}: ${meta.description}`),
    alternates: { canonical: `/stocks/${upper}/financials/${statement}` },
  };
}

export default async function StatementPage({
  params,
}: {
  params: Promise<{ ticker: string; statement: string }>;
}) {
  const { ticker, statement } = await params;
  const key = statement as StatementKey;
  if (!STATEMENTS[key]) notFound();

  const symbol = ticker.toUpperCase();
  const meta = STATEMENTS[key];

  // Pull as much history as we have on record. The functions accept a `limit`
  // — pass a generous one so multi-decade payers like KO/JNJ show every year.
  const ANNUAL_LIMIT = 40;
  const QUARTERLY_LIMIT = 80;

  const [stock, annual, quarterly] = await Promise.all([
    getStock(symbol),
    key === "income"
      ? incomeStatementAnnual(symbol, ANNUAL_LIMIT)
      : key === "balance-sheet"
      ? balanceSheetAnnual(symbol, ANNUAL_LIMIT)
      : cashFlowAnnual(symbol, ANNUAL_LIMIT),
    key === "income"
      ? incomeStatementQuarterly(symbol, QUARTERLY_LIMIT)
      : key === "balance-sheet"
      ? balanceSheetQuarterly(symbol, QUARTERLY_LIMIT)
      : cashFlowQuarterly(symbol, QUARTERLY_LIMIT),
  ]);

  if (!stock) notFound();

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <p style={{ marginBottom: "0.4rem" }}>
          <Link href={`/stocks/${symbol}?tab=financials`} className="dv-action-link">
            ← Back to {symbol} financials
          </Link>
        </p>
        <section
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 100%)" }}
        >
          <p className="dv-eyebrow">{stock.name ?? symbol} ({symbol}) · Financials</p>
          <h1>{meta.label}</h1>
          <p style={{ color: "rgba(255,255,255,0.78)", marginTop: "0.5rem" }}>{meta.description}</p>
        </section>

        <StatementDetail symbol={symbol} statement={key} annual={annual} quarterly={quarterly} />

        <p style={{ marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Values shown in {stock.currency ?? "USD"}. Reported figures sourced from SEC filings via a leading financial data provider.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

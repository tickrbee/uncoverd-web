import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { getStock, getEtfHoldersOf, formatCurrency } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();
  return {
    title: `Which ETFs own ${upper}?`,
    description: `Find every ETF that holds ${upper} — weights, AUM, expense ratios, market value of each ETF's position.`,
  };
}

export default async function EtfHoldersPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  const [stock, holders] = await Promise.all([
    getStock(symbol),
    getEtfHoldersOf(symbol, 200),
  ]);

  if (!stock) notFound();

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow={`${stock.name ?? symbol} (${symbol})`}
          title={`Which ETFs own ${symbol}?`}
          description={`Every ETF in our database that holds ${symbol}, ranked by position weight. Useful for understanding basket exposure and finding ETFs that match your view on the underlying company.`}
        />

        <section className="dv-section">
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {holders.length === 0
              ? `We have no recorded ETF holdings of ${symbol}. The ETF holdings refresh weekly; small or international stocks may be under-covered.`
              : `${holders.length.toLocaleString()} ETFs hold ${symbol}.`}
          </p>

          {holders.length > 0 && (
            <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
              <div className="dv-table-scroll">
                <table className="dv-table">
                  <thead>
                    <tr>
                      <th>ETF</th>
                      <th className="dv-th--num">Weight in ETF</th>
                      <th className="dv-th--num">Position market value</th>
                      <th className="dv-th--num">Shares held</th>
                      <th className="dv-th--num">ETF AUM</th>
                      <th className="dv-th--num">Expense ratio</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.map((h) => (
                      <tr key={h.etf_symbol}>
                        <td>
                          <Link href={`/etfs/symbol/${h.etf_symbol}`} className="dv-ticker">
                            <span className="dv-ticker__name">{h.etf_symbol}</span>
                            <span className="dv-ticker__meta">{h.etf_name ?? ""}</span>
                          </Link>
                        </td>
                        <td className="dv-td--num">
                          {h.weight_percentage != null ? `${h.weight_percentage.toFixed(2)}%` : "—"}
                        </td>
                        <td className="dv-td--num">
                          {h.market_value != null
                            ? formatCurrency(h.market_value, { abbreviate: true })
                            : "—"}
                        </td>
                        <td className="dv-td--num">
                          {h.shares_number != null ? h.shares_number.toLocaleString() : "—"}
                        </td>
                        <td className="dv-td--num">
                          {h.etf_aum != null ? formatCurrency(h.etf_aum, { abbreviate: true }) : "—"}
                        </td>
                        <td className="dv-td--num">
                          {h.etf_expense_ratio != null
                            ? `${(h.etf_expense_ratio * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td>{h.etf_category ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <p style={{ marginTop: "1.5rem" }}>
          <Link href={`/stocks/${symbol}`} className="dv-action-link">
            ← Back to {symbol}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

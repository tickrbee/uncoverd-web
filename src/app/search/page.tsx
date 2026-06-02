import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { searchStocks, type StockRow } from "@/lib/data";
import { formatCurrency, formatPercent, tickerHref } from "@/lib/format";

export const metadata: Metadata = {
  title: "Search Stocks",
};

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";

  let results: StockRow[] = [];
  if (q) {
    try {
      results = await searchStocks(q, 30);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader eyebrow="Search" title={q ? `Results for "${q}"` : "Search Stocks"} />

        {!q ? (
          <div className="dv-empty">Use the search icon in the header to look up a ticker or company name.</div>
        ) : results.length === 0 ? (
          <div className="dv-empty">No matches for &quot;{q}&quot;.</div>
        ) : (
          <div className="dv-table-wrap">
            <div className="dv-table-scroll">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Exchange</th>
                    <th className="dv-th--num">Price</th>
                    <th className="dv-th--num">Yield</th>
                    <th>Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.symbol}>
                      <td>
                        <Link href={tickerHref(r.symbol, r.is_etf, r.is_fund)} className="dv-ticker">
                          <span className="dv-ticker__name">{r.symbol}</span>
                        </Link>
                      </td>
                      <td>{r.name}</td>
                      <td>{r.exchange ?? "—"}</td>
                      <td className="dv-td--num">{formatCurrency(r.price)}</td>
                      <td className="dv-td--num">{formatPercent(r.dividend_yield)}</td>
                      <td>{r.sector ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

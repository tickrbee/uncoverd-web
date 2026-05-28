import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { getPotentialDividendPayers, formatCurrency } from "@/lib/data";

export const metadata: Metadata = {
  title: "Stocks that could start paying dividends",
  description: "Profitable, cash-generative US companies that don't yet pay a dividend — ranked by how ready they look to start.",
};

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function PotentialPayersPage() {
  const rows = await getPotentialDividendPayers(120);

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="Future Income"
          title="Stocks that could start paying dividends"
          description="Profitable, cash-generative US companies that don't yet distribute. Ranked by free-cash-flow margin — a proxy for how comfortably they could initiate."
          meta="Filters: market cap > $500M · net income > 0 · free cash flow > 0 · currently last_div = 0."
        />

        <section className="dv-section">
          {rows.length === 0 ? (
            <div className="dv-empty">
              No candidates surfaced. The latest annual financials may not be loaded yet — re-run
              the financials refresh and try again.
            </div>
          ) : (
            <div className="dv-table-wrap">
              <div className="dv-table-scroll">
                <table className="dv-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Stock</th>
                      <th>Sector</th>
                      <th>Industry</th>
                      <th className="dv-th--num">Market cap</th>
                      <th className="dv-th--num">Net income (FY)</th>
                      <th className="dv-th--num">Free cash flow (FY)</th>
                      <th className="dv-th--num">FCF margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.symbol}>
                        <td>{i + 1}</td>
                        <td>
                          <Link href={`/stocks/${r.symbol}`} className="dv-ticker">
                            <span className="dv-ticker__name">{r.symbol}</span>
                            <span className="dv-ticker__meta">{r.name ?? ""}</span>
                          </Link>
                        </td>
                        <td>{r.sector ?? "—"}</td>
                        <td>{r.industry ?? "—"}</td>
                        <td className="dv-td--num">
                          {r.market_cap != null ? formatCurrency(r.market_cap, { abbreviate: true }) : "—"}
                        </td>
                        <td className="dv-td--num">
                          {r.net_income != null ? formatCurrency(r.net_income, { abbreviate: true }) : "—"}
                        </td>
                        <td className="dv-td--num">
                          {r.free_cash_flow != null ? formatCurrency(r.free_cash_flow, { abbreviate: true }) : "—"}
                        </td>
                        <td className="dv-td--num">
                          {r.fcf_margin != null ? `${r.fcf_margin.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
          This is a screening list, not a prediction. Initiating a dividend is a board decision
          that depends on management policy, leverage, growth runway and capital-allocation
          priorities — none of which are captured here. See our{" "}
          <Link href="/legal/disclaimer" className="dv-action-link">Investment Disclaimer</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

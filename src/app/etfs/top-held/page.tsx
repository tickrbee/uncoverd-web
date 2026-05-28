import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { getMostHeldByEtfs, formatCurrency } from "@/lib/data";

export const metadata: Metadata = {
  title: "Stocks most held by ETFs",
  description: "Which stocks show up in the most ETFs — and the total market value tied up across all of them. A heatmap of basket exposure.",
};

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function TopHeldPage() {
  const rows = await getMostHeldByEtfs(150);

  // Compute a max for the bar visualization
  const maxCount = rows.reduce((max, r) => Math.max(max, r.etf_count), 0) || 1;

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <PageHeader
          eyebrow="ETF Heatmap"
          title="Stocks most held by ETFs"
          description="The companies that show up in the most ETFs across our database, ranked by ETF count and total tied-up market value. A proxy for basket exposure and crowding."
        />

        <section className="dv-section">
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {rows.length === 0
              ? "ETF holdings haven't been ingested yet."
              : `Top ${rows.length} most-held stocks across all ETF holdings.`}
          </p>

          {rows.length > 0 && (
            <div className="dv-table-wrap" style={{ marginTop: "1rem" }}>
              <div className="dv-table-scroll">
                <table className="dv-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Stock</th>
                      <th>Sector</th>
                      <th className="dv-th--num">ETFs holding it</th>
                      <th>Coverage</th>
                      <th className="dv-th--num">Total position value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const pct = (r.etf_count / maxCount) * 100;
                      return (
                        <tr key={r.asset}>
                          <td>{i + 1}</td>
                          <td>
                            <Link href={`/stocks/${r.asset}`} className="dv-ticker">
                              <span className="dv-ticker__name">{r.asset}</span>
                              <span className="dv-ticker__meta">{r.asset_name ?? ""}</span>
                            </Link>
                          </td>
                          <td>{r.asset_sector ?? "—"}</td>
                          <td className="dv-td--num">{r.etf_count.toLocaleString()}</td>
                          <td style={{ minWidth: 220 }}>
                            <div
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                height: 10,
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background:
                                    "linear-gradient(90deg, #064e3b 0%, #34d399 100%)",
                                }}
                              />
                            </div>
                          </td>
                          <td className="dv-td--num">
                            {r.total_market_value != null
                              ? formatCurrency(r.total_market_value, { abbreviate: true })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

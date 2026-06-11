import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { recentDividendIncreases } from "@/lib/data";
import { metaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Recent Dividend Increases — Updated Daily | uncoverd" },
  description: metaDescription(
    "Every dividend increase announced in the last 30 days by liquid US-listed companies: old vs new payout, percentage raise, ex-dividend date and the uncoverd rating — refreshed daily from payment data.",
  ),
  alternates: { canonical: "/dividend-increases" },
  openGraph: {
    title: "Recent Dividend Increases — Updated Daily",
    description: "Companies that just raised their dividend: old vs new payout, % increase, ex-date and rating.",
    type: "website",
    url: "https://uncoverd.org/dividend-increases",
  },
};

// Computed from the dividends table, cached for an hour — the page is a live
// answer to "recent dividend increases" / "dividend increases this week".
// The week-cutoff is computed inside the cache so the render stays pure.
const getIncreases = unstable_cache(
  async () => {
    const rows = await recentDividendIncreases(30, 40);
    const weekAgo = Date.now() - 7 * 86400e3;
    const thisWeek = rows.filter((r) => new Date(r.exDate).getTime() > weekAgo).length;
    return { rows, thisWeek };
  },
  ["v1:dividendIncreases"],
  { revalidate: 3600 },
);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default async function DividendIncreasesPage() {
  const { rows, thisWeek } = await getIncreases();

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "44px 24px 70px" }}>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2fe3a0", marginBottom: 12 }}>
            Dividend tracker · live data
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Recent dividend increases</h1>
          <p style={{ color: "var(--text-secondary)", maxWidth: 680, lineHeight: 1.6, margin: "0 0 6px" }}>
            Every dividend <strong>raise</strong> announced in the last 30 days by liquid US-listed companies — computed straight from
            payment data, not press releases. Old payout vs new, the size of the raise, the ex-dividend date you must own it by, and the uncoverd rating.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 26px" }}>
            {rows.length} raises in the last 30 days{thisWeek ? ` · ${thisWeek} with upcoming or this-week ex-dates` : ""} · refreshed daily · raises of +2% to +100% on regular payers (special dividends excluded)
          </p>

          <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {["Company", "Sector", "Per-share payout", "Raise", "Ex-date", "Pay date", "Rating"].map((h) => (
                    <th key={h} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 26, textAlign: "center", color: "var(--text-muted)" }}>No qualifying raises in the window — check back tomorrow.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.symbol} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <Link href={`/stocks/${r.symbol}`} className="dv-action-link" style={{ fontWeight: 700 }}>{r.symbol}</Link>
                      <span style={{ color: "var(--text-muted)", fontSize: 12.5, display: "block" }}>{r.name}</span>
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: 13 }}>{r.sector ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ color: "var(--text-muted)" }}>${r.prevAmount.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}</span>
                      <span style={{ color: "var(--text-muted)" }}> → </span>
                      <strong>${r.amount.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}</strong>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#2fe3a0", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>+{r.pctIncrease}%</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--text-secondary)" }}>{fmtDate(r.exDate)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--text-secondary)" }}>{fmtDate(r.paymentDate)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {r.grade ? (
                        <Link href={`/stocks/${r.symbol}?tab=ratings`} style={{ fontWeight: 800, color: "#2fe3a0", textDecoration: "none" }}>{r.grade}</Link>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section style={{ marginTop: 40, maxWidth: 760 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>Why dividend increases matter</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 14 }}>
              A raise is the strongest signal a board can send: management is committing real, recurring cash to its confidence.
              Research has long associated dividend growth with quality and forward returns — and a raise streak is the backbone
              of every aristocrat list. The flip side: a raise the balance sheet can&apos;t afford is borrowed applause. Check the payout
              ratio and the <strong>uncoverd rating</strong> before treating any raise as a buy signal.
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "18px 0 10px" }}>How this list is built</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 14 }}>
              We compare each company&apos;s newest declared dividend against its previous payment in our database, keep liquid US-listed
              common stocks (market cap above $1B, real daily volume), and show raises between +2% and +100% — filtering out
              variable shippers&apos; payout noise and one-off special dividends. The table refreshes daily.
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Next steps: check upcoming payment dates on the <Link href="/calendar/ex-dividend" className="dv-action-link">ex-dividend calendar</Link>,
              screen the raisers by yield and sector in the <Link href="/screener" className="dv-action-link">screener</Link>, or see which payers
              our model ranks highest right now on the <Link href="/best-stocks" className="dv-action-link">top-rated list</Link>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

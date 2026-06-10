import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { topRatedAsOf, listStocks, historicalPrices } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Does the Portfolio Generator work? Live validation | uncoverd",
  description:
    "A live, walk-forward track record: every week we snapshot the generator's top-rated picks and measure them forward against the S&P 500. No backfill, no survivorship editing.",
};

// ============================================================================
// LIVE walk-forward validation. Every week since the rating engine's
// inception (2026-04-26) a cohort is formed from THAT day's stored ratings —
// no lookahead, no backfill — and measured forward to today vs SPY.
// The whole point: this page can embarrass us. That's what makes it proof.
// ============================================================================

const INCEPTION = "2026-04-27";
const PER_SECTOR = 3;
const COHORT_SIZE = 15;
const isPlainUs = (s: string) => /^[A-Z]{1,5}$/.test(s);

type Cohort = {
  asOf: string;
  names: { symbol: string; grade: string | null; ret: number | null }[];
  port: number | null;
  spy: number | null;
  alpha: number | null;
};

function fwdReturn(rows: { date: string; close: number | string | null }[], from: string): number | null {
  const pts = rows.map((r) => ({ date: r.date, close: Number(r.close) })).filter((p) => p.close > 0 && p.date >= from).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (pts.length < 2) return null;
  return (pts[pts.length - 1].close / pts[0].close - 1) * 100;
}

const getValidation = unstable_cache(
  async () => {
    // Weekly cohort anchors, oldest first; the newest needs ≥5 trading days.
    const dates: string[] = [];
    const cutoff = Date.now() - 7 * 86400e3;
    for (let d = new Date(INCEPTION); d.getTime() <= cutoff; d.setDate(d.getDate() + 7)) {
      dates.push(d.toISOString().slice(0, 10));
    }
    const spyRows = await historicalPrices("SPY", 220).catch(() => []);

    const cohorts: Cohort[] = [];
    for (const anchor of dates) {
      // Ratings are computed daily but a specific calendar day can be empty
      // (weekend/holiday) — walk forward up to 3 days.
      let rated: Awaited<ReturnType<typeof topRatedAsOf>> = [];
      let asOf = anchor;
      for (let k = 0; k < 4 && rated.length === 0; k++) {
        const d = new Date(anchor);
        d.setDate(d.getDate() + k);
        asOf = d.toISOString().slice(0, 10);
        rated = await topRatedAsOf(asOf, 120).catch(() => []);
      }
      if (rated.length === 0) continue;

      // US primary listings only (clean, liquid, currency-safe), sector-capped.
      const candidates = rated.filter((r) => isPlainUs(r.symbol)).slice(0, 60);
      const meta = await listStocks({ symbols: candidates.map((c) => c.symbol), limit: candidates.length }).catch(() => []);
      const sectorOf = new Map(meta.map((m) => [m.symbol, m.sector ?? "?"]));
      const perSector = new Map<string, number>();
      const picks: typeof candidates = [];
      for (const c of candidates) {
        const sec = sectorOf.get(c.symbol);
        if (!sec) continue; // not a known common stock
        const n = perSector.get(sec) ?? 0;
        if (n >= PER_SECTOR) continue;
        perSector.set(sec, n + 1);
        picks.push(c);
        if (picks.length >= COHORT_SIZE) break;
      }
      if (picks.length < 8) continue;

      const rets = await Promise.all(
        picks.map(async (p) => ({
          symbol: p.symbol,
          grade: p.composite_grade,
          ret: fwdReturn(await historicalPrices(p.symbol, 220).catch(() => []), asOf),
        }))
      );
      const valid = rets.filter((r) => r.ret != null) as { symbol: string; grade: string | null; ret: number }[];
      if (valid.length < 8) continue;
      const port = valid.reduce((a, r) => a + r.ret, 0) / valid.length;
      const spy = fwdReturn(spyRows, asOf);
      cohorts.push({
        asOf,
        names: rets,
        port: +port.toFixed(2),
        spy: spy != null ? +spy.toFixed(2) : null,
        alpha: spy != null ? +(port - spy).toFixed(2) : null,
      });
    }

    const withAlpha = cohorts.filter((c) => c.alpha != null) as (Cohort & { alpha: number })[];
    const avgAlpha = withAlpha.length ? +(withAlpha.reduce((a, c) => a + c.alpha, 0) / withAlpha.length).toFixed(2) : null;
    const hitRate = withAlpha.length ? Math.round((withAlpha.filter((c) => c.alpha > 0).length / withAlpha.length) * 100) : null;
    return { cohorts, avgAlpha, hitRate, generatedAt: new Date().toISOString().slice(0, 10) };
  },
  ["v1:genValidation"],
  { revalidate: 21600 },
);

const T = { bg: "#070b13", panel: "#0d1421", line: "#1a2433", ink: "#eef2f7", muted: "#8b99ad", faint: "#5d6b80", green: "#2fe3a0", amber: "#f0a839", red: "#ff5d73" };
const mono = "'IBM Plex Mono', monospace";

export default async function ValidationPage() {
  const v = await getValidation();
  return (
    <>
      <SiteHeader />
      <main style={{ background: T.bg, color: T.ink, minHeight: "70vh" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 70px" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: T.green, marginBottom: 14 }}>Portfolio generator · proof</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.03em" }}>Does it actually work? Watch it live.</h1>
          <p style={{ color: T.muted, fontSize: 15.5, lineHeight: 1.65, maxWidth: 720, margin: "0 0 8px" }}>
            Every week since the rating engine went live, we freeze that day&apos;s <strong style={{ color: T.ink }}>top-rated picks</strong> (A-range composite, US primary listings,
            max {PER_SECTOR} per sector, equal weight) using <strong style={{ color: T.ink }}>only the data stored on that date</strong> — then measure them forward against the S&amp;P 500.
            No backfill, no survivorship editing, no cherry-picking. If a cohort underperforms, it stays on this page.
          </p>
          <p style={{ color: T.faint, fontSize: 13, margin: "0 0 28px" }}>
            Track record began {INCEPTION} (rating-engine inception) and extends automatically every week. Updated {v.generatedAt}. Price-only returns, dividends excluded (which understates the portfolios — these are dividend payers).
          </p>

          {/* summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 30 }}>
            {[
              ["Cohorts tracked", String(v.cohorts.length)],
              ["Avg. lead vs S&P 500", v.avgAlpha != null ? `${v.avgAlpha > 0 ? "+" : ""}${v.avgAlpha} pp` : "—"],
              ["Cohorts beating S&P", v.hitRate != null ? `${v.hitRate}%` : "—"],
            ].map(([k, val]) => (
              <div key={k} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.faint, marginBottom: 7 }}>{k}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: val.startsWith("+") ? T.green : val.startsWith("-") ? T.red : T.ink }}>{val}</div>
              </div>
            ))}
          </div>

          {/* cohort table */}
          <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 26 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint }}>
              <span>Cohort (as of)</span><span>Picks return</span><span>S&amp;P 500</span><span>Lead</span>
            </div>
            {v.cohorts.length === 0 && (
              <div style={{ padding: 26, color: T.faint, fontSize: 13.5 }}>The first cohort needs at least a week of forward data — check back shortly.</div>
            )}
            {v.cohorts.map((c) => (
              <details key={c.asOf} style={{ borderBottom: `1px solid ${T.line}` }}>
                <summary style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1fr", gap: 10, padding: "13px 18px", cursor: "pointer", listStyle: "none", fontFamily: mono, fontSize: 13 }}>
                  <span style={{ color: T.ink, fontWeight: 700 }}>{c.asOf}</span>
                  <span style={{ color: T.ink }}>{c.port != null ? `${c.port > 0 ? "+" : ""}${c.port}%` : "—"}</span>
                  <span style={{ color: T.muted }}>{c.spy != null ? `${c.spy > 0 ? "+" : ""}${c.spy}%` : "—"}</span>
                  <span style={{ color: c.alpha != null && c.alpha > 0 ? T.green : T.red, fontWeight: 700 }}>{c.alpha != null ? `${c.alpha > 0 ? "+" : ""}${c.alpha} pp` : "—"}</span>
                </summary>
                <div style={{ padding: "4px 18px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {c.names.map((n) => (
                    <span key={n.symbol} style={{ fontFamily: mono, fontSize: 11.5, color: T.muted, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 7, padding: "4px 9px" }}>
                      {n.symbol} <span style={{ color: T.faint }}>{n.grade}</span>{" "}
                      <span style={{ color: n.ret != null && n.ret > 0 ? T.green : T.red }}>{n.ret != null ? `${n.ret > 0 ? "+" : ""}${n.ret.toFixed(1)}%` : "n/a"}</span>
                    </span>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div style={{ color: T.faint, fontSize: 12.5, lineHeight: 1.7, maxWidth: 760 }}>
            <strong style={{ color: T.muted }}>Protocol.</strong> Cohorts use the composite ratings exactly as stored in our database on the cohort date (the table is append-only; the engine cannot see the future).
            Selection mirrors the generator&apos;s screening: A-range composite grade, US primary listings, max {PER_SECTOR} per sector, {COHORT_SIZE} names, equal weight.
            It isolates the rating signal — the generator additionally applies Black–Litterman optimization, liquidity screens and your constraints.
            Short track records prove little either way; this page exists so the record accumulates in public. Not investment advice.
          </div>

          <div style={{ marginTop: 26 }}>
            <Link href="/tools/portfolio-generator" style={{ color: T.green, fontWeight: 700, fontSize: 14 }}>← Back to the Portfolio Generator</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

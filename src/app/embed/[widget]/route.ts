import { NextRequest, NextResponse } from "next/server";
import {
  getMostHeldByEtfs,
  dividendCalendar,
  isoToday,
  isoDaysFromNow,
  formatCurrency,
  formatDate,
} from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Self-contained embeddable widgets. Returned as raw HTML so third-party
// sites can drop a single <iframe> on their blog/newsletter and earn us a
// backlink + brand visibility. No global stylesheets, no JS bundle —
// renders in <50ms with inline styles only.
//
// Available widgets:
//   /embed/upcoming-ex-dates  — next 10 ex-dividend events
//   /embed/most-held-by-etfs  — top 15 stocks by ETF count
//
// Iframe usage (also documented on /press):
//   <iframe src="https://uncoverd.org/embed/most-held-by-etfs"
//           width="100%" height="540" style="border:0;"></iframe>

const WIDGETS = new Set(["upcoming-ex-dates", "most-held-by-etfs"]);

function escape(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FOOTER = `
  <div style="margin-top:0.85rem;padding-top:0.6rem;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;font-size:0.75rem;color:#a1a1aa;">
    <span>Data: <a href="https://uncoverd.org" target="_blank" rel="noopener" style="color:#34d399;text-decoration:none;font-weight:600;">uncoverd</a> · refreshed daily</span>
    <span style="font-size:0.7rem;"><a href="https://uncoverd.org/press" target="_blank" rel="noopener" style="color:#a7f3d0;">embed code</a></span>
  </div>
`;

function wrap(body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>uncoverd embed</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#fafafa;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="padding:1rem 1.1rem;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:linear-gradient(180deg,rgba(52,211,153,0.04) 0%,rgba(10,10,10,0) 30%);">
    ${body}
    ${FOOTER}
  </div>
</body></html>`;
}

async function renderUpcomingExDates(): Promise<string> {
  let events: Awaited<ReturnType<typeof dividendCalendar>> = [];
  try {
    events = await dividendCalendar(isoToday(), isoDaysFromNow(14), 50);
  } catch {
    /* ignore — render empty */
  }
  const top = events.slice(0, 10);
  const rowsHtml = top
    .map(
      (e, i) => `
    <tr>
      <td style="padding:0.5rem 0.6rem 0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <a href="https://uncoverd.org/stocks/${escape(e.symbol)}" target="_blank" rel="noopener" style="color:#fafafa;text-decoration:none;font-weight:600;">${escape(e.symbol)}</a>
      </td>
      <td style="padding:0.5rem 0.6rem 0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">${escape(formatDate(e.date))}</td>
      <td style="padding:0.5rem 0.6rem 0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">${escape(formatDate(e.payment_date))}</td>
      <td style="padding:0.5rem 0.6rem 0.5rem 0;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${escape(formatCurrency(e.dividend))}</td>
    </tr>${i === top.length - 1 ? "" : ""}`,
    )
    .join("");
  const tableHtml =
    top.length === 0
      ? `<div style="color:#71717a;padding:1rem 0;">No upcoming events.</div>`
      : `<table style="width:100%;border-collapse:collapse;font-size:0.86rem;">
        <thead><tr style="color:#a1a1aa;text-align:left;">
          <th style="padding:0.4rem 0.6rem 0.4rem 0;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.07);">Symbol</th>
          <th style="padding:0.4rem 0.6rem 0.4rem 0;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.07);">Ex-Date</th>
          <th style="padding:0.4rem 0.6rem 0.4rem 0;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.07);">Payment</th>
          <th style="padding:0.4rem 0.6rem 0.4rem 0;text-align:right;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid rgba(255,255,255,0.07);">Dividend</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  return `
    <h2 style="margin:0;font-size:1.05rem;font-weight:700;">Upcoming ex-dividend dates</h2>
    <p style="margin:0.2rem 0 0.85rem;color:#a1a1aa;font-size:0.78rem;">Next 10 ex-dates from <a href="https://uncoverd.org/calendar/ex-dividend" target="_blank" rel="noopener" style="color:#a7f3d0;">uncoverd&apos;s calendar</a></p>
    ${tableHtml}
  `;
}

async function renderMostHeldByEtfs(): Promise<string> {
  let rows: Awaited<ReturnType<typeof getMostHeldByEtfs>> = [];
  try {
    rows = await getMostHeldByEtfs(15);
  } catch {
    /* ignore */
  }
  const maxCount = rows.reduce((m, r) => Math.max(m, r.etf_count), 0) || 1;
  const rowsHtml = rows
    .map((r, i) => {
      const pct = (r.etf_count / maxCount) * 100;
      return `
      <div style="display:grid;grid-template-columns:30px 90px 1fr 80px;gap:0.6rem;align-items:center;font-size:0.84rem;">
        <span style="color:#71717a;">${i + 1}</span>
        <a href="https://uncoverd.org/stocks/${escape(r.asset)}" target="_blank" rel="noopener" style="color:#fafafa;text-decoration:none;font-weight:600;">${escape(r.asset)}</a>
        <div style="background:rgba(255,255,255,0.05);height:8px;border-radius:4px;overflow:hidden;">
          <div style="width:${pct.toFixed(2)}%;height:100%;background:linear-gradient(90deg,#064e3b 0%,#34d399 100%);"></div>
        </div>
        <span style="color:#a1a1aa;text-align:right;font-size:0.8rem;">${r.etf_count.toLocaleString()} ETFs</span>
      </div>`;
    })
    .join("");
  return `
    <h2 style="margin:0;font-size:1.05rem;font-weight:700;">Stocks most held by ETFs</h2>
    <p style="margin:0.2rem 0 0.85rem;color:#a1a1aa;font-size:0.78rem;">Top 15 by ETF count — see the full list on <a href="https://uncoverd.org/etfs/top-held" target="_blank" rel="noopener" style="color:#a7f3d0;">uncoverd</a></p>
    <div style="display:grid;gap:0.4rem;">${rowsHtml}</div>
  `;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ widget: string }> },
) {
  const { widget } = await ctx.params;
  if (!WIDGETS.has(widget)) {
    return new NextResponse("Unknown widget", { status: 404 });
  }
  const body =
    widget === "upcoming-ex-dates"
      ? await renderUpcomingExDates()
      : await renderMostHeldByEtfs();

  return new NextResponse(wrap(body), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Allow embedding on any third-party site (this is the whole point).
      "X-Frame-Options": "ALLOWALL",
      "Content-Security-Policy": "frame-ancestors *",
      // Cache for 1 hour at the edge so we're cheap to serve.
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

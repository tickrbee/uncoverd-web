import { Resend } from "resend";

// Daily Reddit-opportunity digest. Sent only when there are new rows
// since the previous run. Resend's free tier covers 100 sends/day; we
// use at most 1.
//
// Recipient lives in DIGEST_EMAIL_TO (env var, never rendered). From
// address lives in DIGEST_EMAIL_FROM — must be a verified Resend
// sender. Until you verify uncoverd.org, you can use the no-setup
// 'onboarding@resend.dev' From address.

export type DigestRow = {
  id: number;
  detected_at: string;
  subreddit: string;
  title: string;
  author: string | null;
  permalink: string;
  score: number | null;
  num_comments: number | null;
  selftext_preview: string | null;
  match_reason: "brand-mention" | "competitor-mention" | "high-engagement-question";
  match_terms: string[] | null;
};

const REASON_LABEL: Record<DigestRow["match_reason"], string> = {
  "brand-mention": "Brand mention",
  "competitor-mention": "Competitor mention",
  "high-engagement-question": "Engagement",
};

const REASON_COLOR: Record<DigestRow["match_reason"], string> = {
  "brand-mention": "#34d399",
  "competitor-mention": "#fbbf24",
  "high-engagement-question": "#60a5fa",
};

// Group + sort: brand mentions first, then competitor, then engagement.
// Inside each group, newest first.
const REASON_ORDER: DigestRow["match_reason"][] = [
  "brand-mention",
  "competitor-mention",
  "high-engagement-question",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(rows: DigestRow[], inboxUrl: string): string {
  const grouped = REASON_ORDER.map((reason) => ({
    reason,
    rows: rows.filter((r) => r.match_reason === reason),
  })).filter((g) => g.rows.length > 0);

  const sections = grouped
    .map((g) => {
      const cards = g.rows
        .map((r) => {
          const preview = r.selftext_preview ? escapeHtml(r.selftext_preview) : "";
          const terms = (r.match_terms ?? []).map((t) => escapeHtml(t)).join(", ");
          return `
          <tr>
            <td style="padding:14px 18px;border-bottom:1px solid #1f1f1f;">
              <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;">
                r/${escapeHtml(r.subreddit)} · u/${escapeHtml(r.author ?? "?")} · ↑ ${r.score ?? 0} · 💬 ${r.num_comments ?? 0}
              </div>
              <div style="font-size:15px;font-weight:600;line-height:1.35;margin-bottom:6px;">
                <a href="${escapeHtml(r.permalink)}" style="color:#fafafa;text-decoration:none;">
                  ${escapeHtml(r.title)}
                </a>
              </div>
              ${preview ? `<div style="font-size:13px;color:#a1a1aa;line-height:1.5;margin-bottom:8px;">${preview}</div>` : ""}
              ${terms ? `<div style="font-size:11px;color:#71717a;">matched: ${terms}</div>` : ""}
            </td>
          </tr>
        `;
        })
        .join("");
      return `
        <tr>
          <td style="padding:18px 18px 8px;">
            <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${REASON_COLOR[g.reason]}22;color:${REASON_COLOR[g.reason]};font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">
              ${REASON_LABEL[g.reason]} · ${g.rows.length}
            </div>
          </td>
        </tr>
        ${cards}
      `;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>uncoverd Reddit digest</title></head>
<body style="margin:0;padding:24px;background:#050505;color:#fafafa;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:640px;width:100%;background:#0a0a0a;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:18px 20px;background:linear-gradient(180deg,rgba(52,211,153,0.06) 0%,rgba(10,10,10,0) 80%);border-bottom:1px solid #1f1f1f;">
        <div style="font-size:13px;color:#34d399;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">uncoverd · reddit digest</div>
        <div style="font-size:16px;color:#fafafa;margin-top:4px;">${rows.length} new opportunit${rows.length === 1 ? "y" : "ies"}</div>
      </td>
    </tr>
    ${sections}
    <tr>
      <td style="padding:18px 20px;text-align:center;border-top:1px solid #1f1f1f;font-size:12px;color:#71717a;">
        <a href="${escapeHtml(inboxUrl)}" style="color:#a7f3d0;text-decoration:none;font-weight:600;">Open inbox →</a>
      </td>
    </tr>
  </table>
</body></html>`;
}

function renderText(rows: DigestRow[], inboxUrl: string): string {
  const grouped = REASON_ORDER.map((reason) => ({
    reason,
    rows: rows.filter((r) => r.match_reason === reason),
  })).filter((g) => g.rows.length > 0);

  const lines: string[] = [`uncoverd Reddit digest — ${rows.length} new opportunit${rows.length === 1 ? "y" : "ies"}`, ""];
  for (const g of grouped) {
    lines.push(`== ${REASON_LABEL[g.reason]} (${g.rows.length}) ==`);
    for (const r of g.rows) {
      lines.push(
        `- ${r.title}`,
        `  r/${r.subreddit} · u/${r.author ?? "?"} · ↑${r.score ?? 0} · 💬${r.num_comments ?? 0}`,
        `  ${r.permalink}`,
        "",
      );
    }
  }
  lines.push(`Inbox: ${inboxUrl}`);
  return lines.join("\n");
}

export async function sendRedditDigest(
  rows: DigestRow[],
  options: { inboxUrl: string },
): Promise<{ skipped: true; reason: string } | { skipped: false; messageId: string | null }> {
  if (rows.length === 0) return { skipped: true, reason: "no new rows" };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_EMAIL_TO;
  const from = process.env.DIGEST_EMAIL_FROM ?? "onboarding@resend.dev";

  if (!apiKey) return { skipped: true, reason: "RESEND_API_KEY not set" };
  if (!to) return { skipped: true, reason: "DIGEST_EMAIL_TO not set" };

  const resend = new Resend(apiKey);
  const subject = `uncoverd: ${rows.length} new Reddit opportunit${rows.length === 1 ? "y" : "ies"}`;
  const html = renderHtml(rows, options.inboxUrl);
  const text = renderText(rows, options.inboxUrl);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`resend send failed: ${error.message}`);
  return { skipped: false, messageId: data?.id ?? null };
}

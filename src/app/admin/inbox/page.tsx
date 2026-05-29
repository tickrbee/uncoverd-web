import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { getBackendClient } from "@/lib/supabase/admin";
import { updateOpportunityStatus } from "./actions";

// Operator dashboard for Reddit (and later Quora) opportunities. The
// monitor cron fills reddit_opportunities; this page surfaces them
// grouped by status so the operator can decide what to act on.
//
// Access is gated to a single OPERATOR_EMAIL env var. Anyone else
// (signed in or not) gets a 404 — not a 401 — so the page's existence
// isn't disclosed.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};

type OpportunityRow = {
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
  status: "new" | "seen" | "actioned" | "dismissed";
  notes: string | null;
};

const REASON_LABEL: Record<OpportunityRow["match_reason"], string> = {
  "brand-mention": "Brand mention",
  "competitor-mention": "Competitor mention",
  "high-engagement-question": "Engagement",
};

const REASON_COLOR: Record<OpportunityRow["match_reason"], string> = {
  "brand-mention": "#34d399",
  "competitor-mention": "#fbbf24",
  "high-engagement-question": "#60a5fa",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Auth gate. createClient gives us the logged-in user from cookies.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin/inbox");
  }
  const operatorEmail = process.env.OPERATOR_EMAIL;
  if (!operatorEmail || user.email !== operatorEmail) {
    notFound();
  }

  // Filter by status — defaults to "new" so the operator sees the queue.
  const params = await searchParams;
  const status = (params.status ?? "new") as OpportunityRow["status"] | "all";

  const sb = getBackendClient();
  let query = sb
    .schema("public")
    .from("reddit_opportunities")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) {
    throw new Error(`reddit_opportunities read failed: ${error.message}`);
  }
  const rows = (data as OpportunityRow[]) ?? [];

  // Status counts for the filter chips. One query per status keeps it
  // simple; the table is small (sub-10k rows expected).
  const countQuery = (s: OpportunityRow["status"]) =>
    sb.schema("public").from("reddit_opportunities").select("id", { count: "exact", head: true }).eq("status", s);
  const [newCount, seenCount, actionedCount, dismissedCount] = await Promise.all([
    countQuery("new"),
    countQuery("seen"),
    countQuery("actioned"),
    countQuery("dismissed"),
  ]);
  const counts = {
    new: newCount.count ?? 0,
    seen: seenCount.count ?? 0,
    actioned: actionedCount.count ?? 0,
    dismissed: dismissedCount.count ?? 0,
  };

  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Inbox</h1>
          <p style={{ margin: "0.4rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Reddit opportunities surfaced by the monitor. Click through to reply manually.
          </p>
        </section>

        {/* Status filter chips */}
        <section style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(["new", "seen", "actioned", "dismissed", "all"] as const).map((s) => {
            const active = status === s;
            const count =
              s === "all"
                ? counts.new + counts.seen + counts.actioned + counts.dismissed
                : counts[s as keyof typeof counts];
            return (
              <a
                key={s}
                href={`/admin/inbox?status=${s}`}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--positive)" : "var(--border-subtle)"}`,
                  background: active ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  textTransform: "capitalize",
                }}
              >
                {s} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {count}</span>
              </a>
            );
          })}
        </section>

        {/* Opportunity list */}
        {rows.length === 0 ? (
          <div className="dv-empty">No opportunities in this view.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {rows.map((r) => (
              <article
                key={r.id}
                style={{
                  padding: "1rem 1.1rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 12,
                }}
              >
                <header
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                      <span
                        style={{
                          padding: "0.15rem 0.55rem",
                          borderRadius: 999,
                          background: `${REASON_COLOR[r.match_reason]}22`,
                          color: REASON_COLOR[r.match_reason],
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {REASON_LABEL[r.match_reason]}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        r/{r.subreddit} · u/{r.author ?? "?"} ·{" "}
                        {new Date(r.detected_at).toLocaleString()}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)" }}>
                      <a
                        href={r.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {r.title}
                      </a>
                    </h3>
                  </div>
                  <div style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                    ↑ {r.score ?? 0} · 💬 {r.num_comments ?? 0}
                  </div>
                </header>

                {r.selftext_preview && (
                  <p style={{ margin: "0.4rem 0 0.65rem", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {r.selftext_preview}
                  </p>
                )}

                {r.match_terms && r.match_terms.length > 0 && (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                    {r.match_terms.map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: "0.15rem 0.55rem",
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.05)",
                          color: "var(--text-muted)",
                          fontSize: "0.72rem",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action row — server actions for status updates */}
                <form action={updateOpportunityStatus} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="redirect_to" value={`/admin/inbox?status=${status}`} />
                  <a
                    href={r.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                  >
                    Open on Reddit ↗
                  </a>
                  {r.status !== "actioned" && (
                    <button
                      type="submit"
                      name="status"
                      value="actioned"
                      className="btn"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                    >
                      Mark replied
                    </button>
                  )}
                  {r.status !== "dismissed" && (
                    <button
                      type="submit"
                      name="status"
                      value="dismissed"
                      className="btn btn--ghost"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                    >
                      Dismiss
                    </button>
                  )}
                  {r.status === "new" && (
                    <button
                      type="submit"
                      name="status"
                      value="seen"
                      className="btn btn--ghost"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                    >
                      Mark seen
                    </button>
                  )}
                </form>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

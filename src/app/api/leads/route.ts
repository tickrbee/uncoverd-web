import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Captures a marketing lead email (the "get this month's picks" gate). Writes
// via the service-role client; the email_leads table has RLS on with no public
// policies, so it's only reachable here.
export async function POST(req: Request) {
  let email = "";
  let source = "";
  try {
    const b = (await req.json()) as { email?: unknown; source?: unknown };
    email = String(b.email ?? "").trim().toLowerCase();
    source = String(b.source ?? "").slice(0, 60);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  try {
    const sb = getAdminClient("public");
    const { error } = await sb.from("email_leads").insert({ email, source: source || "best-stocks-funnel" });
    // 23505 = unique violation (already subscribed) — treat as success.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: "Could not save your email. Try again." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Could not save your email. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

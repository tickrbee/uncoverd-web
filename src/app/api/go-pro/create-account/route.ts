import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates an ALREADY-CONFIRMED account (email_confirm: true) via the admin API,
// so the checkout flow never bounces the buyer to a "confirm your email" step.
// The client then signs in (setting the session cookie) and /api/go-pro/start
// finishes checkout from that cookie.
export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const b = (await req.json()) as { email?: unknown; password?: unknown };
    email = String(b.email ?? "").trim().toLowerCase();
    password = String(b.password ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  try {
    const admin = getAdminClient("public");
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      const msg = error.message || "";
      if (/already|registered|exists|duplicate/i.test(msg)) {
        return NextResponse.json({ error: "account_exists" });
      }
      return NextResponse.json({ error: msg || "Could not create your account." });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}

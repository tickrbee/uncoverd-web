import { NextResponse } from "next/server";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Starts Stripe checkout. Two entry modes:
//  - Already signed in (cookie session) → use that token (e.g. an existing user
//    upgrading).
//  - Logged out + email/password → create an ALREADY-CONFIRMED account (no email
//    step) and mint a token SERVER-SIDE via a throwaway client. We deliberately
//    DO NOT set a browser session: the buyer stays logged out through checkout
//    and signs in themselves afterwards to see Premium. This avoids the
//    "logged-in but header shows logged-out" mismatch entirely.
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;

  let email = "";
  let password = "";
  let promo = "";
  try {
    const b = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown; promo?: unknown };
    email = String(b.email ?? "").trim().toLowerCase();
    password = String(b.password ?? "");
    // Optional promo code (e.g. from a /go-pro?promo=WARREN15 link). Validated
    // here and looked up against Stripe in the edge function.
    const p = String(b.promo ?? "").trim();
    if (/^[A-Za-z0-9_-]{3,40}$/.test(p)) promo = p;
  } catch {
    /* no body — treat as the signed-in case */
  }

  let accessToken: string | null = null;

  // 1) Existing cookie session (signed-in user upgrading)?
  try {
    const cookieClient = await createCookieClient();
    const { data: { session } } = await cookieClient.auth.getSession();
    if (session?.access_token) accessToken = session.access_token;
  } catch {
    /* ignore — fall through to create flow */
  }

  // 2) Otherwise create the account + mint a token without a browser cookie.
  if (!accessToken) {
    if (!email || !password) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Please enter a valid email." });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." });
    }

    const admin = getAdminClient("public");
    const { error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (createErr) {
      const msg = createErr.message || "";
      if (/already|registered|exists|duplicate/i.test(msg)) {
        return NextResponse.json({ error: "account_exists" });
      }
      return NextResponse.json({ error: msg || "Could not create your account." });
    }

    // Throwaway client → get a token WITHOUT persisting/setting a cookie.
    const throwaway = createRawClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInErr } = await throwaway.auth.signInWithPassword({ email, password });
    if (signInErr || !signInData.session?.access_token) {
      return NextResponse.json({ error: signInErr?.message || "Could not start checkout. Please try again." });
    }
    accessToken = signInData.session.access_token;
  }

  // 3) Create the Stripe checkout session via the edge function. Forward Origin
  //    so its success/cancel URLs point back at the live site (not localhost).
  try {
    const res = await fetch(getSupabaseUrl() + "/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ tier: "plus", ...(promo ? { promo } : {}) }),
    });
    const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (payload?.url) return NextResponse.json({ url: payload.url });
    return NextResponse.json({ error: payload?.error || "Could not start checkout." });
  } catch {
    return NextResponse.json({ error: "Could not start checkout. Please try again." });
  }
}

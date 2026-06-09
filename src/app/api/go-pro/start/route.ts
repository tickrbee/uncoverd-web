import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Starts Stripe checkout from the server-side cookie session — no client access
// token needed, so it never gets tripped up by client session-detection. The
// "Continue to payment" button (and post-signup redirect) navigate here.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.redirect(new URL("/go-pro", origin), { status: 303 });
  }

  try {
    const res = await fetch(getSupabaseUrl() + "/functions/v1/create-checkout-session", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "plus" }),
    });
    const payload = (await res.json().catch(() => ({}))) as { url?: string };
    if (payload?.url) {
      return NextResponse.redirect(payload.url, { status: 303 });
    }
  } catch {
    /* fall through to error redirect */
  }
  return NextResponse.redirect(new URL("/go-pro?error=1", origin), { status: 303 });
}

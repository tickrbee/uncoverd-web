import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side sign-out. Clearing the `sb-*` auth cookies is what actually logs
// the user out — so we do that FIRST and return fast. Revoking the token at
// Supabase (a network call that can be slow) is secondary and capped, so a slow
// GoTrue response can't hang the route (which left the button on "Signing out…"
// until the user manually navigated).
export async function POST() {
  // 1) Clear the auth cookies immediately.
  try {
    const store = await cookies();
    for (const c of store.getAll()) {
      if (c.name.startsWith("sb-")) {
        store.set(c.name, "", { maxAge: 0, path: "/" });
      }
    }
  } catch {
    /* best-effort */
  }

  // 2) Best-effort token revoke — capped so it can never block the response.
  try {
    const supabase = await createClient();
    await Promise.race([
      supabase.auth.signOut().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}

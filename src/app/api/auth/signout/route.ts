import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side sign-out. The browser supabase client can't reliably clear the
// session cookies in this config (and its signOut() can hang in production), so
// we clear them here. First the normal signOut, then a belt-and-suspenders sweep
// of any remaining `sb-*` auth cookies so the session can't survive.
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* best-effort — fall through to the explicit cookie clear */
  }
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
  return NextResponse.json({ ok: true });
}

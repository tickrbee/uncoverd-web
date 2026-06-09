import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side sign-out. The browser supabase client can't reliably clear the
// session cookies in this config, so a client-only signOut could leave the user
// still logged in server-side. Clearing them here (the server client's signOut
// writes the cleared cookies in a route handler) makes sign-out actually stick.
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    /* best-effort — cookies may already be gone */
  }
  return NextResponse.json({ ok: true });
}

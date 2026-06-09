import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authoritative auth state for the header. The browser supabase client can fail
// to read the session cookies in this config (leaving the header stuck on "Sign
// In" for logged-in users), so the client header asks the server — which reads
// the same cookies as /account and middleware.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch {
    return NextResponse.json({ user: null });
  }
}

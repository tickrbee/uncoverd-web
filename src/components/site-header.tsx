// Server-rendered shell for the header. We read the auth user from cookies
// here (same source as middleware + /account) and hand it to the client
// component. This is the fix for "header shows Sign In/Sign Up while I'm
// signed in" — the browser supabase client wasn't reliably reading session
// cookies, so the client-side user state stayed null. SSR-reading the user
// makes the displayed state match the server's view immediately.

import { createClient } from "@/lib/supabase/server";
import { SiteHeaderClient } from "@/components/site-header-client";

export async function SiteHeader() {
  let initialUser = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    initialUser = data.user ?? null;
  } catch {
    // If the cookie store isn't available (e.g. inside a non-RSC context),
    // fall back to client-side detection.
  }
  return <SiteHeaderClient initialUser={initialUser} />;
}

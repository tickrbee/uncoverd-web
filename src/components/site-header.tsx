// Header shell. We read the signed-in user on the SERVER (same cookies as
// middleware + the account page, which are authoritative). The client-only
// approach — relying on the browser supabase client to detect the session —
// left some logged-in users seeing "Sign In/Sign Up" and unable to sign out,
// because the client read didn't reliably reflect the cookie session. Reading
// it server-side opts header pages into dynamic rendering; that's the accepted
// trade-off (speed comes from unstable_cache on data, not from dropping the
// server-auth header). The client still handles subsequent login/logout via
// onAuthStateChange, seeded from this authoritative value.

import { SiteHeaderClient } from "@/components/site-header-client";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let initialUser = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    initialUser = data.user;
  } catch {
    // Fall back to client-side detection if the server read fails.
  }
  return <SiteHeaderClient initialUser={initialUser} />;
}

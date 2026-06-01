"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

// Client-side auth link for the footer. Detects the session in the browser so
// the footer doesn't read cookies on the server (which would force dynamic
// rendering and block CDN caching). Defaults to the signed-out link and swaps
// to "Account" once the session resolves.
export function FooterAuthLink() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setSignedIn(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return signedIn ? <Link href="/account">Account</Link> : <Link href="/login">Sign in</Link>;
}

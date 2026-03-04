"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/branding";
import { createClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

export function MainNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand-mark" aria-label="uncoverd billing portal homepage">
          <span className="brand-mark__dot" />
          <span>{APP_NAME}</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#hero">Download</Link>
          {!loading && (
            <>
              {user ? (
                <Link href="/account">Account</Link>
              ) : (
                <Link href="/login">Log in</Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

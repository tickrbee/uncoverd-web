"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SessionRestorer() {
  const router = useRouter();
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    if (hasRestored) return;

    const supabase = createClient();

    async function restoreSession() {
      // Check URL parameters first (from app redirects)
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");

      // Check hash fragment (from Supabase OAuth redirects)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      // Use tokens from URL params or hash
      const token = accessToken || hashAccessToken;
      const refresh = refreshToken || hashRefreshToken;

      if (token && refresh) {
        console.log("🔄 Restoring session from app redirect...");

        const { data, error } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: refresh,
        });

        if (error) {
          console.error("❌ Failed to restore session:", error);
          return;
        }

        if (data.session) {
          console.log("✅ Session restored for:", data.user?.email);
          setHasRestored(true);

          // Clean the URL so tokens aren't visible
          const cleanUrl = window.location.pathname + (window.location.search.split("?")[0] || "");
          window.history.replaceState({}, "", cleanUrl);

          // Refresh the page to update auth state
          router.refresh();
        }
      } else {
        // No tokens found, check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("✅ Session already exists");
          setHasRestored(true);
        }
      }
    }

    restoreSession();
  }, [hasRestored, router]);

  return null; // This component doesn't render anything
}


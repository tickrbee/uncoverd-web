"use client";

import { useEffect, useState } from "react";

export function PasswordResetDetector() {
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    function checkAndRedirect() {
      if (hasRedirected) {
        console.log("⏭️ Already redirected, skipping...");
        return;
      }
      
      // Check if we have a password reset token in the hash
      const hash = window.location.hash.substring(1);
      console.log("🔍 Checking hash:", hash ? hash.substring(0, 100) + "..." : "empty");

      if (!hash) {
        return false;
      }

      try {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");

        console.log("🔍 Token check:", { 
          hasAccessToken: !!accessToken, 
          type,
          accessTokenLength: accessToken?.length 
        });

        // If it's a password reset token, redirect to the reset page
        if (accessToken && type === "recovery") {
          console.log("✅ Password reset token detected! Redirecting...");
          console.log("📍 Current URL:", window.location.href);
          
          setHasRedirected(true);
          
          // Use window.location.replace to prevent back button issues
          const redirectUrl = `/reset-password${window.location.search}${window.location.hash}`;
          console.log("🔗 Redirecting to:", redirectUrl);
          
          // Force redirect immediately
          window.location.replace(redirectUrl);
          return true;
        } else {
          console.log("❌ Not a password reset token:", { accessToken: !!accessToken, type });
        }
      } catch (e) {
        console.error("❌ Error checking hash:", e);
      }
      
      return false;
    }

    // Check immediately
    console.log("🚀 PasswordResetDetector mounted, checking for token...");
    if (checkAndRedirect()) {
      return;
    }

    // Also listen for hash changes
    const handleHashChange = () => {
      console.log("🔄 Hash changed, checking again...");
      checkAndRedirect();
    };

    window.addEventListener("hashchange", handleHashChange);

    // Check multiple times with increasing delays
    const timeouts = [
      setTimeout(() => {
        console.log("⏰ Delayed check 1 (200ms)");
        checkAndRedirect();
      }, 200),
      setTimeout(() => {
        console.log("⏰ Delayed check 2 (500ms)");
        checkAndRedirect();
      }, 500),
      setTimeout(() => {
        console.log("⏰ Delayed check 3 (1000ms)");
        checkAndRedirect();
      }, 1000),
    ];

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      timeouts.forEach(clearTimeout);
    };
  }, [hasRedirected]);

  return null; // This component doesn't render anything
}

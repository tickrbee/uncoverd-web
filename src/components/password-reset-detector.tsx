"use client";

import { useEffect, useState } from "react";

export function PasswordResetDetector() {
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Check if we have a password reset token in the hash
    const hash = window.location.hash.substring(1);
    if (!hash || hasRedirected) return;

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    // If it's a password reset token, redirect to the reset page
    if (accessToken && type === "recovery") {
      console.log("🔐 Password reset token detected, redirecting to reset page...");
      console.log("📍 Current URL:", window.location.href);
      console.log("🔍 Hash:", hash);
      
      setHasRedirected(true);
      
      // Use window.location.href to preserve hash fragments
      const redirectUrl = `/reset-password${window.location.search}${window.location.hash}`;
      console.log("🔗 Redirecting to:", redirectUrl);
      
      window.location.href = redirectUrl;
    }
  }, [hasRedirected]);

  return null; // This component doesn't render anything
}


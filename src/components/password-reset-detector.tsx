"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PasswordResetDetector() {
  const router = useRouter();

  useEffect(() => {
    // Check if we have a password reset token in the hash
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    // If it's a password reset token, redirect to the reset page
    if (accessToken && type === "recovery") {
      console.log("🔐 Password reset token detected, redirecting to reset page...");
      // Preserve the hash when redirecting
      router.push(`/reset-password${window.location.search}${window.location.hash}`);
    }
  }, [router]);

  return null; // This component doesn't render anything
}


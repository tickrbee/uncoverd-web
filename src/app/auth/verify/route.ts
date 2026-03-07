import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const redirectTo = requestUrl.searchParams.get("redirect_to");

  console.log("🔐 Verification request:", { 
    token: token?.substring(0, 20) + "...", 
    type, 
    redirectTo,
    fullUrl: requestUrl.href 
  });

  // If no token, this might be a redirect from Supabase's verify endpoint
  // Check if we have a session already
  if (!token) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Session exists, redirect to reset page
      console.log("✅ Session found, redirecting to reset page");
      return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
    } else {
      // No session, redirect to home
      console.log("❌ No session found");
      return NextResponse.redirect(new URL("/", requestUrl.origin));
    }
  }

  if (type !== "recovery") {
    console.log("❌ Invalid type:", type);
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const supabase = await createClient();

  // Exchange the token for a session using verifyOtp
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: "recovery",
  });

  if (error) {
    console.error("❌ Token verification failed:", error);
    const homeUrl = new URL("/", requestUrl.origin);
    homeUrl.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(homeUrl);
  }

  if (!data.session) {
    console.error("❌ No session created from token");
    const homeUrl = new URL("/", requestUrl.origin);
    homeUrl.searchParams.set("error", "no_session");
    return NextResponse.redirect(homeUrl);
  }

  console.log("✅ Token verified, session created, redirecting to reset page");

  // Token verified successfully, redirect to password reset page
  // The session is now set in cookies via Supabase
  const resetUrl = new URL("/reset-password", requestUrl.origin);
  return NextResponse.redirect(resetUrl);
}


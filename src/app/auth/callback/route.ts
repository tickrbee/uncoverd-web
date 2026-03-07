import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toSafePath(input: string | null): string {
  if (!input || !input.startsWith("/")) {
    return "/account";
  }

  return input;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = toSafePath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginErrorUrl = new URL("/login", requestUrl.origin);
      loginErrorUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(loginErrorUrl);
    }
  }

  // For password reset, if next is /reset-password, redirect there
  // The hash fragment will be preserved by the browser automatically
  const redirectUrl = new URL(next, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "./src/lib/supabase/middleware";

// Crawlers never have a session, so running the Supabase auth refresh for them
// is pure wasted CPU (it was a big chunk of our serverless cost under heavy
// bot traffic). We still serve them the page — we just skip updateSession.
const BOT_UA =
  /bot|crawler|spider|crawling|slurp|googlebot|bingbot|duckduckbot|baiduspider|yandex|ahrefs|semrush|gptbot|claudebot|perplexity|bytespider|facebookexternalhit|embedly|quora link preview|outbrain|pinterest|whatsapp|telegrambot/i;

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");

  if (host?.startsWith("www.uncoverd.org")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = "uncoverd.org";
    return NextResponse.redirect(redirectUrl, 308);
  }

  // Bots: skip the auth-session refresh entirely (they're never logged in).
  if (BOT_UA.test(request.headers.get("user-agent") ?? "")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith("/account") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Exclude _vercel/* so the Vercel Web Analytics + Speed Insights script and
  // beacon (/_vercel/insights/*, /_vercel/speed-insights/*) are never
  // intercepted by updateSession — that interception was breaking analytics.
  matcher: ["/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "./src/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");

  if (host?.startsWith("www.uncoverd.org")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = "uncoverd.org";
    return NextResponse.redirect(redirectUrl, 308);
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

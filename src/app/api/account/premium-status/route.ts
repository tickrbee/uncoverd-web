import { NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";

// Lightweight, per-user premium flag for client components on statically cached
// pages (e.g. the financials "See all" link). No symbol-specific data here.
export const dynamic = "force-dynamic";

export async function GET() {
  const { isPremium, isLoggedIn, tier } = await getPremiumStatus();
  return NextResponse.json(
    { isPremium, isLoggedIn, tier },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";
import { cachedPayoutChanges as payoutChanges } from "@/lib/cached-data";
import type { PayoutChangeKind } from "@/lib/data";

// Reveal endpoint for the gated payout-change feeds (increases / cuts /
// initiations / specials). The pages render only an upgrade prompt for free
// users (no events in the payload, no server auth read → cacheable); paying
// users fetch the events here, client-side (GatedPayoutEvents).
export const dynamic = "force-dynamic";

const VALID: PayoutChangeKind[] = ["increasing", "decreasing", "initiating", "suspending", "special"];

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") as PayoutChangeKind | null;
  if (!kind || !VALID.includes(kind)) return NextResponse.json({ isPremium: false, events: [] });

  const { isPremium } = await getPremiumStatus();
  if (!isPremium) return NextResponse.json({ isPremium: false });

  const events = await payoutChanges(kind, 200).catch(() => []);
  return NextResponse.json(
    { isPremium: true, events },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

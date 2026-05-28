import { NextRequest, NextResponse } from "next/server";
import { searchHoldableAssets } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// In-memory rate limit (per IP, per minute). Mirrors /api/search.
const BUCKET_LIMIT = 30;
const BUCKET_WINDOW_MS = 60_000;
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + BUCKET_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= BUCKET_LIMIT) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets.entries()) if (b.resetAt < now) buckets.delete(ip);
}, 5 * BUCKET_WINDOW_MS).unref?.();

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const { ok, retryAfter } = checkRateLimit(ip);
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 1) return NextResponse.json({ results: [] });
  const results = await searchHoldableAssets(q, 10);
  return NextResponse.json({ results });
}

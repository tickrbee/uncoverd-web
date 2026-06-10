import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Per-IP rate limiter for the unauthenticated search endpoint. In-memory map
// is fine for our scale (one Vercel function instance can absorb thousands of
// legit users while still bouncing scrapers). When we outgrow this we'll move
// to Upstash Redis or Vercel KV.
const BUCKET_LIMIT = 30; // requests
const BUCKET_WINDOW_MS = 60_000; // per minute
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + BUCKET_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= BUCKET_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true, retryAfter: 0 };
}

// Best-effort cleanup so the Map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets.entries()) {
    if (b.resetAt < now) buckets.delete(ip);
  }
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

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ results: [] });
  // Cap the query length so the underlying SQL stays cheap.
  const safeQ = q.slice(0, 60);
  // Optional result count (pickers ask for more than the header's 8).
  const limit = Math.min(20, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "8", 10) || 8));
  const rows = await searchStocks(safeQ, limit);
  const results = rows.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    sector: r.sector,
    is_etf: r.is_etf,
    is_fund: r.is_fund,
  }));
  return NextResponse.json({ results });
}

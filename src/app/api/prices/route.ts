import { NextResponse } from "next/server";
import { historicalPrices } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE = /^[A-Za-z0-9.\-^]{1,15}$/;

// Lightweight close-price history for the Healthcheck performance-overlay
// ("+ Compare" an index/stock against your portfolio). GET ?symbol=SPY&days=400
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!SAFE.test(symbol)) return NextResponse.json({ error: "bad symbol" }, { status: 400 });
  const days = Math.min(800, Math.max(30, Number(url.searchParams.get("days")) || 400));

  const rows = await historicalPrices(symbol, days).catch(() => []);
  const points = rows
    .map((p) => ({ date: p.date, close: Number(p.close) }))
    .filter((p) => p.close > 0);
  if (!points.length) return NextResponse.json({ symbol, points: [] }, { status: 404 });

  return NextResponse.json({ symbol, points }, { headers: { "Cache-Control": "private, max-age=300" } });
}

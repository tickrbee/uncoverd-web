import { NextRequest, NextResponse } from "next/server";
import { listStocks, getStockRatings } from "@/lib/data";
import { stockToGenInstrument } from "@/lib/gen-instrument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve one arbitrary DB ticker (stock or ETF, e.g. QQQI) into the
// generator's instrument shape so users can pin holdings beyond the curated
// universe. Cheap: one ticker row + one rating row.
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!symbol || symbol.length > 12 || !/^[A-Z0-9.\-]+$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  try {
    // listStocks (not getStock) so ETF yields get the TTM-dividend backfill —
    // income ETFs like QQQI have a capped/null last_div-based yield.
    const rows = await listStocks({ symbols: [symbol], excludeEtfs: false, limit: 1 });
    const row = rows[0];
    if (!row || !row.price) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ratings = row.is_etf || row.is_fund ? new Map() : await getStockRatings([symbol]).catch(() => new Map());
    const instrument = stockToGenInstrument(row, ratings.get(symbol) ?? null);
    return NextResponse.json(
      { instrument },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } }
    );
  } catch (e) {
    console.error("[api.portfolio.instrument]", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 503 });
  }
}

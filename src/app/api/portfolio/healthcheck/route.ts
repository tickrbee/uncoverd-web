import { NextResponse } from "next/server";
import { getStock, historicalPrices } from "@/lib/data";
import { computeHealth, type Series, type HoldingMeta } from "@/lib/portfolio-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HOLDINGS = 25;
const SAFE = /^[A-Za-z0-9.\-]{1,15}$/;

export async function POST(req: Request) {
  let symbols: string[] = [];
  try {
    const body = (await req.json()) as { symbols?: unknown };
    if (Array.isArray(body.symbols)) {
      symbols = body.symbols
        .filter((s): s is string => typeof s === "string" && SAFE.test(s))
        .map((s) => s.toUpperCase());
      symbols = Array.from(new Set(symbols)).slice(0, MAX_HOLDINGS);
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (symbols.length < 1) {
    return NextResponse.json({ error: "Add at least one holding." }, { status: 400 });
  }

  // Fetch ~1.5y of daily closes + the ticker meta for each holding in parallel.
  const fetched = await Promise.all(
    symbols.map(async (symbol) => {
      const [stock, prices] = await Promise.all([
        getStock(symbol).catch(() => null),
        historicalPrices(symbol, 400).catch(() => []),
      ]);
      return { symbol, stock, prices };
    }),
  );

  const valid = fetched.filter((f) => f.stock); // drop unknown tickers
  const missing = fetched.filter((f) => !f.stock).map((f) => f.symbol);

  if (valid.length < 1) {
    return NextResponse.json({ error: "None of those symbols were found." }, { status: 404 });
  }

  const series: Series[] = valid.map((f) => ({
    symbol: f.symbol,
    points: f.prices.map((p) => ({ date: p.date, close: Number(p.close) })).filter((p) => p.close > 0),
  }));
  const meta: HoldingMeta[] = valid.map((f) => ({
    symbol: f.symbol,
    name: f.stock!.name ?? null,
    sector: f.stock!.sector ?? null,
    dividend_yield: f.stock!.dividend_yield ?? null,
    beta: f.stock!.beta ?? null,
    is_etf: f.stock!.is_etf ?? null,
  }));

  const result = computeHealth(series, meta);
  if (missing.length) result.notes.push(`Skipped (not found): ${missing.join(", ")}.`);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=120" },
  });
}

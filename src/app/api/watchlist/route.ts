import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addToWatchlist, removeFromWatchlist, listWatchlistSymbols } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ symbols: [], loggedIn: false });
  }
  const set = await listWatchlistSymbols(user.id);
  return NextResponse.json({ symbols: Array.from(set), loggedIn: true });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "not-logged-in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const symbol = (body?.symbol ?? "").toString().toUpperCase();
  const action = (body?.action ?? "add").toString();
  if (!symbol) return NextResponse.json({ ok: false, reason: "missing-symbol" }, { status: 400 });

  const success = action === "remove" ? await removeFromWatchlist(user.id, symbol) : await addToWatchlist(user.id, symbol);
  return NextResponse.json({ ok: success });
}

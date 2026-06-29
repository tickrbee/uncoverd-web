import { NextResponse } from "next/server";
import { buildScreenedUniverse, validateScreenSpec } from "@/lib/screen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Text-to-screen universe for the Portfolio Generator v2. Accepts a (raw or
// LLM-produced) ScreenSpec, validates it against the allowlist, runs it
// deterministically against the DB, and returns a generator-ready
// GenInstrument[] universe. The screen-planner edge function (NL → spec) feeds
// this; the spec is always re-validated here regardless of source.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const spec = validateScreenSpec(body?.spec ?? body);
    const result = await buildScreenedUniverse(spec);
    return NextResponse.json(
      { ...result, spec, ...(result.matched === 0 ? { warning: "no_matches" } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[api.portfolio.screen]", e);
    return NextResponse.json({ error: "screen_failed" }, { status: 500 });
  }
}

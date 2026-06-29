// Portfolio Generator v2 — screen planner.
// POST /functions/v1/screen-planner  { query, locale? }
// Turns a free-form stock-screen query ("most volatile energy stocks paying a
// dividend") into a STRUCTURED ScreenSpec that the server re-validates and runs
// deterministically against the DB (src/lib/screen.ts). The model NEVER names
// tickers — only emits a spec — so every result is real DB data, no
// hallucination. Backward-looking "beat the market" queries are refused
// (survivorship bias: we only have currently-listed names).
//
// Returns { spec: {...} } OR { refusal: "..." }. The Next API re-validates the
// spec via validateScreenSpec regardless, so a malformed spec can only ever
// return fewer rows — never anything unsafe.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const LANGS: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian",
};

const SYSTEM = `You translate a user's free-form stock-screening request into a STRICT JSON screen spec for a dividend-stock screener. You NEVER name individual tickers or companies — you only describe filters. Output a single JSON object, nothing else.

Output exactly one of:
  { "spec": { ...fields below... } }
  { "refusal": "<one short sentence>" }

SPEC FIELDS (all optional; omit what the user didn't ask for):
- country: "US" (default) | "GLOBAL" | "EU" | ISO codes comma-joined (e.g. "DE,FR"). Use GLOBAL only if the user clearly wants worldwide.
- sectors: array, ONLY from this exact list — ["Technology","Healthcare","Financial Services","Consumer Cyclical","Consumer Defensive","Industrials","Energy","Utilities","Real Estate","Communication Services","Basic Materials"]. Map synonyms (tech→Technology, financials/banks→Financial Services, staples→Consumer Defensive, discretionary→Consumer Cyclical, materials→Basic Materials, telecom→Communication Services, REITs→Real Estate, oil→Energy).
- minYield / maxYield: dividend yield in PERCENT (e.g. 4 = 4%). "dividend payers" → minYield 0.01. "high yield" → minYield 4. "ultra high yield" → minYield 6.
- minCapUsd / maxCapUsd: market cap in USD (absolute). "small cap" → maxCapUsd 2000000000. "mid cap" → minCapUsd 2000000000, maxCapUsd 10000000000. "large cap / blue chip" → minCapUsd 10000000000. "mega cap" → minCapUsd 200000000000.
- grades: array from ["A+","A","A-","B+","B","B-","C+","C","C-","D","F"] — overall quality letter grade. "best / high quality / top rated" → ["A","A-","B+"]. "investment grade-ish quality" → ["A","A-","B+","B"].
- minVol / maxVol: estimated annual volatility in PERCENT (typical range 9–50). Only set if the user gives an explicit threshold. For "most volatile" do NOT set minVol — instead sort by vol desc. For "low volatility / stable" → maxVol 18.
- minProfit: profitability quality on a 1–5 scale (5 = best, avg 3). Set to 4 ONLY when the user explicitly wants "profitable / high profitability / quality earnings". Do not invent it otherwise.
- sortBy: "yield" | "vol" | "cap" | "grade" | "profit". "most volatile"→vol desc. "highest yield"→yield desc. "biggest"→cap desc. "best/highest quality"→grade desc. Default "grade".
- sortDir: "asc" | "desc" (default desc).
- limit: 5–120 (default 40). Honor "top 10" → 10.

REFUSE (return {"refusal":...}) when the request is BACKWARD-LOOKING performance selection — e.g. "stocks/portfolio that beat the S&P 500", "best performers of the last 10 years", "highest historical returns". Reason: our universe contains only companies still listed today, so any such screen is inflated by survivorship bias (delisted losers are missing) and would mislead. Briefly say so and suggest a forward-looking quality/yield/sector/volatility screen instead. Do NOT refuse normal screens.

EXAMPLES:
"most volatile energy stocks, profitable, paying a dividend" -> {"spec":{"sectors":["Energy"],"minYield":0.01,"minProfit":4,"sortBy":"vol","sortDir":"desc"}}
"best dividend portfolio" -> {"spec":{"grades":["A","A-","B+"],"minYield":2,"sortBy":"grade","sortDir":"desc"}}
"most volatile dividend stocks" -> {"spec":{"minYield":0.01,"sortBy":"vol","sortDir":"desc"}}
"safe high-yield blue chips" -> {"spec":{"minYield":4,"grades":["A","A-","B+","B"],"minCapUsd":10000000000,"sortBy":"yield","sortDir":"desc"}}
"top 10 european utilities with a dividend" -> {"spec":{"country":"EU","sectors":["Utilities"],"minYield":0.01,"limit":10,"sortBy":"grade","sortDir":"desc"}}
"a portfolio that historically beat the S&P 500 by a lot" -> {"refusal":"I can't screen for stocks that beat the market historically — our universe only has companies still listed today, so the result would be inflated by survivorship bias. Try a forward-looking quality, yield, sector or volatility screen instead."}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY not configured" }, 500);

  let body: { query?: string; locale?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const query = String(body?.query ?? "").trim().slice(0, 300);
  if (!query) return json({ error: "Missing query" }, 400);
  const lang = LANGS[(body?.locale ?? "en").toLowerCase()] ?? "English";
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM + `\n\nWrite any "refusal" text in ${lang}.` },
          { role: "user", content: query },
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message ?? "OpenAI request failed" }, 502);
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { spec?: unknown; refusal?: unknown };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    if (parsed?.refusal && typeof parsed.refusal === "string") {
      return json({ refusal: parsed.refusal });
    }
    // Pass the (untrusted) spec straight back — the Next API re-validates it.
    return json({ spec: parsed?.spec ?? {} });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// Portfolio Healthcheck — AI analyst.
// POST /functions/v1/portfolio-analyst  { question, portfolio }
// Uses the OPENAI_API_KEY secret to answer questions grounded ONLY in the
// portfolio JSON passed from the Healthcheck tool. Returns { answer }.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY not configured" }, 500);

  let body: { question?: string; portfolio?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const question = String(body?.question ?? "").trim().slice(0, 500);
  if (!question) return json({ error: "Missing question" }, 400);
  const portfolio = body?.portfolio ?? {};
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  const system =
    "You are a sharp, quantitative portfolio analyst for uncoverd. Answer ONLY from the provided portfolio JSON. " +
    "Be specific and concrete: name exact tickers, their weights (%), and the relevant numbers from the data " +
    "(beta, volatility, Sharpe, sector %, yield, rating). Never speak in generalities or hedge. Keep it tight (<=110 words). " +
    "End with ONE concrete, numbered action that names the specific holding(s) and the size of the change " +
    "(e.g. 'Trim NVDA from 15% to ~10% and add a bond sleeve'). No disclaimers, no restating the question. " +
    "If the data lacks something needed, say so in one short clause. If a question is off-topic or abusive, give a one-line redirect to the portfolio.";
  const user = `PORTFOLIO DATA:\n${JSON.stringify(portfolio)}\n\nQUESTION: ${question}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: 320,
        temperature: 0.4,
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message ?? "OpenAI request failed" }, 502);
    const answer = data?.choices?.[0]?.message?.content?.trim() || "No response — try rephrasing.";
    return json({ answer });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

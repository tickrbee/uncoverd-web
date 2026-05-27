//xx
// Helper: list active prices for a Stripe product. Used to discover the
// price ID we should set as STRIPE_PRICE_ID_PLUS.
// GET /functions/v1/stripe-find-price?product=prod_XXX
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const product = url.searchParams.get("product");
  if (!product) {
    return new Response(JSON.stringify({ error: "missing ?product=" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "no STRIPE_SECRET_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/prices?product=${encodeURIComponent(product)}&active=true&limit=20`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const data = await res.json();
    return new Response(JSON.stringify(data, null, 2), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

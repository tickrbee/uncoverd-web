import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    // Get tier + optional promo code from request body
    const body = await req.json().catch(() => ({}));
    const tier = body.tier || "plus"; // Default to plus if not specified
    const promoInput = typeof body.promo === "string" ? body.promo.trim() : "";

    // Get price ID based on tier
    const stripePriceId = tier === "gold"
      ? Deno.env.get("STRIPE_PRICE_ID_GOLD")
      : Deno.env.get("STRIPE_PRICE_ID_PLUS");

    if (!stripeSecretKey || !stripePriceId) {
      console.error("Missing Stripe configuration", {
        tier,
        hasSecretKey: !!stripeSecretKey,
        hasPriceId: !!stripePriceId,
        envVars: {
          STRIPE_SECRET_KEY: !!Deno.env.get("STRIPE_SECRET_KEY"),
          STRIPE_PRICE_ID_PLUS: !!Deno.env.get("STRIPE_PRICE_ID_PLUS"),
          STRIPE_PRICE_ID_GOLD: !!Deno.env.get("STRIPE_PRICE_ID_GOLD"),
        }
      });
      return new Response(
        JSON.stringify({
          error: "Payment system not configured",
          debug: {
            tier,
            hasSecretKey: !!stripeSecretKey,
            hasPriceId: !!stripePriceId,
            expectedVar: tier === "gold" ? "STRIPE_PRICE_ID_GOLD" : "STRIPE_PRICE_ID_PLUS"
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-11-20.acacia" });

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's email
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("user_name")
      .eq("id", user.id)
      .single();

    // Get the origin from request (for redirect URL)
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/account?session_id={CHECKOUT_SESSION_ID}&success=true`;
    const cancelUrl = `${origin}/account?canceled=true`;

    // Promo handling. If a code was passed (e.g. from a ?promo=WARREN15 link),
    // look it up and pre-apply it. Otherwise show Stripe's "Add promotion
    // code" field so anyone can type one. The two are mutually exclusive on a
    // Checkout Session, so we only set one of them.
    let discounts: { promotion_code: string }[] | undefined;
    if (promoInput && /^[A-Za-z0-9_-]{3,40}$/.test(promoInput)) {
      try {
        const codes = await stripe.promotionCodes.list({ code: promoInput, active: true, limit: 1 });
        const pc = codes.data[0];
        if (pc) discounts = [{ promotion_code: pc.id }];
        else console.warn("Promo code not found or inactive:", promoInput);
      } catch (e) {
        console.error("Promo code lookup failed:", e);
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        tier: tier,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: tier,
        },
      },
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

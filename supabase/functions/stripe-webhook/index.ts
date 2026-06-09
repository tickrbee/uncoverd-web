import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import Stripe from "npm:stripe@14.21.0";

// IMPORTANT: in the Deno edge runtime, the SYNCHRONOUS stripe.webhooks.constructEvent()
// does not work (it relies on Node crypto) and throws — which this handler used to
// mislabel as "Invalid signature" (every event 400'd, so paid users were never
// upgraded). You MUST use the ASYNC verifier with the SubtleCrypto provider. This is
// the Supabase + Stripe canonical pattern. DO NOT revert to constructEvent().
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecretKey || !webhookSecret) {
    console.error("Missing Stripe configuration");
    return new Response(
      JSON.stringify({ error: "Webhook not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-11-20.acacia" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  async function resolveUserIdFromSubscription(
    subscription: Stripe.Subscription,
  ): Promise<string | null> {
    if (subscription.metadata?.user_id) {
      return subscription.metadata.user_id;
    }

    const stripeCustomerId =
      typeof subscription.customer === "string" ? subscription.customer : null;

    if (!stripeCustomerId) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (error) {
      console.error("Failed to resolve user by stripe_customer_id", error);
      return null;
    }

    return profile?.id ?? null;
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No signature" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    // ASYNC verification — required in Deno/edge.
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Handle subscription events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const tier = session.metadata?.tier || "plus"; // Default to plus for backward compatibility
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;

        if (!subscriptionId) {
          console.error("No subscription ID in checkout session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const updatePayload: {
          subscription_tier: string;
          plus_ends_at: string;
          stripe_subscription_id: string;
          stripe_customer_id?: string;
        } = {
          subscription_tier: tier,
          plus_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
          stripe_subscription_id: subscription.id,
        };

        if (stripeCustomerId) {
          updatePayload.stripe_customer_id = stripeCustomerId;
        }

        // Update user profile
        await supabase
          .from("user_profiles")
          .update(updatePayload)
          .eq("id", userId);

        console.log(`Updated user ${userId} to ${tier} subscription`);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(subscription);
        const tier = subscription.metadata?.tier || "plus"; // Default to plus for backward compatibility
        const stripeCustomerId =
          typeof subscription.customer === "string" ? subscription.customer : null;

        if (!userId) {
          console.error("No user_id in subscription metadata or profile lookup");
          break;
        }

        if (subscription.status === "active" || subscription.status === "trialing") {
          // Subscription is active
          const updatePayload: {
            subscription_tier: string;
            plus_ends_at: string;
            stripe_subscription_id: string;
            stripe_customer_id?: string;
          } = {
            subscription_tier: tier,
            plus_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_subscription_id: subscription.id,
          };

          if (stripeCustomerId) {
            updatePayload.stripe_customer_id = stripeCustomerId;
          }

          await supabase
            .from("user_profiles")
            .update(updatePayload)
            .eq("id", userId);
        } else {
          // Subscription canceled or expired
          const updatePayload: {
            subscription_tier: string;
            plus_ends_at: null;
            stripe_subscription_id: null;
            stripe_customer_id?: string;
          } = {
            subscription_tier: "free",
            plus_ends_at: null,
            stripe_subscription_id: null,
          };

          if (stripeCustomerId) {
            updatePayload.stripe_customer_id = stripeCustomerId;
          }

          await supabase
            .from("user_profiles")
            .update(updatePayload)
            .eq("id", userId);
        }

        console.log(`Updated subscription status for user ${userId}: ${subscription.status} (${tier})`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Auth provider webhook — called when a new user signs up
http.route({
  path: "/auth/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // Extract user info from webhook payload
    // Adapt this to your auth provider's webhook format
    const { name, email } = body;

    if (!email) {
      return new Response("Missing email in webhook payload", { status: 400 });
    }

    // Create or get user (idempotent)
    const userId = await ctx.runMutation(api.users.createOrGet, {
      name: name ?? "Unknown",
      email,
    });

    return new Response(JSON.stringify({ userId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Stripe webhook — handles payment events
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // In production, verify Stripe webhook signature here
    const body = await request.json();
    const { type } = body;

    // Route to appropriate handler based on event type
    // These handlers will be implemented in the billing functions
    switch (type) {
      case "invoice.paid":
      case "invoice.payment_failed":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // TODO: Route to appropriate internal functions
        break;
      default:
        // Unhandled event type
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

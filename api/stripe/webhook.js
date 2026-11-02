/*
 * POST /api/stripe/webhook: Stripe's events. Each one names a customer;
 * the customer's plan is recomputed from Stripe (billing.js), so event order
 * and repeats don't matter. Signed with STRIPE_WEBHOOK_SECRET.
 *
 * Events (set on the endpoint in Stripe): checkout.session.completed,
 * customer.subscription.created / updated / deleted, invoice.paid,
 * invoice.payment_failed, charge.refunded.
 */
import { stripe, recompute } from "../_lib/billing.js";
import { json, error } from "../_lib/http.js";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
  "invoice.paid", "invoice.payment_failed", "charge.refunded"
]);

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return error(400, "no_signature", "Missing signature.");
  const payload = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return error(400, "bad_signature", "Signature check failed.");
  }
  if (!HANDLED.has(event.type)) return json({ received: true, ignored: event.type });

  const customer = event.data.object.customer;
  const id = typeof customer === "string" ? customer : customer && customer.id;
  if (!id) return json({ received: true, skipped: "no customer" });
  // An error here returns 500, so Stripe retries the event later.
  const billing = await recompute(id);
  return json({ received: true, linked: !!billing });
}

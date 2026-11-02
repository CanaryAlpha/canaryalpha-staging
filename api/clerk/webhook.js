/*
 * POST /api/clerk/webhook: Clerk's user.deleted event. A member who deletes
 * their account must not be charged again, so their Stripe subscriptions
 * are cancelled at once (no refund of the current period; Terms section 5).
 * The Stripe customer and its payment records stay (Privacy section 8).
 *
 * Signed by Clerk (Svix) with CLERK_WEBHOOK_SIGNING_SECRET.
 */
import { verifyWebhook } from "@clerk/backend/webhooks";
import { stripe } from "../_lib/billing.js";
import { json, error } from "../_lib/http.js";

export async function POST(request) {
  let event;
  try {
    event = await verifyWebhook(request, { signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET });
  } catch (e) {
    return error(400, "bad_signature", "Signature check failed.");
  }
  if (event.type !== "user.deleted" || !event.data.id) return json({ received: true, ignored: event.type });

  const userId = event.data.id;
  const found = await stripe().customers.search({ query: "metadata['clerk_user_id']:'" + userId.replace(/[^A-Za-z0-9_]/g, "") + "'" });
  let cancelled = 0;
  for (const c of found.data) {
    const subs = await stripe().subscriptions.list({ customer: c.id, status: "all", limit: 20 });
    for (const s of subs.data) {
      if (["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(s.status)) {
        await stripe().subscriptions.cancel(s.id, { prorate: false });
        cancelled++;
      }
    }
    await stripe().customers.update(c.id, { metadata: { clerk_user_deleted: new Date().toISOString() } });
  }
  return json({ received: true, cancelled });
}

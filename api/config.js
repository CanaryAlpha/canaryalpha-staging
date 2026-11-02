/*
 * GET /api/config: what the pages need to know about this deployment.
 *   { paidPlans, clerkPublishableKey }
 * Both are public: the publishable key is meant for browsers. Cached at the
 * edge; a new deployment (needed for any variable change) clears it.
 */
import { json, paidPlansEnabled } from "./_lib/http.js";

export function GET() {
  return json(
    { paidPlans: paidPlansEnabled(), clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || "" },
    200,
    { "cache-control": "public, max-age=60, s-maxage=3600" }
  );
}

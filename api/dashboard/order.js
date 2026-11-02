/*
 * POST /api/dashboard/order/  { order: [slug, ...] | null }  ->  { order }
 *
 * Saves a Pro or Enterprise member's own order of the dashboard's asset
 * list (Clerk privateMetadata.assetOrder, written only here), so it follows
 * them to every device. The order is checked against the tokens covered
 * now: unknown ones are dropped, repeats removed. null clears it (Reset to
 * default). Free members get 403: custom order is part of Pro.
 */
import { currentUser, clerk } from "../_lib/auth.js";
import { json, error, sameOrigin } from "../_lib/http.js";
import { coverage } from "../_lib/dashboard.js";
import { hasTier, cleanOrder, applyOrder } from "../_lib/plans.js";
import { quiet } from "../_lib/cache.js";

export async function POST(request) {
  if (!sameOrigin(request)) return error(403, "bad_origin", "Request refused.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  if (!hasTier(user.tier, "pro")) return error(403, "not_pro", "Custom order is part of Pro.");

  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body */ }
  if (body.order === null) {
    await clerk().users.updateUserMetadata(user.id, { privateMetadata: { assetOrder: null } });
    return json({ order: null });
  }
  const tokens = await quiet(coverage);
  if (!tokens) return error(502, "research_unavailable", "Research is unavailable right now. Try again shortly.");
  const slugs = tokens.map((t) => t.slug);
  const order = cleanOrder(body.order, slugs);
  if (!order) return error(400, "bad_order", "That order couldn't be saved.");
  await clerk().users.updateUserMetadata(user.id, { privateMetadata: { assetOrder: order } });
  return json({ order: applyOrder(order, slugs) });
}

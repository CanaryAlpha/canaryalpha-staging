/*
 * GET /api/reviews/: the published member reviews, for the homepage's
 * "What members say" section and /reviews/.
 *   200 { reviews: [{ rating, text, name, tier, tierLabel, month }],
 *         count, average, showOnHome }
 * count and average are null, and showOnHome false, until there are 5
 * approved reviews. No account ID or email address is ever included.
 * Cached by Vercel's CDN for 2 minutes (plus a minute in the function), so
 * an approval or a deletion shows within a few minutes.
 */
import { json, error } from "../_lib/http.js";
import { allReviews, publicList } from "../_lib/reviews.js";

export async function GET() {
  let entries;
  try { entries = await allReviews(); } catch (e) {
    console.log("reviews: list failed", e && e.message);
    return error(502, "reviews_unavailable", "Reviews are unavailable right now.");
  }
  return json(publicList(entries), 200, { "cache-control": "public, max-age=60, s-maxage=120, stale-while-revalidate=60" });
}

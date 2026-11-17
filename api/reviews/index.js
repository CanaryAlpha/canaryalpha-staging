/*
 * GET /api/reviews/: the published member reviews, for the homepage's
 * "What members say" section and /reviews/.
 *   200 { reviews: [{ rating, text, name, tier, tierLabel, month,
 *         reply?: { text, date } }], count, average, breakdown {5..1},
 *         showOnHome }
 * Approved reviews only. average is to one decimal, null with no reviews;
 * showOnHome is false until there are 5. No account ID or email address is
 * ever included. Not cached, so an approval, hide or delete shows on the
 * next page load.
 */
import { json, error } from "../_lib/http.js";
import { allReviews, publicList } from "../_lib/reviews.js";

export async function GET() {
  let entries;
  try { entries = await allReviews(); } catch (e) {
    console.log("reviews: list failed", e && e.message);
    return error(502, "reviews_unavailable", "Reviews are unavailable right now.");
  }
  return json(publicList(entries), 200, { "cache-control": "no-store" });
}

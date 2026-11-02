/*
 * GET /api/research/documents?slug=btc: download links (PDF and others) for
 * one report at this user's plan. The links are signed and expire after the
 * API's ttl_seconds.
 */
import { currentUser } from "../_lib/auth.js";
import { json, error } from "../_lib/http.js";
import { research, SLUG } from "../_lib/research.js";

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!SLUG.test(slug)) return error(400, "bad_slug", "Unknown report.");
  const user = await currentUser(request);
  if (!user) return error(401, "signed_out", "Log in to continue.");
  const r = await research("/api/documents/" + slug, user.tier);
  if (r.status !== 200 || !r.body) return error(502, "research_unavailable", "Downloads are unavailable right now.");
  return json({ documents: r.body.documents || [], ttlSeconds: r.body.ttl_seconds || 0 });
}

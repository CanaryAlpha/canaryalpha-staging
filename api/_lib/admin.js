/*
 * The server-side gate for every admin page and action: a signed-in user
 * whose Clerk publicMetadata.role is "admin" (set in Clerk's dashboard
 * only), with two-step verification on. Returns the response to send when
 * the caller may not go on, or null.
 *   401 signed out; 404 not an admin (admin pages aren't advertised);
 *   403 needs_2fa for an admin without two-step verification.
 */
import { error } from "./http.js";
import { adminState } from "./reviews.js";

export function refuseAdmin(user) {
  const s = adminState(user);
  if (s === "signed_out") return error(401, "signed_out", "Log in to continue.");
  if (s === "not_admin") return error(404, "not_found", "Not found.");
  if (s === "needs_2fa") return error(403, "needs_2fa", "Turn on two-step verification for your account to use the admin pages.");
  return null;
}

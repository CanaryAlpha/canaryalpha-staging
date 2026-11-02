/*
 * Who is calling: the Clerk session behind a request, checked on the server.
 *
 * Pages send the session token as "Authorization: Bearer <token>"
 * (components/auth.js, CA_AUTH.fetch); a page navigation carries it in the
 * __session cookie instead. Either way Clerk verifies it here; nothing the
 * browser says about the user's plan is believed.
 *
 * Environment: CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY.
 */
import { createClerkClient } from "@clerk/backend";
import { effectiveTier } from "./plans.js";

let client;
export function clerk() {
  if (!client) {
    client = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY
    });
  }
  return client;
}

// The Clerk request state: { isAuthenticated, status, headers, toAuth() }.
// Only tokens minted for this site's own address are accepted.
export function requestState(request) {
  const origin = new URL(request.url).origin;
  return clerk().authenticateRequest(request, {
    authorizedParties: [origin],
    signInUrl: origin + "/login/",
    signUpUrl: origin + "/signup/"
  });
}

/*
 * The signed-in user, freshly read from Clerk (so a plan change counts at
 * once, not when the session token next refreshes), or null.
 *   { id, name, email, tier, billing, stripeCustomerId, assetOrder }
 * assetOrder: the member's own order of the asset list (slugs), or null.
 */
export async function currentUser(request) {
  const state = await requestState(request);
  if (!state.isAuthenticated) {
    // Clerk's reason code (never the token), for the function log.
    console.log("auth: signed out", state.reason || "", new URL(request.url).pathname);
    return null;
  }
  const { userId } = state.toAuth();
  if (!userId) return null;
  const u = await clerk().users.getUser(userId);
  const billing = (u.publicMetadata && u.publicMetadata.billing) || null;
  const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" "),
    email: primary ? primary.emailAddress : "",
    tier: effectiveTier(billing),
    billing,
    stripeCustomerId: (u.privateMetadata && u.privateMetadata.stripeCustomerId) || null,
    assetOrder: (u.privateMetadata && Array.isArray(u.privateMetadata.assetOrder) && u.privateMetadata.assetOrder) || null
  };
}

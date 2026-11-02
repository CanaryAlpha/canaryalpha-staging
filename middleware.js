/*
 * Vercel Routing Middleware: members' pages need a login.
 *
 * Runs before /dashboard/ and /account/ are served. A visitor without a
 * valid Clerk session goes to the login page, which brings them back after.
 * This only guards the pages; every piece of members' data comes from the
 * api/ functions, which check the session (and the plan) themselves.
 *
 * Environment: CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY.
 */
import { createClerkClient } from "@clerk/backend";

export const config = { matcher: ["/dashboard/:path*", "/account/:path*"] };

let clerk;

export default async function middleware(request) {
  clerk = clerk || createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY
  });
  const url = new URL(request.url);
  // The paths are set here and in components/auth.js, not in Clerk's
  // dashboard, so the code alone decides them.
  const state = await clerk.authenticateRequest(request, {
    authorizedParties: [url.origin],
    signInUrl: url.origin + "/login/",
    signUpUrl: url.origin + "/signup/"
  });

  // Clerk needs a round trip to refresh the session first: it answers with
  // the redirect to follow.
  if (state.status === "handshake") {
    return new Response(null, { status: 307, headers: state.headers });
  }
  if (!state.isAuthenticated) {
    const next = url.pathname + url.search;
    // Clerk's reason (a code such as "session-token-outdated", never the
    // token) goes on the redirect and into the function log, so a login
    // loop can be traced from the browser's Network tab.
    const headers = new Headers({ location: url.origin + "/login/?next=" + encodeURIComponent(next) });
    for (const name of ["x-clerk-auth-status", "x-clerk-auth-reason"]) {
      const value = state.headers.get(name);
      if (value) headers.set(name, value);
    }
    console.log("middleware: signed out", state.reason || "", url.pathname);
    return new Response(null, { status: 307, headers });
  }
  const headers = new Headers(state.headers);
  headers.set("x-middleware-next", "1");
  return new Response(null, { headers });
}

/*
 * Small helpers shared by the api/ functions.
 */

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", ...headers }
  });
}

export function error(status, code, message) {
  return json({ error: code, message }, status);
}

// The paid-plans switch. Off unless the variable is exactly "true".
export function paidPlansEnabled() {
  return process.env.PAID_PLANS_ENABLED === "true";
}

// The site's own address, for Stripe's return links: the address this
// request came in on, so previews return to the preview.
export function siteOrigin(request) {
  return new URL(request.url).origin;
}

// State-changing requests must come from the site's own pages.
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === siteOrigin(request);
}

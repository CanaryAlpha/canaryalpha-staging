/*
 * Responses for the server-rendered report pages (api/pages/). Members
 * only: never cached by a shared cache (one address serves different HTML
 * per plan) and never indexed.
 */
export function htmlResponse(status, html) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

// A logged-out visitor gets this and nothing else: no title, no score, no
// hint of which reports exist. After logging in they go to their dashboard
// (components/members/clerk-forms.js).
export function toLogin(request) {
  return new Response(null, {
    status: 307,
    headers: { location: new URL(request.url).origin + "/login/", "cache-control": "private, no-store" }
  });
}

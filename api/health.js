/*
 * GET /api/health/: the functions are up. On previews (never production)
 * it also lists which environment variables are SET, by name, as true or
 * false, whether any has stray spaces or line breaks around it, and
 * whether Clerk accepts the secret key (the HTTP status of Clerk's key
 * list, or the error's name), and which tier the research API actually
 * served for a Pro request (it falls back to free when ENTITLEMENT_SECRET
 * doesn't match Fly's). Never a value.
 */
import { json } from "./_lib/http.js";
import { research } from "./_lib/research.js";

const NAMES = [
  "CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SIGNING_SECRET",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ENTITLEMENT_SECRET",
  "PAID_PLANS_ENABLED", "API_BASE", "CMC_API_KEY"
];

// The key's shape, never the key: does it look like sk_test_/sk_live_
// followed by letters and digits only?
function keyShape(v) {
  if (!v) return "unset";
  if (/^sk_(test|live)_[A-Za-z0-9]+$/.test(v)) return "ok";
  if (/[^\x21-\x7e]/.test(v)) return "has spaces, line breaks or non-ASCII characters";
  if (!/^sk_(test|live)_/.test(v)) return "doesn't start with sk_test_ or sk_live_";
  return "has unexpected punctuation";
}

async function clerkKeyCheck() {
  try {
    const r = await fetch("https://api.clerk.com/v1/jwks", {
      headers: { authorization: "Bearer " + process.env.CLERK_SECRET_KEY }
    });
    return r.status;
  } catch (e) {
    // The cause's code (e.g. ENOTFOUND), not the message: an invalid
    // header message would quote the key.
    return ((e && e.name) || "error") + (e && e.cause && e.cause.code ? " " + e.cause.code : "");
  }
}

export async function GET() {
  const body = { ok: true, env: process.env.VERCEL_ENV || "unknown" };
  if (process.env.VERCEL_ENV !== "production") {
    const set = NAMES.filter((n) => process.env[n]);
    body.set = Object.fromEntries(NAMES.map((n) => [n, set.includes(n)]));
    body.untrimmed = set.filter((n) => process.env[n] !== process.env[n].trim());
    body.clerkSecretKey = { shape: keyShape(process.env.CLERK_SECRET_KEY), jwks: await clerkKeyCheck() };
    const e = process.env.ENTITLEMENT_SECRET || "";
    const r = await research("/api/tokens/aave", "pro");
    body.entitlement = {
      length: e.length,
      clean: /^[\x21-\x7e]*$/.test(e),
      proServedAs: (r.body && r.body._tier && r.body._tier.requested) || ("status " + r.status)
    };
    body.clerkPublishableKey = /^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(process.env.CLERK_PUBLISHABLE_KEY || "") ? "ok" : "unexpected shape";
  }
  return json(body);
}

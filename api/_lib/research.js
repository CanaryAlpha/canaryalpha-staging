/*
 * The research API (canaryalpha-api on Fly), called from the server only.
 *
 * Paid views need an entitlement token: "v1.<payload>.<signature>", payload
 * {tier, exp} as base64url JSON, signature HMAC-SHA256 of "v1.<payload>"
 * with ENTITLEMENT_SECRET (the API's src/lib/entitlement.ts). It is minted
 * here for one request, lives 5 minutes and never reaches the browser.
 *
 * Environment: API_BASE (default https://api.canaryalpha.co),
 * ENTITLEMENT_SECRET (the same value as on Fly).
 */
import crypto from "node:crypto";
import { apiTier } from "./plans.js";

const TOKEN_TTL_S = 300;

function base() {
  return (process.env.API_BASE || "https://api.canaryalpha.co").replace(/\/+$/, "");
}

export function mintToken(tier, now = Date.now()) {
  const secret = process.env.ENTITLEMENT_SECRET;
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ tier, exp: Math.floor(now / 1000) + TOKEN_TTL_S })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update("v1." + payload).digest("base64url");
  return "v1." + payload + "." + sig;
}

// GET a research API path as the given site tier. Resolves { status, body }.
export async function research(path, siteTier) {
  const tier = apiTier(siteTier);
  const headers = { accept: "application/json" };
  const token = tier === "free" ? null : mintToken(tier);
  if (token) headers.authorization = "Bearer " + token;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(base() + path + sep + "tier=" + tier, { headers });
  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }
  return { status: res.status, body };
}

// Slugs whose full report is free (the standing BTC/ETH promise). Read from
// the API, which decides it per artifact, not kept in a list here.
export async function freeSlugs() {
  const r = await research("/api/documents", "free");
  return (r.body && Array.isArray(r.body.authorised)) ? r.body.authorised : [];
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

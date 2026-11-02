#!/usr/bin/env node
/*
 * Moves a report order to its next stage, for the customer's Enterprise
 * dashboard (the progress bar updates within 30 seconds). Orders are
 * Enterprise bespoke-report requests ($0 invoices, ca_kind
 * "bespoke_report") and custom reports bought one at a time before
 * Enterprise became a subscription (payments, ca_plan "enterprise").
 *
 *   node tools/report-status.mjs CR-1A2B3C4D writing
 *   node tools/report-status.mjs CR-1A2B3C4D writing --eta 2026-11-12
 *   node tools/report-status.mjs CR-1A2B3C4D delivered --url https://...
 *   node tools/report-status.mjs list            every order, newest first:
 *                                                number, date, stage, ETA,
 *                                                token, notes
 *
 * Stages: received collection forensics scoring writing review delivered
 * Needs STRIPE_SECRET_KEY in the environment (the same Stripe account as
 * the site: TEST sandbox until go-live). Never prints the key.
 */
import Stripe from "stripe";
import { REPORT_STAGES, orderNumber } from "../api/_lib/billing.js";

const [cmd, stage, ...rest] = process.argv.slice(2);
const opt = (name) => { const i = rest.indexOf("--" + name); return i >= 0 ? rest[i + 1] : undefined; };
if (!process.env.STRIPE_SECRET_KEY) { console.error("Set STRIPE_SECRET_KEY first."); process.exit(1); }
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Both kinds of order, as { id, created, metadata, update(metadata) }.
async function orders() {
  const out = [];
  for await (const inv of stripe.invoices.search({ query: "metadata['ca_kind']:'bespoke_report'", limit: 100 })) {
    if (inv.metadata.report_status === "cancelled") continue;
    out.push({ id: inv.id, created: +inv.metadata.requested_at || inv.created, metadata: inv.metadata, update: (metadata) => stripe.invoices.update(inv.id, { metadata }) });
  }
  for await (const pi of stripe.paymentIntents.search({ query: "metadata['ca_plan']:'enterprise' AND status:'succeeded'", limit: 100 })) {
    out.push({ id: pi.id, created: pi.created, metadata: pi.metadata, update: (metadata) => stripe.paymentIntents.update(pi.id, { metadata }) });
  }
  return out.sort((a, b) => b.created - a.created);
}

if (!cmd || cmd === "list") {
  for (const o of await orders()) {
    const m = o.metadata;
    console.log([orderNumber(o.id), new Date(o.created * 1000).toISOString().slice(0, 10), m.report_stage || m.report_status || "received", m.report_eta || "-", m.report_for || "", m.report_notes || ""].join("\t"));
  }
  process.exit(0);
}
if (!REPORT_STAGES.includes(stage)) { console.error("Stage must be one of: " + REPORT_STAGES.join(" ")); process.exit(1); }
const eta = opt("eta"), url = opt("url");
if (eta && !/^\d{4}-\d{2}-\d{2}$/.test(eta)) { console.error("--eta must be YYYY-MM-DD"); process.exit(1); }
if (url && !/^https:\/\//.test(url)) { console.error("--url must start with https://"); process.exit(1); }

const order = (await orders()).find((o) => orderNumber(o.id) === cmd.toUpperCase());
if (!order) { console.error("No order " + cmd + ". Try: node tools/report-status.mjs list"); process.exit(1); }
const history = String(order.metadata.report_history || "").split(",").filter(Boolean).filter((x) => !x.startsWith(stage + ":"));
history.push(stage + ":" + Math.floor(Date.now() / 1000));
const metadata = { report_stage: stage, report_history: history.join(","), report_status: stage === "delivered" ? "delivered" : "in_progress" };
if (eta) metadata.report_eta = eta;
if (url) metadata.report_url = url;
await order.update(metadata);
console.log(orderNumber(order.id) + " → " + stage + (eta ? " (estimated delivery " + eta + ")" : ""));

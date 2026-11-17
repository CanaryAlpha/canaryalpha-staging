/*
 * Member reviews: the rules, and where they are kept.
 *
 * Each member has at most one review, kept on their own Clerk user in
 * privateMetadata.review (never sent to the browser by Clerk; only the
 * api/reviews/ and api/admin/reviews/ functions read or write it).
 * Deleting the account deletes the review with it. The shape:
 *
 *   { rating 1-5, text (cleaned, 20-600 characters), display "name" |
 *     "initials" | "anonymous", name (the name shown, worked out when the
 *     review is saved), consent true, tier "free" | "pro" | "enterprise"
 *     (at the time of writing), createdAt, updatedAt, status "pending" |
 *     "approved" | "declined" | "hidden", moderatedAt,
 *     reply: { text, createdAt, updatedAt, forVersion } | absent }
 *
 * Every new or edited review is "pending" until an admin approves it at
 * /admin/reviews/. The public list shows "approved" reviews only, with the
 * text exactly as approved: an edit sends the review back to "pending", and
 * every admin action names the version (updatedAt) the admin was shown, so
 * text an admin hasn't seen is never published. A reply ("Response from
 * Canary Alpha Research") is shown under the review; forVersion records
 * which version of the review it answered.
 *
 * Admins are the users whose publicMetadata.role is "admin" (set in Clerk's
 * dashboard; members can't change publicMetadata), and they need two-step
 * verification on. Permanent deletions are logged on the admin who made
 * them, in privateMetadata.reviewDeletions: who, when, why and whose review,
 * never the deleted text.
 *
 * privateMetadata.reviewLog holds the times of the member's last writes,
 * for the rate limit. No email address is ever stored in a review or sent
 * with one.
 */
import { clerk } from "./auth.js";

export const MIN_TEXT = 20;
export const MAX_TEXT = 600;
export const MIN_FOR_HOME = 5;
export const MAX_REPLY = 1000;
export const DISPLAYS = ["name", "initials", "anonymous"];
export const STATUSES = ["pending", "approved", "declined", "hidden"];
export const TIER_LABELS = { free: "Free member", pro: "Pro member", enterprise: "Enterprise member" };

// Rate limit: one write every 15 seconds, at most 10 a day.
export const WRITE_GAP_MS = 15 * 1000;
export const WRITES_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * The review text as it will be stored and shown: HTML tags, links, web
 * addresses and email addresses removed, control characters dropped,
 * spaces collapsed, at most one blank line in a row. Shown with
 * textContent, never as HTML.
 */
export function cleanText(raw) {
  let s = String(raw == null ? "" : raw).normalize("NFC");
  s = s.replace(/<[^>]*>/g, " ").replace(/[<>]/g, " ");
  s = s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, " ");
  s = s.replace(/\b(?:https?|ftp):\/\/\S*/gi, " ").replace(/\bwww\.\S*/gi, " ");
  // Bare web addresses (example.com/page), lower case only, so a missing
  // space after a full stop ("report.So") isn't taken for one.
  s = s.replace(/\b[a-z0-9-]{2,}(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|xyz|app|dev|ai|gg|me|info|biz|us|uk|ca|de|eu|finance|money|exchange|link|site|online|top|ly|to|so|sh|tv|cc|fi|cash|pro|vip|club|live|news|ru|cn|in)\b(?:\/\S*)?/g, " ");
  s = s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "");
  s = s.split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim()).join("\n");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

// The name shown with a review, from the member's Clerk profile; null when
// the profile has no name for that choice.
export function displayName(display, firstName, lastName) {
  const f = String(firstName || "").trim(), l = String(lastName || "").trim();
  const initial = (w) => (w ? Array.from(w)[0].toUpperCase() : "");
  if (display === "anonymous") return "Anonymous member";
  if (display === "initials") {
    if (!f && !l) return null;
    return [f, l].filter(Boolean).map((w) => initial(w) + ".").join("");
  }
  if (display === "name") {
    if (!f) return null;
    return l ? f + " " + initial(l) + "." : f;
  }
  return null;
}

/*
 * Checks a member's submission. Returns { review } (without the dates or
 * status, which the caller sets) or { error: { code, message } }.
 */
export function validateSubmission(body, profile) {
  const b = body && typeof body === "object" ? body : {};
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("bad_rating", "Choose a rating from 1 to 5 stars.");
  if (b.consent !== true) return fail("no_consent", "Tick the box to agree that we may publish your review.");
  if (!DISPLAYS.includes(b.display)) return fail("bad_display", "Choose how your name is shown.");
  const raw = typeof b.text === "string" ? b.text : "";
  if (raw.length > MAX_TEXT * 2) return fail("too_long", "Keep your review to " + MAX_TEXT + " characters.");
  const text = cleanText(raw);
  if (text.length < MIN_TEXT) return fail("too_short", "Write at least " + MIN_TEXT + " characters (links and HTML are removed).");
  if (text.length > MAX_TEXT) return fail("too_long", "Keep your review to " + MAX_TEXT + " characters.");
  const name = displayName(b.display, profile.firstName, profile.lastName);
  if (!name) {
    return fail("no_name", b.display === "name"
      ? "Your account has no first name. Add it in Settings, or choose another option."
      : "Your account has no name. Add it in Settings, or choose another option.");
  }
  return { review: { rating, text, display: b.display, name, consent: true } };
}
function fail(code, message) { return { error: { code, message } }; }

// The rate limit, from the member's write log. Returns the trimmed log
// with this write added, or null when the write must wait.
export function allowWrite(log, now = Date.now()) {
  const recent = (Array.isArray(log) ? log : []).map(Number).filter((t) => Number.isFinite(t) && now - t < DAY_MS);
  if (recent.length && now - Math.max(...recent) < WRITE_GAP_MS) return null;
  if (recent.length >= WRITES_PER_DAY) return null;
  return recent.concat(now).slice(-WRITES_PER_DAY);
}

// What the member sees of their own review.
export function ownView(r) {
  if (!r) return null;
  return { rating: r.rating, text: r.text, display: r.display, name: r.name, status: r.status,
    createdAt: r.createdAt, updatedAt: r.updatedAt };
}

// What anyone sees of an approved review: no account ID, no email.
export function publicView(r) {
  const d = new Date(r.updatedAt);
  const out = {
    rating: r.rating,
    text: r.text,
    name: r.name,
    tier: TIER_LABELS[r.tier] ? r.tier : "free",
    tierLabel: TIER_LABELS[r.tier] || TIER_LABELS.free,
    month: d.toISOString().slice(0, 7)
  };
  if (r.reply && r.reply.text) out.reply = { text: r.reply.text, date: String(r.reply.updatedAt || r.reply.createdAt).slice(0, 10) };
  return out;
}

// The rating summary of a list of reviews: the count, the average to one
// decimal (null when there are none) and how many gave each star.
export function ratingSummary(reviews) {
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of reviews) { breakdown[r.rating] += 1; sum += r.rating; }
  const count = reviews.length;
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : null, breakdown };
}

// The public list: approved reviews only (never pending, hidden, declined
// or deleted), newest first, with their summary. The homepage section waits
// for MIN_FOR_HOME of them (showOnHome).
export function publicList(entries) {
  const approved = entries.map((e) => e.review).filter((r) => r && r.status === "approved")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return { ...ratingSummary(approved), showOnHome: approved.length >= MIN_FOR_HOME, reviews: approved.map(publicView) };
}

// What an admin sees of each review, waiting ones first, then newest.
export function adminItem(userId, r) {
  return {
    userId,
    rating: r.rating,
    text: r.text,
    display: r.display,
    name: r.name,
    tier: r.tier,
    tierLabel: TIER_LABELS[r.tier] || TIER_LABELS.free,
    consent: r.consent === true,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    moderatedAt: r.moderatedAt || null,
    reply: r.reply && r.reply.text ? { text: r.reply.text, createdAt: r.reply.createdAt, updatedAt: r.reply.updatedAt,
      current: r.reply.forVersion === r.updatedAt } : null
  };
}
export function adminList(entries, deletions = []) {
  const order = { pending: 0, approved: 1, hidden: 2, declined: 3 };
  const items = entries.filter((e) => e.review).map((e) => adminItem(e.userId, e.review))
    .sort((a, b) => (order[a.status] - order[b.status]) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const log = deletions.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { pending: items.filter((i) => i.status === "pending").length, items, deletions: log,
    published: ratingSummary(entries.map((e) => e.review).filter((r) => r && r.status === "approved")) };
}

// An admin's actions on a review's status, the status each sets, and when
// each is allowed. Reply, remove the reply and delete are handled apart.
export const ACTIONS = { approve: "approved", decline: "declined", hide: "hidden", restore: "approved" };
export function canModerate(action, status) {
  if (action === "approve") return status === "pending" || status === "declined";
  if (action === "decline") return status === "pending";
  if (action === "hide") return status === "approved";
  if (action === "restore") return status === "hidden";
  return false;
}
export const DELETE_REASONS = {
  spam: "Spam",
  abuse: "Abuse or hate",
  private_info: "Private information",
  member_request: "Member requested removal",
  other: "Other"
};
// The reply as stored: cleaned like a review (no links or HTML), 2-1000
// characters. Returns { text } or { error }.
export function validateReply(raw) {
  if (typeof raw !== "string" || raw.length > MAX_REPLY * 2) return fail("bad_reply", "Keep the reply to " + MAX_REPLY + " characters.");
  const text = cleanText(raw);
  if (text.length < 2) return fail("bad_reply", "Write a reply (links and HTML are removed).");
  if (text.length > MAX_REPLY) return fail("bad_reply", "Keep the reply to " + MAX_REPLY + " characters.");
  return { text };
}
// Admin pages and actions: an admin with two-step verification on.
export function adminState(user) {
  if (!user) return "signed_out";
  if (!user.admin) return "not_admin";
  if (!user.twoFactor) return "needs_2fa";
  return "ok";
}

// ---- Storage: the reviews on every Clerk user --------------------------

const STALE_OK_MS = 10 * 60 * 1000;
let inFlight = null, lastGood = null;

// Every user's review and every admin's deletion log, read from Clerk in
// pages of 500 on every call (no cache, so an approval, hide or delete
// shows on the next page load). Calls that arrive together share one read;
// if Clerk can't be reached, the last good read (up to 10 minutes old) is
// used instead.
export function scanUsers() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const entries = [], deletions = [];
    for (let offset = 0; offset < 100000; offset += 500) {
      const page = await clerk().users.getUserList({ limit: 500, offset, orderBy: "-created_at" });
      const users = Array.isArray(page) ? page : page.data || [];
      for (const u of users) {
        const pm = u.privateMetadata || {};
        const r = pm.review;
        if (r && typeof r === "object" && STATUSES.includes(r.status)) entries.push({ userId: u.id, review: r });
        if (Array.isArray(pm.reviewDeletions)) {
          const by = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.id;
          for (const d of pm.reviewDeletions) deletions.push({ ...d, by, byId: u.id });
        }
      }
      if (users.length < 500) break;
    }
    lastGood = { at: Date.now(), entries, deletions };
    return { entries, deletions };
  })().catch((e) => {
    if (lastGood && Date.now() - lastGood.at < STALE_OK_MS) {
      console.log("reviews: Clerk read failed, using the last good read", e && e.message);
      return { entries: lastGood.entries, deletions: lastGood.deletions };
    }
    throw e;
  }).finally(() => { inFlight = null; });
  return inFlight;
}
export async function allReviews() { return (await scanUsers()).entries; }
// Kept for the member's own writes: nothing is cached, so nothing to forget.
export function forgetList() { lastGood = null; }

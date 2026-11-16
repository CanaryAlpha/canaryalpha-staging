/*
 * Member reviews: the rules, and where they are kept.
 *
 * Each member has at most one review, kept on their own Clerk user in
 * privateMetadata.review (never sent to the browser by Clerk; only these
 * api/reviews/ functions read or write it). Deleting the account deletes
 * the review with it. The shape:
 *
 *   { rating 1-5, text (cleaned, 20-600 characters), display "name" |
 *     "initials" | "anonymous", name (the name shown, worked out when the
 *     review is saved), consent true, tier "free" | "pro" | "enterprise"
 *     (at the time of writing), createdAt, updatedAt, status "pending" |
 *     "approved" | "declined" | "hidden", moderatedAt }
 *
 * Every new or edited review is "pending" until the owner approves it in
 * the queue (/reviews/queue/). The public list shows "approved" reviews
 * only, with the text exactly as approved: an edit sends the review back
 * to "pending", and the owner approves a specific version (updatedAt), so
 * text the owner hasn't seen is never published.
 *
 * privateMetadata.reviewLog holds the times of the member's last writes,
 * for the rate limit. The owner is the user whose publicMetadata.role is
 * "owner" (set in Clerk's dashboard; members can't change publicMetadata).
 * No email address is ever stored in a review or sent with one.
 */
import { clerk } from "./auth.js";

export const MIN_TEXT = 20;
export const MAX_TEXT = 600;
export const MIN_FOR_SUMMARY = 5;
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
  return {
    rating: r.rating,
    text: r.text,
    name: r.name,
    tier: TIER_LABELS[r.tier] ? r.tier : "free",
    tierLabel: TIER_LABELS[r.tier] || TIER_LABELS.free,
    month: d.toISOString().slice(0, 7)
  };
}

// The public list: approved reviews, newest first, with the average and
// count only once there are MIN_FOR_SUMMARY of them.
export function publicList(entries) {
  const approved = entries.map((e) => e.review).filter((r) => r && r.status === "approved")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const count = approved.length;
  const out = { count: count >= MIN_FOR_SUMMARY ? count : null, average: null, showOnHome: count >= MIN_FOR_SUMMARY,
    reviews: approved.map(publicView) };
  if (count >= MIN_FOR_SUMMARY) out.average = Math.round((approved.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10;
  return out;
}

// The owner's queue: every review, pending first, then newest.
export function queueList(entries) {
  const order = { pending: 0, approved: 1, hidden: 2, declined: 3 };
  const items = entries.filter((e) => e.review).map((e) => ({
    userId: e.userId,
    rating: e.review.rating,
    text: e.review.text,
    display: e.review.display,
    name: e.review.name,
    tier: e.review.tier,
    tierLabel: TIER_LABELS[e.review.tier] || TIER_LABELS.free,
    consent: e.review.consent === true,
    status: e.review.status,
    createdAt: e.review.createdAt,
    updatedAt: e.review.updatedAt,
    moderatedAt: e.review.moderatedAt || null
  })).sort((a, b) => (order[a.status] - order[b.status]) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return { pending: items.filter((i) => i.status === "pending").length, items };
}

// The owner's actions, and the status each one sets. Hide applies to a
// published review; Approve also brings a hidden or declined one back.
export const ACTIONS = { approve: "approved", decline: "declined", hide: "hidden" };
export function canModerate(action, status) {
  if (action === "hide") return status === "approved";
  if (action === "approve") return status !== "approved";
  if (action === "decline") return status === "pending" || status === "hidden";
  return false;
}

export function isOwner(u) {
  return !!(u && u.publicMetadata && u.publicMetadata.role === "owner");
}

// ---- Storage: the reviews on every Clerk user --------------------------

const LIST_TTL_MS = 60 * 1000;
let listCache = null;

// Every user that has a review: [{ userId, review }]. Read from Clerk in
// pages of 500; kept for a minute in this function instance (the public
// endpoint is also cached by Vercel's CDN).
export async function allReviews({ fresh = false } = {}) {
  if (!fresh && listCache && Date.now() - listCache.at < LIST_TTL_MS) return listCache.entries;
  const entries = [];
  for (let offset = 0; offset < 100000; offset += 500) {
    const page = await clerk().users.getUserList({ limit: 500, offset, orderBy: "-created_at" });
    const users = Array.isArray(page) ? page : page.data || [];
    for (const u of users) {
      const r = u.privateMetadata && u.privateMetadata.review;
      if (r && typeof r === "object" && STATUSES.includes(r.status)) entries.push({ userId: u.id, review: r });
    }
    if (users.length < 500) break;
  }
  listCache = { at: Date.now(), entries };
  return entries;
}

export function forgetList() { listCache = null; }

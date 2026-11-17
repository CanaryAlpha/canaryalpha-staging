// Member reviews: the rules (api/_lib/reviews.js), the member and public
// api/reviews/ functions and the admin api/admin/reviews/ functions, run for
// real with Clerk replaced by an in-memory fake, so these say what each kind
// of caller actually gets.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

// ---- The fake Clerk: users with metadata, and who is calling ----
const users = new Map();
let who = null;
function addUser(id, { first = "", last = "", tier = "free", role = null, twoFactor = false, email = id + "@example.test" } = {}) {
  users.set(id, { id, firstName: first, lastName: last, email, tier, twoFactorEnabled: twoFactor,
    publicMetadata: role ? { role } : {}, privateMetadata: {} });
}
// As Clerk's updateUserMetadata: a deep merge, where null removes a key.
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === null) delete out[k];
    else if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = merge(out[k], v);
    else out[k] = v;
  }
  return out;
}
const fakeClerk = {
  users: {
    async getUser(id) { const u = users.get(id); if (!u) throw new Error("not found"); return structuredClone(u); },
    async getUserList({ limit, offset }) { return { data: [...users.values()].slice(offset, offset + limit).map((u) => structuredClone(u)) }; },
    async updateUserMetadata(id, { privateMetadata, publicMetadata }) {
      const u = users.get(id);
      if (privateMetadata) u.privateMetadata = merge(u.privateMetadata, privateMetadata);
      if (publicMetadata) u.publicMetadata = merge(u.publicMetadata, publicMetadata);
    }
  }
};
async function currentUser() {
  if (!who) return null;
  const u = users.get(who);
  return {
    id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" "), firstName: u.firstName, lastName: u.lastName,
    email: u.email, tier: u.tier, admin: u.publicMetadata.role === "admin", twoFactor: u.twoFactorEnabled === true,
    review: u.privateMetadata.review || null, reviewLog: u.privateMetadata.reviewLog || []
  };
}
mock.module("../api/_lib/auth.js", { namedExports: { currentUser, clerk: () => fakeClerk, requestState: async () => null } });

const R = await import("../api/_lib/reviews.js");
const list = await import("../api/reviews/index.js");
const mine = await import("../api/reviews/mine.js");
const adminList = await import("../api/admin/reviews/index.js");
const action = await import("../api/admin/reviews/action.js");
const getAdmin = () => call(adminList.GET, "/api/admin/reviews/");
const act = (body) => call(action.POST, "/api/admin/reviews/action/", "POST", body);

const ORIGIN = "https://canaryalpha.co";
function req(path, method = "GET", body, origin = ORIGIN) {
  const headers = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request(ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function call(fn, ...args) {
  const res = await fn(req(...args));
  return { status: res.status, body: await res.json(), headers: res.headers };
}
function as(id) { who = id; R.forgetList(); }
// Lets the next write through the rate limit (15 s between writes).
function age(id) {
  const u = users.get(id);
  if (u.privateMetadata.reviewLog) u.privateMetadata.reviewLog = u.privateMetadata.reviewLog.map((t) => t - 60 * 1000);
}
const GOOD = { rating: 4, text: "Clear, careful research that explains the risks in plain English.", display: "name", consent: true };

// ---- The rules ----
test("cleanText removes HTML, links, web and email addresses", () => {
  assert.equal(R.cleanText("<b>Great</b> <script>x()</script>reports"), "Great x() reports");
  assert.equal(R.cleanText("See https://evil.example/x and www.spam.io now"), "See and now");
  assert.equal(R.cleanText("Visit canaryalpha.co/pro or mail me@x.com today"), "Visit or mail today");
  assert.equal(R.cleanText("Good report.So useful"), "Good report.So useful");
  assert.equal(R.cleanText("a\n\n\n\nb\u0000c"), "a\n\nbc");
});

test("display names: first name + last initial, initials, anonymous", () => {
  assert.equal(R.displayName("name", "Alex", "morgan"), "Alex M.");
  assert.equal(R.displayName("name", "Alex", ""), "Alex");
  assert.equal(R.displayName("name", "", "Morgan"), null);
  assert.equal(R.displayName("initials", "alex", "morgan"), "A.M.");
  assert.equal(R.displayName("initials", "", ""), null);
  assert.equal(R.displayName("anonymous", "", ""), "Anonymous member");
});

test("validateSubmission enforces rating, consent, display and 20-600 characters", () => {
  const p = { firstName: "Alex", lastName: "Morgan" };
  assert.ok(R.validateSubmission(GOOD, p).review);
  assert.equal(R.validateSubmission({ ...GOOD, rating: 6 }, p).error.code, "bad_rating");
  assert.equal(R.validateSubmission({ ...GOOD, rating: 3.5 }, p).error.code, "bad_rating");
  assert.equal(R.validateSubmission({ ...GOOD, consent: "yes" }, p).error.code, "no_consent");
  assert.equal(R.validateSubmission({ ...GOOD, display: "email" }, p).error.code, "bad_display");
  assert.equal(R.validateSubmission({ ...GOOD, text: "Too short." }, p).error.code, "too_short");
  assert.equal(R.validateSubmission({ ...GOOD, text: "https://spam.example/abcdefghijklmnopqrstuvwxyz" }, p).error.code, "too_short");
  assert.equal(R.validateSubmission({ ...GOOD, text: "x".repeat(601) }, p).error.code, "too_long");
  assert.equal(R.validateSubmission({ ...GOOD, text: "x".repeat(600) }, p).review.text.length, 600);
  assert.equal(R.validateSubmission(GOOD, { firstName: "", lastName: "" }).error.code, "no_name");
});

test("allowWrite: 15 seconds apart, at most 10 a day", () => {
  const now = 1e12;
  assert.ok(R.allowWrite([], now));
  assert.equal(R.allowWrite([now - 5000], now), null);
  assert.ok(R.allowWrite([now - 20000], now));
  const ten = Array.from({ length: 10 }, (_, i) => now - 60000 * (i + 1));
  assert.equal(R.allowWrite(ten, now), null);
  assert.ok(R.allowWrite(ten.map((t) => t - 86400000), now));
});

// ---- The functions ----
test("members of every tier can write, edit and delete their one review", async () => {
  addUser("user_free", { first: "Fay", last: "Free", tier: "free" });
  addUser("user_pro", { first: "Pat", last: "Pro", tier: "pro" });
  addUser("user_ent", { first: "Eve", last: "Enterprise", tier: "enterprise" });
  for (const id of ["user_free", "user_pro", "user_ent"]) {
    as(id);
    let r = await call(mine.GET, "/api/reviews/mine/");
    assert.equal(r.status, 200);
    assert.equal(r.body.review, null);
    r = await call(mine.POST, "/api/reviews/mine/", "POST", GOOD);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.review.status, "pending");
    const stored = users.get(id).privateMetadata.review;
    assert.equal(stored.tier, users.get(id).tier);
    assert.equal(stored.consent, true);
    assert.ok(!JSON.stringify(stored).includes("@example.test"), "no email stored");
    // Too soon: rate limited.
    r = await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, rating: 5 });
    assert.equal(r.status, 429);
    age(id);
    r = await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, rating: 5, display: "initials" });
    assert.equal(r.status, 200);
    assert.equal(r.body.review.rating, 5);
    assert.equal(users.get(id).privateMetadata.review.createdAt, stored.createdAt, "edit keeps the first date");
  }
  as("user_ent");
  age("user_ent");
  const d = await call(mine.DELETE, "/api/reviews/mine/", "DELETE");
  assert.equal(d.status, 200);
  assert.equal(users.get("user_ent").privateMetadata.review, undefined);
});

test("signed-out callers and other sites are refused", async () => {
  as(null);
  assert.equal((await call(mine.GET, "/api/reviews/mine/")).status, 401);
  assert.equal((await call(mine.POST, "/api/reviews/mine/", "POST", GOOD)).status, 401);
  assert.equal((await getAdmin()).status, 401);
  assert.equal((await act({ userId: "user_pro", action: "approve", version: "x" })).status, 401);
  as("user_free");
  assert.equal((await call(mine.POST, "/api/reviews/mine/", "POST", GOOD, "https://evil.example")).status, 403);
  assert.equal((await call(mine.DELETE, "/api/reviews/mine/", "DELETE", undefined, null)).status, 403);
});

test("only an admin can open the admin list or act; two-step verification when switched on", async () => {
  addUser("user_admin", { first: "Ada", last: "Admin", role: "admin", twoFactor: true });
  addUser("user_no2fa", { first: "Nia", role: "admin", twoFactor: false });
  addUser("user_oldowner", { first: "Olly", role: "owner", twoFactor: true });
  const pro = users.get("user_pro").privateMetadata.review;
  // Members of every tier, and the old "owner" role, get 404 for every
  // route and every action, and nothing changes.
  for (const id of ["user_free", "user_pro", "user_ent", "user_oldowner"]) {
    as(id);
    assert.equal((await getAdmin()).status, 404, id);
    for (const a of ["approve", "decline", "hide", "restore", "reply", "unreply", "delete"]) {
      const r = await act({ userId: "user_pro", action: a, version: pro.updatedAt, text: "Thanks", reason: "spam" });
      assert.equal(r.status, 404, id + " " + a);
    }
  }
  assert.equal(users.get("user_pro").privateMetadata.review.status, "pending");
  assert.ok(users.get("user_pro").privateMetadata.review, "not deleted");
  // An admin without two-step verification: let in while ADMIN_REQUIRE_2FA
  // is off (the default; Clerk's MFA needs a paid plan), told to turn it
  // on and refused once it's "true".
  as("user_no2fa");
  assert.equal((await getAdmin()).status, 200, "allowed while the switch is off");
  process.env.ADMIN_REQUIRE_2FA = "true";
  try {
    const g = await getAdmin();
    assert.equal(g.status, 403);
    assert.equal(g.body.error, "needs_2fa");
    assert.equal((await act({ userId: "user_pro", action: "approve", version: pro.updatedAt })).status, 403);
    assert.equal(users.get("user_pro").privateMetadata.review.status, "pending");
    as("user_admin");
    assert.equal((await getAdmin()).status, 200, "an admin with two-step verification gets in");
  } finally { delete process.env.ADMIN_REQUIRE_2FA; }
  // The admin, and the same-origin rule for actions.
  as("user_admin");
  const q = await getAdmin();
  assert.equal(q.status, 200);
  assert.equal(q.body.pending, 2);
  assert.ok(!JSON.stringify(q.body).includes("@example.test"), "no emails on the admin page");
  assert.equal((await call(action.POST, "/api/admin/reviews/action/", "POST", { userId: "user_pro", action: "approve", version: pro.updatedAt }, "https://evil.example")).status, 403);
});

test("admin: approve, decline, reply, edit the reply, hide, restore; stale versions are refused", async () => {
  as("user_admin");
  const q = (await getAdmin()).body;
  const pro = q.items.find((i) => i.userId === "user_pro");
  const free = q.items.find((i) => i.userId === "user_free");
  let r = await act({ userId: "user_pro", action: "approve", version: "2000-01-01" });
  assert.equal(r.status, 409);
  r = await act({ userId: "user_pro", action: "hide", version: pro.updatedAt });
  assert.equal(r.status, 409, "a waiting review can't be hidden");
  r = await act({ userId: "user_pro", action: "approve", version: pro.updatedAt });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.status, "approved");
  r = await act({ userId: "user_free", action: "decline", version: free.updatedAt });
  assert.equal(r.body.item.status, "declined");
  assert.ok(users.has("user_free"), "declining keeps the account");
  assert.equal(users.get("user_free").privateMetadata.review.text, free.text, "declining keeps the review");
  // Reply: cleaned, shown publicly with the date; then edited.
  r = await act({ userId: "user_pro", action: "reply", version: pro.updatedAt, text: "" });
  assert.equal(r.status, 400);
  r = await act({ userId: "user_pro", action: "reply", version: pro.updatedAt, text: "Thank you, <b>Pat</b>. See https://x.example for more." });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.reply.text, "Thank you, Pat . See for more.");
  assert.equal(r.body.item.reply.current, true);
  as(null);
  let pub = (await call(list.GET, "/api/reviews/")).body;
  assert.equal(pub.reviews.length, 1);
  assert.equal(pub.reviews[0].reply.text, "Thank you, Pat . See for more.");
  assert.match(pub.reviews[0].reply.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(pub.count, 1);
  assert.equal(pub.average, 5);
  assert.deepEqual(pub.breakdown, { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 });
  assert.equal(pub.showOnHome, false);
  assert.ok(!/user_|@/.test(JSON.stringify(pub)), "no account IDs or emails in public");
  as("user_admin");
  const firstReply = users.get("user_pro").privateMetadata.review.reply;
  r = await act({ userId: "user_pro", action: "reply", version: pro.updatedAt, text: "Thank you for the review." });
  assert.equal(r.body.item.reply.text, "Thank you for the review.");
  assert.equal(users.get("user_pro").privateMetadata.review.reply.createdAt, firstReply.createdAt, "an edit keeps the first date");
  // Hide: gone from public, kept stored; Restore brings it back.
  r = await act({ userId: "user_pro", action: "hide", version: pro.updatedAt });
  assert.equal(r.body.item.status, "hidden");
  as(null);
  pub = (await call(list.GET, "/api/reviews/")).body;
  assert.equal(pub.reviews.length, 0);
  assert.equal(pub.count, 0);
  assert.equal(pub.average, null);
  assert.ok(users.get("user_pro").privateMetadata.review.text, "hidden is kept");
  as("user_admin");
  r = await act({ userId: "user_pro", action: "restore", version: pro.updatedAt });
  assert.equal(r.body.item.status, "approved");
  as(null);
  assert.equal((await call(list.GET, "/api/reviews/")).body.count, 1);
  // Remove the reply (Clerk merges metadata, so it must really go).
  as("user_admin");
  r = await act({ userId: "user_pro", action: "unreply", version: pro.updatedAt });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.reply, null);
  assert.equal(users.get("user_pro").privateMetadata.review.reply, undefined);
  as(null);
  assert.equal((await call(list.GET, "/api/reviews/")).body.reviews[0].reply, undefined);
  // The member edits: back to waiting, and the old version can't be acted on.
  as("user_pro");
  age("user_pro");
  await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, text: "Changed my mind about one thing, still good overall." });
  assert.equal(users.get("user_pro").privateMetadata.review.status, "pending");
  as("user_admin");
  r = await act({ userId: "user_pro", action: "approve", version: pro.updatedAt });
  assert.equal(r.status, 409);
});

test("admin: delete needs a reason, removes the review and logs it without the text", async () => {
  as("user_admin");
  const free = (await getAdmin()).body.items.find((i) => i.userId === "user_free");
  let r = await act({ userId: "user_free", action: "delete", version: free.updatedAt });
  assert.equal(r.status, 400);
  r = await act({ userId: "user_free", action: "delete", version: free.updatedAt, reason: "because" });
  assert.equal(r.status, 400);
  assert.ok(users.get("user_free").privateMetadata.review, "nothing deleted without a valid reason");
  r = await act({ userId: "user_free", action: "delete", version: free.updatedAt, reason: "member_request" });
  assert.equal(r.status, 200);
  assert.equal(r.body.deleted, true);
  assert.equal(users.get("user_free").privateMetadata.review, undefined);
  assert.ok(users.has("user_free"), "the account stays");
  const q = (await getAdmin()).body;
  assert.equal(q.deletions.length, 1);
  const d = q.deletions[0];
  assert.equal(d.userId, "user_free");
  assert.equal(d.by, "Ada Admin");
  assert.equal(d.reasonLabel, "Member requested removal");
  assert.equal(d.rating, 5);
  assert.ok(!JSON.stringify(q.deletions).includes(free.text.slice(0, 20)), "the log has no review text");
  assert.ok(!JSON.stringify(users.get("user_admin").privateMetadata).includes(free.text.slice(0, 20)));
  r = await act({ userId: "user_free", action: "approve", version: free.updatedAt });
  assert.equal(r.status, 404, "a deleted review is gone");
});

test("the average, count and breakdown follow each approve, hide and delete; the homepage waits for 5", async () => {
  const ratings = [5, 5, 4, 3, 1, 5];
  for (let i = 0; i < ratings.length; i++) {
    const id = "user_m" + i;
    addUser(id, { first: "M" + i, last: "Member", tier: i % 2 ? "free" : "pro" });
    as(id);
    await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, rating: ratings[i] });
  }
  // The pro review from earlier (waiting after its edit) and the
  // enterprise one are cleared, so the figures below are the six alone.
  for (const id of ["user_pro", "user_ent"]) users.get(id).privateMetadata = {};
  const pub = async () => { as(null); const res = await list.GET(req("/api/reviews/")); return { body: await res.json(), cc: res.headers.get("cache-control") }; };
  let p = (await pub()).body;
  assert.equal(p.count, 0);
  assert.equal(p.average, null, "no reviews yet");
  as("user_admin");
  const items = (await getAdmin()).body.items.filter((i) => i.userId.startsWith("user_m"));
  const byId = Object.fromEntries(items.map((i) => [i.userId, i]));
  const steps = [];
  for (let i = 0; i < 4; i++) {
    as("user_admin");
    await act({ userId: "user_m" + i, action: "approve", version: byId["user_m" + i].updatedAt });
    p = (await pub()).body;
    steps.push([p.count, p.average, p.showOnHome]);
  }
  // 5 / 5,5 / 5,5,4 / 5,5,4,3
  assert.deepEqual(steps, [[1, 5, false], [2, 5, false], [3, 4.7, false], [4, 4.3, false]]);
  as("user_admin");
  await act({ userId: "user_m4", action: "approve", version: byId.user_m4.updatedAt });
  let r = await pub();
  // 5+5+4+3+1 = 18 / 5 = 3.6
  assert.equal(r.body.count, 5);
  assert.equal(r.body.average, 3.6);
  assert.deepEqual(r.body.breakdown, { 5: 2, 4: 1, 3: 1, 2: 0, 1: 1 });
  assert.equal(r.body.showOnHome, true);
  assert.equal(r.cc, "no-store", "not cached, so changes show at once");
  as("user_admin");
  await act({ userId: "user_m5", action: "approve", version: byId.user_m5.updatedAt });
  // 23 / 6 = 3.83 -> 3.8
  r = (await pub()).body;
  assert.deepEqual([r.count, r.average, r.breakdown[5]], [6, 3.8, 3]);
  // Hide the 1-star: 22 / 5 = 4.4
  as("user_admin");
  await act({ userId: "user_m4", action: "hide", version: byId.user_m4.updatedAt });
  r = (await pub()).body;
  assert.deepEqual([r.count, r.average, r.breakdown[1]], [5, 4.4, 0]);
  // Delete a 5-star: 17 / 4 = 4.25 -> 4.3, and the homepage hides again.
  as("user_admin");
  await act({ userId: "user_m0", action: "delete", version: byId.user_m0.updatedAt, reason: "spam" });
  r = (await pub()).body;
  assert.deepEqual([r.count, r.average, r.showOnHome], [4, 4.3, false]);
  assert.deepEqual(r.breakdown, { 5: 2, 4: 1, 3: 1, 2: 0, 1: 0 });
  // Pending reviews never count.
  as("user_m3");
  age("user_m3");
  await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, rating: 1 });
  r = (await pub()).body;
  assert.deepEqual([r.count, r.average], [3, 4.7], "an edit takes the review out until it's approved again");
});

test("the Admin menu link is for admins only, and the admin page isn't public", async () => {
  const fs = await import("node:fs");
  const vm = await import("node:vm");
  const window = {};
  vm.runInNewContext(fs.readFileSync(new URL("../components/site-links.js", import.meta.url), "utf8"), { window });
  const admin = window.CA_SITE_LINKS.dashboards.find((d) => d.label === "Admin");
  assert.equal(admin.href, "admin/reviews/");
  assert.equal(admin.admin, true);
  const header = fs.readFileSync(new URL("../components/site-header.js", import.meta.url), "utf8");
  assert.match(header, /!d\.admin \|\| user\.admin === true/);
  const page = fs.readFileSync(new URL("../admin/reviews/index.html", import.meta.url), "utf8");
  assert.match(page, /noindex/);
  assert.match(page, /Reply to honest criticism rather than removing it\. Delete or hide only spam, abuse, private information, claims of investment returns, or reviews the member asked to remove\./);
  const mw = fs.readFileSync(new URL("../middleware.js", import.meta.url), "utf8");
  assert.match(mw, /"\/admin\/:path\*"/);
  assert.match(fs.readFileSync(new URL("../robots.txt", import.meta.url), "utf8"), /Disallow: \/admin\//);
});

test("no aggregateRating or review markup for search engines", async () => {
  const fs = await import("node:fs");
  for (const f of ["index.html", "reviews/index.html"]) {
    assert.ok(!/aggregateRating|"@type":\s*"Review"/.test(fs.readFileSync(new URL("../" + f, import.meta.url), "utf8")), f);
  }
});

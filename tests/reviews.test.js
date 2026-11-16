// Member reviews: the rules (api/_lib/reviews.js) and the four api/reviews/
// functions, run for real with Clerk replaced by an in-memory fake, so these
// say what each kind of caller actually gets.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

// ---- The fake Clerk: users with metadata, and who is calling ----
const users = new Map();
let who = null;
function addUser(id, { first = "", last = "", tier = "free", owner = false, email = id + "@example.test" } = {}) {
  users.set(id, { id, firstName: first, lastName: last, email, tier, publicMetadata: owner ? { role: "owner" } : {}, privateMetadata: {} });
}
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === null) delete out[k];
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
    email: u.email, tier: u.tier, owner: u.publicMetadata.role === "owner",
    review: u.privateMetadata.review || null, reviewLog: u.privateMetadata.reviewLog || []
  };
}
mock.module("../api/_lib/auth.js", { namedExports: { currentUser, clerk: () => fakeClerk, requestState: async () => null } });

const R = await import("../api/_lib/reviews.js");
const list = await import("../api/reviews/index.js");
const mine = await import("../api/reviews/mine.js");
const queue = await import("../api/reviews/queue.js");
const moderate = await import("../api/reviews/moderate.js");

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
  assert.equal((await call(queue.GET, "/api/reviews/queue/")).status, 401);
  as("user_free");
  assert.equal((await call(mine.POST, "/api/reviews/mine/", "POST", GOOD, "https://evil.example")).status, 403);
  assert.equal((await call(mine.DELETE, "/api/reviews/mine/", "DELETE", undefined, null)).status, 403);
});

test("only the owner can open the queue or moderate", async () => {
  addUser("user_owner", { first: "Owen", tier: "free", owner: true });
  for (const id of ["user_free", "user_pro", "user_ent"]) {
    as(id);
    assert.equal((await call(queue.GET, "/api/reviews/queue/")).status, 404);
    const m = await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: "user_pro", action: "approve", version: "x" });
    assert.equal(m.status, 404);
  }
  assert.equal(users.get("user_pro").privateMetadata.review.status, "pending");
  as("user_owner");
  const q = await call(queue.GET, "/api/reviews/queue/");
  assert.equal(q.status, 200);
  assert.equal(q.body.pending, 2);
  assert.ok(!JSON.stringify(q.body).includes("@example.test"), "the queue shows no email");
});

test("approve, decline and hide; an edit goes back to pending; stale versions are refused", async () => {
  as("user_owner");
  const q = (await call(queue.GET, "/api/reviews/queue/")).body;
  const pro = q.items.find((i) => i.userId === "user_pro");
  const free = q.items.find((i) => i.userId === "user_free");
  let r = await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: "user_pro", action: "approve", version: "2000-01-01" });
  assert.equal(r.status, 409);
  r = await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: "user_pro", action: "approve", version: pro.updatedAt });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.status, "approved");
  r = await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: "user_free", action: "decline", version: free.updatedAt });
  assert.equal(r.body.item.status, "declined");
  assert.ok(users.has("user_free"), "declining keeps the account");
  assert.equal(users.get("user_free").privateMetadata.review.text, free.text, "declining keeps the review");
  // Published list: the approved one only, no IDs or emails.
  as(null);
  let pub = (await call(list.GET, "/api/reviews/")).body;
  assert.equal(pub.reviews.length, 1);
  assert.equal(pub.reviews[0].tierLabel, "Pro member");
  assert.equal(pub.reviews[0].name, "P.P.");
  assert.equal(pub.count, null);
  assert.equal(pub.average, null);
  assert.equal(pub.showOnHome, false);
  assert.ok(!/user_|@/.test(JSON.stringify(pub)));
  // Hide it.
  as("user_owner");
  r = await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: "user_pro", action: "hide", version: pro.updatedAt });
  assert.equal(r.body.item.status, "hidden");
  as(null);
  assert.equal((await call(list.GET, "/api/reviews/")).body.reviews.length, 0);
  // The member edits: back to pending, and the old version can't be approved.
  as("user_pro");
  age("user_pro");
  await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, text: "Changed my mind about one thing, still good overall." });
  assert.equal(users.get("user_pro").privateMetadata.review.status, "pending");
  as("user_owner");
  r = await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: "user_pro", action: "approve", version: pro.updatedAt });
  assert.equal(r.status, 409);
});

test("the average and count, and the homepage section, wait for 5 approved reviews", async () => {
  for (let i = 1; i <= 5; i++) {
    const id = "user_m" + i;
    addUser(id, { first: "M" + i, last: "Member", tier: i % 2 ? "free" : "pro" });
    as(id);
    await call(mine.POST, "/api/reviews/mine/", "POST", { ...GOOD, rating: i });
  }
  as("user_owner");
  let items = (await call(queue.GET, "/api/reviews/queue/")).body.items.filter((i) => i.userId.startsWith("user_m"));
  for (const it of items.slice(0, 4)) await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: it.userId, action: "approve", version: it.updatedAt });
  as(null);
  let pub = (await call(list.GET, "/api/reviews/")).body;
  assert.equal(pub.reviews.length, 4);
  assert.equal(pub.showOnHome, false);
  assert.equal(pub.average, null);
  as("user_owner");
  await call(moderate.POST, "/api/reviews/moderate/", "POST", { userId: items[4].userId, action: "approve", version: items[4].updatedAt });
  as(null);
  const res = await list.GET(req("/api/reviews/"));
  pub = await res.json();
  assert.equal(pub.showOnHome, true);
  assert.equal(pub.count, 5);
  assert.equal(pub.average, 3);
  assert.match(res.headers.get("cache-control"), /public/);
});

test("no aggregateRating or review markup for search engines", async () => {
  const fs = await import("node:fs");
  for (const f of ["index.html", "reviews/index.html"]) {
    assert.ok(!/aggregateRating|"@type":\s*"Review"/.test(fs.readFileSync(new URL("../" + f, import.meta.url), "utf8")), f);
  }
});

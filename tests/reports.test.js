// The report pages (item 407): /reports/ and /reports/<slug>/, rendered on
// the server at the reader's tier. The page functions run here for real,
// with the login (auth.js) and the research API (research.js) replaced by
// fakes, so these tests say what each tier's browser actually receives.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A gated report as the API serves it: the free tier is a slice, pro and
// institutional the whole thing ("*").
const FULL_ZRO = {
  web_meta: { slug: "zro", published_at: "2026-09-02T22:40:00Z", last_revised_at: "2026-09-14T10:00:00Z", revisit_date: "2026-12-02",
    seo_title: "LayerZero (ZRO) research report", seo_description: "LayerZero, rated Avoid.", execution_topology: "SECRET-TOPOLOGY" },
  headline: { rating: 3.85, decision: "Avoid", risk_tier: "High", risk_tier_basis: "HIGH, for three reasons.",
    decision_stability_statement: "The composite is 3.85 against a Watch List floor of 4.00.",
    decision_stability_jc15_facts: { "1_the_margin": "0.15 below the floor." },
    one_line_thesis: "Moves value, routes none of it to the token." },
  sections: {
    identity: { name: "LayerZero", ticker: "ZRO", category: "Bridge", chains: ["Ethereum", "Arbitrum"], _spec: "PIPELINE-NOTE" },
    market_snapshot: { canonical_price_usd: 1.0272, market_cap_usd: 384039198.64, fdv_usd: 1027246861.58, circulating_supply: 373852880.9,
      max_supply: 1000000000, ath_usd: 7.531013, ath_date: "2024-12-06", atl_series_usd: 0.707301, atl_series_date: "2026-07-31", retrieved_date: "2026-09-02" },
    executive_summary: "PRO-EXEC-SUMMARY: LayerZero routes messages.",
    summary_document: { _spec: "x", header_block: { title: "PRO-SUMMARY-DOC" }, bull_case: ["One", "Two"] },
    narrative_sections: { _agent: "9", ten_questions: [{ question: "Q1?", answer: "PRO-ANSWER-1" }] },
    ratings_breakdown: { categories: { security: { score: 4, rationale: "PRO-RATIONALE" } }, _resume_note: "PIPELINE-NOTE" },
    whale_forensics_full: { entity_table: [{ entity: "Binance", pct: 4.2 }, { entity: "Wallet A", pct: 1.1 }] },
    design_system: { palette: "DESIGN-SYSTEM-NOTE" },
    report_meta: { run: "REPORT-META-NOTE" }
  },
  revision_history: [{ published_at: "2026-09-02T22:40:00Z", decision_at_publication: "Avoid" }],
  source_gaps: [{ id: "SG-1", reason: "SOURCE-GAP-NOTE" }]
};
const FREE_LABELS = ["identity", "current_price_snapshot", "rating_headline", "risk_tier", "revisit_date", "decision_label"];
function freeZro() {
  const h = FULL_ZRO.headline, w = FULL_ZRO.web_meta;
  return {
    sections: { identity: FULL_ZRO.sections.identity, market_snapshot: FULL_ZRO.sections.market_snapshot },
    headline: { rating: h.rating, decision: h.decision, decision_stability_statement: h.decision_stability_statement,
      decision_stability_jc15_facts: h.decision_stability_jc15_facts, risk_tier: h.risk_tier, risk_tier_basis: h.risk_tier_basis, one_line_thesis: h.one_line_thesis },
    web_meta: { slug: w.slug, published_at: w.published_at, last_revised_at: w.last_revised_at, revisit_date: w.revisit_date, seo_title: w.seo_title, seo_description: w.seo_description },
    _tier: { requested: "free", filtered: true, included_fields: FREE_LABELS }
  };
}
// Bitcoin: free: ["*"], so every tier gets it whole.
const FULL_BTC = {
  web_meta: { slug: "btc", published_at: "2026-08-15T06:07:07Z", last_revised_at: "2026-08-15T06:07:07Z" },
  headline: { rating: 7, decision: "STAGED DCA — CORE HOLD", risk_tier: "Moderate-High", one_line_thesis: "Security budget at an eight-year low." },
  sections: { identity: { name: "Bitcoin", ticker: "BTC", category: "L1", chains: ["Bitcoin"] },
    market_snapshot: { canonical_price_usd: 62917.08, market_cap_usd: 1262740832205.74 },
    executive_summary: "BTC-EXEC-SUMMARY", summary_document: "# BTC summary\n\nBTC-SUMMARY-DOC" }
};

const research = mock.fn(async (path, siteTier) => {
  const tier = siteTier === "enterprise" ? "institutional" : siteTier === "pro" ? "pro" : "free";
  if (path === "/api/tokens") return { status: 200, body: { tokens: [{ slug: "btc" }, { slug: "zro" }] } };
  if (path === "/api/tokens/btc") return { status: 200, body: { ...structuredClone(FULL_BTC), _tier: { requested: tier, filtered: false } } };
  if (path === "/api/tokens/zro") {
    return { status: 200, body: tier === "free" ? freeZro() : { ...structuredClone(FULL_ZRO), _tier: { requested: tier, filtered: false } } };
  }
  if (path.startsWith("/api/documents/")) return { status: 200, body: { documents: [{ label: "Full report", format: "pdf", url: "https://r2.example/signed" }] } };
  return { status: 404, body: { error: "token_not_found", available_slugs: ["btc", "zro"] } };
});
let who = null; // the logged-in user for the next request, or null
mock.module("../api/_lib/research.js", {
  namedExports: { research, SLUG: /^[a-z0-9][a-z0-9-]{0,63}$/, mintToken: () => "v1.x.y", freeSlugs: async () => ["btc", "eth"] }
});
mock.module("../api/_lib/auth.js", { namedExports: { currentUser: async () => who, clerk: () => null, requestState: async () => null } });

const reportFn = await import("../api/pages/report.js");
const indexFn = await import("../api/pages/reports.js");
const H = await import("../api/_lib/report-html.js");

const req = (path) => new Request("https://canaryalpha.co" + path);
async function getReport(slug, tier) {
  who = tier ? { id: "u1", tier } : null;
  const r = await reportFn.GET(req("/api/pages/report/?slug=" + slug));
  return { status: r.status, headers: r.headers, html: await r.text() };
}
async function getIndex(tier) {
  who = tier ? { id: "u1", tier } : null;
  const r = await indexFn.GET(req("/api/pages/reports/"));
  return { status: r.status, headers: r.headers, html: await r.text() };
}

test("logged out: a redirect to /login/ and not one byte of any report", async () => {
  const calls = research.mock.callCount();
  for (const r of [await getReport("zro", null), await getReport("btc", null), await getIndex(null)]) {
    assert.equal(r.status, 307);
    assert.equal(r.headers.get("location"), "https://canaryalpha.co/login/");
    assert.equal(r.html, "");
  }
  assert.equal(research.mock.callCount(), calls, "the API is not even asked");
});

test("Free: Bitcoin in full", async () => {
  const r = await getReport("btc", "free");
  assert.equal(r.status, 200);
  assert.match(r.html, /BTC-EXEC-SUMMARY/);
  assert.match(r.html, /BTC-SUMMARY-DOC/);
  assert.doesNotMatch(r.html, /part of Pro/);
});

// Every name, figure and verdict the ZRO fixture carries, free tier included:
// none may reach a Free member, on any page.
const ZRO_ANYTHING = ["LayerZero", "ZRO", "3.85", "Avoid", "Bridge", "384", "Moves value", "PRO-EXEC-SUMMARY", "PRO-SUMMARY-DOC",
  "PRO-ANSWER-1", "PRO-RATIONALE", "Binance", "r2.example", "Watch List floor", "/reports/zro/"];

test("Free: any report but Bitcoin's and Ethereum's is refused, naming nothing (paid plans off)", async () => {
  delete process.env.PAID_PLANS_ENABLED;
  const calls = research.mock.callCount();
  for (const slug of ["zro", "nope", "../etc"]) {
    const r = await getReport(slug, "free");
    assert.equal(r.status, 403, slug);
    assert.match(r.html, /This report is part of Pro/);
    assert.match(r.html, /href="\/waitlist\/\?plan=pro">Coming soon\. Join the list/);
    for (const s of ZRO_ANYTHING) assert.ok(!r.html.includes(s), s + " must not reach a Free member (" + slug + ")");
  }
  assert.equal(research.mock.callCount(), calls, "the API is not even asked");
  const real = await getReport("zro", "free"), fake = await getReport("nope", "free");
  assert.equal(real.html, fake.html, "same answer whether the report exists or not");
});

test("Free, paid plans on: the panel offers the upgrade", async () => {
  process.env.PAID_PLANS_ENABLED = "true";
  try {
    const r = await getReport("zro", "free");
    assert.match(r.html, /href="\/account\/">Upgrade to Pro/);
    assert.match((await getIndex("free")).html, /href="\/account\/">Upgrade to Pro/);
  } finally { delete process.env.PAID_PLANS_ENABLED; }
});

test("Pro and Enterprise: the full report; Enterprise asks the API for institutional", async () => {
  for (const tier of ["pro", "enterprise"]) {
    const r = await getReport("zro", tier);
    assert.equal(r.status, 200);
    for (const s of ["PRO-EXEC-SUMMARY", "PRO-SUMMARY-DOC", "PRO-ANSWER-1", "PRO-RATIONALE", "Binance", "The full report", "Downloads"]) {
      assert.ok(r.html.includes(s), s + " for " + tier);
    }
    assert.doesNotMatch(r.html, /part of Pro/);
    assert.equal(r.html.includes("Full research data (JSON)"), tier === "enterprise");
  }
  assert.ok(research.mock.calls.some((c) => c.arguments[0] === "/api/tokens/zro" && c.arguments[1] === "enterprise"));
});

test("pipeline notes and production sections never reach the page", async () => {
  const r = await getReport("zro", "enterprise");
  for (const s of ["PIPELINE-NOTE", "DESIGN-SYSTEM-NOTE", "REPORT-META-NOTE", "SOURCE-GAP-NOTE", "SECRET-TOPOLOGY", "[object Object]"]) {
    assert.ok(!r.html.includes(s), s);
  }
});

test("every report page: disclosure, not-advice note, dates, noindex, no caching", async () => {
  for (const [slug, tier] of [["zro", "pro"], ["zro", "enterprise"], ["btc", "free"]]) {
    const r = await getReport(slug, tier);
    assert.match(r.html, /<strong>Disclosure:<\/strong> Canary Alpha Research (holds|does not hold) /);
    assert.match(r.html, /href="\/holdings\/">Company Holdings/);
    assert.match(r.html, /not investment advice/);
    assert.match(r.html, /Published (August|September) /);
    assert.match(r.html, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(r.html, /<link rel="canonical" href="https:\/\/canaryalpha\.co\/reports\/[a-z]+\/">/);
    assert.match(r.html, /<meta property="og:title"/);
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
  }
});

test("a rating close to a band boundary always shows its margin (JC-12)", async () => {
  const idx = await getIndex("pro");
  const page = await getReport("zro", "pro");
  for (const html of [idx.html, page.html]) {
    assert.match(html, /The composite is 3\.85 against a Watch List floor of 4\.00/);
    assert.match(html, /0\.15 below the floor/);
  }
});

test("/reports/ on Free: Bitcoin and Ethereum, the rest as locked rows with no name", async () => {
  const free = await getIndex("free");
  assert.equal(free.status, 200);
  assert.match(free.html, /href="\/reports\/btc\/">Read the report/);
  assert.equal((free.html.match(/report-card--locked/g) || []).length, 1, "one locked row for the one hidden report");
  assert.match(free.html, /Token hidden <span class="reports__ticker">Pro<\/span>/);
  assert.match(free.html, /One more report is part of Pro/);
  for (const s of ZRO_ANYTHING) assert.ok(!free.html.includes(s), s + " must not reach a Free member");
});

test("/reports/ on Pro and Enterprise: every report, newest first, all open", async () => {
  for (const tier of ["pro", "enterprise"]) {
    const r = await getIndex(tier);
    assert.ok(r.html.indexOf('href="/reports/zro/"') < r.html.indexOf('href="/reports/btc/"'), "newest first");
    assert.match(r.html, /href="\/reports\/zro\/">Read the report/);
    assert.doesNotMatch(r.html, /report-card--locked|part of Pro/);
    assert.ok(!r.html.includes("PRO-EXEC-SUMMARY"), "the index carries headline fields only");
  }
});

test("the JSON endpoints refuse Free the same way: 403, no name, whether the report exists or not", async () => {
  const reportApi = await import("../api/research/report.js");
  const docsApi = await import("../api/research/documents.js");
  for (const fn of [reportApi, docsApi]) {
    for (const slug of ["zro", "nope"]) {
      who = { id: "u1", tier: "free" };
      const r = await fn.GET(req("/api/research/x/?slug=" + slug));
      const body = await r.text();
      assert.equal(r.status, 403, slug);
      assert.match(body, /"error":"locked"/);
      assert.ok(!body.includes("LayerZero") && !body.includes("available_slugs"), slug);
    }
    who = { id: "u1", tier: "free" };
    assert.equal((await fn.GET(req("/api/research/x/?slug=btc"))).status, 200, "BTC stays open on Free");
    who = { id: "u1", tier: "pro" };
    assert.equal((await fn.GET(req("/api/research/x/?slug=zro"))).status, 200, "Pro reads ZRO");
  }
});

test("an unknown or malformed slug is a 404, without the API's slug list", async () => {
  for (const slug of ["nope", "../etc"]) {
    const r = await getReport(slug, "pro");
    assert.equal(r.status, 404);
    assert.doesNotMatch(r.html, /available_slugs/);
  }
});

test("labels read as words", () => {
  assert.equal(H.label("1_the_margin"), "The margin");
  assert.equal(H.label("market_cap_usd"), "Market cap USD");
  assert.equal(H.label("whale_forensics_full"), "Whale-wallet forensics: full analysis");
});

test("the page frame loads the same asset versions as the site's other pages", () => {
  const pages = ["index.html", "dashboard/index.html", "account/index.html"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
  for (const [file, ver] of Object.entries(H.ASSET_VERSIONS)) {
    const seen = [...pages.matchAll(new RegExp(file.split("/").pop().replace(/\./g, "\\.") + "\\?v=(\\d+)", "g"))].map((m) => +m[1]);
    assert.ok(seen.length, file + " is used by the other pages");
    assert.ok(seen.every((n) => n === ver), file + " is v" + ver + " everywhere, saw " + seen.join(","));
  }
});

test("every logo in the list has its four files", async () => {
  const { LOGOS } = await import("../api/_lib/logos.js");
  for (const base of Object.values(LOGOS)) {
    for (const f of ["-64.png", "-128.png", "-64.webp", "-128.webp"]) assert.ok(fs.existsSync(base + f), base + f);
  }
});

test("routing: report addresses go to the page functions behind the login", () => {
  const v = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  assert.ok(v.rewrites.some((r) => r.source === "/reports/:slug/" && r.destination.startsWith("/api/pages/report/")));
  assert.ok(v.rewrites.some((r) => r.source === "/reports/" && r.destination === "/api/pages/reports/"));
  assert.ok(v.functions["api/pages/*.js"].includeFiles.includes("data/holdings.json"));
  const mw = fs.readFileSync("middleware.js", "utf8");
  assert.match(mw, /matcher: \[[^\]]*"\/reports\/:path\*"/);
  // Static files win over rewrites on Vercel: nothing may sit under reports/.
  assert.ok(!fs.existsSync("reports"), "no static reports/ folder");
});

test("after logging in or signing up: always the dashboard", () => {
  const src = fs.readFileSync("components/members/clerk-forms.js", "utf8");
  assert.match(src, /function next\(\) \{ return "\/dashboard\/"; \}/);
});

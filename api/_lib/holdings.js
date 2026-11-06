/*
 * data/holdings.json, read on the server for the disclosure line on each
 * report (the same file and wording as components/holdings/). vercel.json
 * ships the file with the report functions (functions.includeFiles).
 */
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "holdings.json");
let cache = null;

export function holdings() {
  const now = Date.now();
  if (cache && now - cache.at < 60 * 1000) return cache.value;
  let value = { byTicker: {}, ok: false };
  try {
    const d = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const byTicker = {};
    for (const h of Array.isArray(d.holdings) ? d.holdings : []) {
      const t = String((h && h.ticker) || "").trim().toUpperCase();
      if (t) byTicker[t] = h;
    }
    value = { byTicker, ok: true };
  } catch (e) {
    console.log("holdings: data/holdings.json unreadable:", e && e.message);
  }
  cache = { value, at: now };
  return value;
}

// Is this ticker held? true / false, or null when the file can't be read
// (the page then points to the holdings page instead of saying either).
export function isHeld(ticker) {
  const h = holdings();
  if (!h.ok) return null;
  const e = h.byTicker[String(ticker || "").toUpperCase()];
  return !!(e && e.status === "held");
}

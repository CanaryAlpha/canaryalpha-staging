// Served files must never point at a local preview server. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("no served file contains localhost or 127.0.0.1", () => {
  const script = fileURLToPath(new URL("../tools/check-local-links.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

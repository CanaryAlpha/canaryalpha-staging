// The show-password eye sat low in Clerk's password inputs: Clerk drew a
// 44px button pinned 3px from the top of a 36px input. Every Clerk password
// field now takes its sizing from one helper, shared by both appearances.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const js = fs.readFileSync("components/members/clerk-forms.js", "utf8");

test("one shared sizing helper, used by the account panel and the yellow login panel", () => {
  assert.match(js, /function fieldSizing\(ink, h\)/);
  assert.equal((js.match(/fieldSizing\(INK, "4[48]px"\)/g) || []).length, 2);
  for (const k of ["formFieldInputGroup: size.group", "formFieldInputShowPasswordButton: size.button",
    "formFieldInputShowPasswordIcon: size.icon"]) {
    assert.equal(js.split(k).length - 1, 2, k + " in both appearances");
  }
  assert.doesNotMatch(js, /formFieldInputShowPasswordButton: \{ color: INK \}/);
});

test("the eye fills the input's height, keeps a 44px target, a focus ring and room for typed text", () => {
  assert.match(js, /top: "0", bottom: "0", right: "0"/);
  assert.match(js, /minHeight: "44px"/);
  assert.match(js, /minWidth: "44px"/);
  assert.match(js, /alignItems: "center"/);
  assert.match(js, /"&:focus-visible": \{ outline: "2px solid " \+ ink/);
  assert.match(js, /"& input": \{ paddingRight: "52px" \}/);
  assert.match(js, /paddingTop: "0", paddingBottom: "0", paddingLeft: "12px", lineHeight: "normal"/);
});

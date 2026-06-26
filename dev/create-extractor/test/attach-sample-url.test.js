// Offline unit tests for attach-sample-url.js:
// folding a deferred extractor request's event URL into the leader issue body as
// an extra sample. The edit must be idempotent (re-runs and ticked boxes don't
// double a URL) so the workflow can apply it blindly.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { addSample } = require("../attach-sample-url");

const START = "<!-- additional-samples:start -->";
const END = "<!-- additional-samples:end -->";

test("adds the block (with markers + heading) when none exists yet", () => {
  const out = addSample("### URL\n\nhttps://site.example/e/1\n", "https://site.example/e/2");
  assert.ok(out.includes(START) && out.includes(END));
  assert.match(out, /Additional sample pages/);
  assert.match(out, /- \[ \] https:\/\/site\.example\/e\/2/);
  // The original body is preserved.
  assert.match(out, /### URL/);
});

test("appends a second URL into the existing block, before the end marker", () => {
  const first = addSample("body", "https://site.example/a");
  const out = addSample(first, "https://site.example/b");
  assert.match(out, /- \[ \] https:\/\/site\.example\/a/);
  assert.match(out, /- \[ \] https:\/\/site\.example\/b/);
  // Exactly one block — the second add didn't open a new one.
  assert.equal(out.split(START).length - 1, 1);
  assert.equal(out.split(END).length - 1, 1);
  // New item sits inside the block (before the end marker).
  assert.ok(out.indexOf("https://site.example/b") < out.indexOf(END));
});

test("is idempotent: re-adding the same URL is a no-op", () => {
  const once = addSample("body", "https://site.example/a");
  const twice = addSample(once, "https://site.example/a");
  assert.equal(twice, once);
});

test("does not re-add a URL the agent has already ticked off", () => {
  const added = addSample("body", "https://site.example/a");
  const ticked = added.replace("- [ ] https://site.example/a", "- [x] https://site.example/a");
  assert.equal(addSample(ticked, "https://site.example/a"), ticked);
});

test("a blank URL leaves the body untouched", () => {
  assert.equal(addSample("body", ""), "body");
  assert.equal(addSample("body", undefined), "body");
});

test("handles an empty/undefined body", () => {
  const out = addSample("", "https://site.example/a");
  assert.match(out, /- \[ \] https:\/\/site\.example\/a/);
  assert.ok(out.startsWith(START));
});

// Logic leaf 12.6 (wired): A fallback (non-dedicated) event counts as COMPLETE only when it has all three of a title, a location, and a start; anything less is "nothing found".
// Verified by dev/requirements/product-requirements.test.js, which runs verify().
"use strict";

const path = require("node:path");
const ROOT = path.join(__dirname, "..", "..", "..", "..");

module.exports = {
  kind: "logic",
  description: "A fallback (non-dedicated) event counts as COMPLETE only when it has all three of a title, a location, and a start; anything less is \"nothing found\".",
  verify: async () => {
    const assert = require("node:assert/strict");
    const { pathToFileURL } = require("node:url");
    const { isPresentableFallbackEvent } = await import(pathToFileURL(path.join(ROOT, "extension", "fallback-policy.js")).href);
    // Complete = all three of title, location, and a start.
    assert.equal(isPresentableFallbackEvent({ title: "T", location: "L", times: [{ start: "2026-01-01T10:00:00" }] }), true, "title+location+start is complete");
    assert.equal(isPresentableFallbackEvent({ title: "T", location: "L" }), false, "no start -> not complete");
    assert.equal(isPresentableFallbackEvent({ title: "T", times: [{ start: "2026-01-01T10:00:00" }] }), false, "no location -> not complete");
    assert.equal(isPresentableFallbackEvent({ location: "L", times: [{ start: "2026-01-01T10:00:00" }] }), false, "no title -> not complete");
  },
};

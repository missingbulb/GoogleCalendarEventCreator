// Logic leaf 15.4 (wired): A date with NO time becomes an all-day event.
// Verified by product-requirements.test.js, which runs verify().
"use strict";

const path = require("node:path");
const ROOT = path.join(__dirname, "..", "..", "..", "..");

module.exports = {
  description: "A date with NO time becomes an all-day event.",
  verify: async () => {
    const assert = require("node:assert/strict");
    const { extractFromHtml } = require(path.join(ROOT, "extension-test", "harness"));
    const html = '<script type="application/ld+json">{"@type":"Event","name":"Fair","startDate":"2026-10-03","location":{"@type":"Place","name":"Market Square"}}</' + 'script><h1>x</h1>';
    const ev = extractFromHtml(html, "https://example.test/e").events[0];
    // A date with no time extracts as a date-only start (no "T") = all-day.
    assert.match(ev.times[0].start, /^\d{4}-\d{2}-\d{2}$/, "date-only start = all-day event");
  },
};

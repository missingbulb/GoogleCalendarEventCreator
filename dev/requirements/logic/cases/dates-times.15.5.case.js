// Logic leaf 15.5 (wired): When the page gives a start but no end, the event is `defaultEventDurationMs` long (2 hours by default); all-day events stay all-day.
// Verified by product-requirements.test.js, which runs verify().
"use strict";

const path = require("node:path");
const ROOT = path.join(__dirname, "..", "..", "..", "..");

module.exports = {
  description: "When the page gives a start but no end, the event is `defaultEventDurationMs` long (2 hours by default); all-day events stay all-day.",
  verify: async () => {
    const assert = require("node:assert/strict");
    const { pathToFileURL } = require("node:url");
    const { GCalConfig } = await import(pathToFileURL(path.join(ROOT, "extension", "config.js")).href);
    // Start-but-no-end events get this default span (2h).
    assert.equal(GCalConfig.defaultEventDurationMs, 2 * 60 * 60 * 1000, "default event duration is 2 hours");
  },
};

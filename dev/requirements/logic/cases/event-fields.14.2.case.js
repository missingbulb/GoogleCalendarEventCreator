"use strict";

const path = require("node:path");
const ROOT = path.join(__dirname, "..", "..", "..", "..");

module.exports = {
  description: "Title falls back to the page/tab title, and then to a configured default (`fallbackEventTitle`) when the page gives none.",
  verify: async () => {
    const assert = require("node:assert/strict");
    const { pathToFileURL } = require("node:url");
    const { GCalConfig } = await import(pathToFileURL(path.join(ROOT, "extension", "config.js")).href);
    // The configured default title used when a page (and tab) give none.
    assert.equal(typeof GCalConfig.fallbackEventTitle, "string", "fallbackEventTitle is configured");
    assert.ok(GCalConfig.fallbackEventTitle.length > 0, "fallbackEventTitle is a non-empty default");
  },
};

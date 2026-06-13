// Loads pure helper functions from popup.js into a sandbox so the UI
// renderer can compute the same display text the real popup shows, without
// a browser/DOM. popup.js's top-level IIFE throws (no `document`/`chrome`
// in this sandbox) but is caught by its own .catch(), leaving the
// function declarations below it (e.g. formatWhen) on the sandbox global.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPopupHelpers() {
  // A no-op console for the IIFE's expected .catch(console.error) here
  // (there's no document/chrome in this sandbox) so it doesn't print noise.
  const sandbox = { console: { error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "popup.js"), "utf8"), sandbox);
  return { formatWhen: sandbox.formatWhen, summarize: sandbox.summarize };
}

module.exports = loadPopupHelpers();

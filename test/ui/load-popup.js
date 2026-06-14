// Loads the popup's pure display helpers (formatWhen, summarize, dateChip) so
// the UI renderer can compute the same text the real popup shows, without a
// browser/DOM. They live in ui/views/events-view.js, which is an ES module, so
// this exports an async loader that import()s it. The module's DOM-using parts
// (makeButton) run only when called, so importing it in Node is side-effect-free.
"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadPopupHelpers() {
  const mod = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "ui", "views", "events-view.js"))
  );
  return { formatWhen: mod.formatWhen, summarize: mod.summarize, dateChip: mod.dateChip };
}

module.exports = loadPopupHelpers;

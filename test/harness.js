// Shared test harness: runs the real, unmodified extractor.js against an HTML
// document as if it were loaded at a given URL (so hostname-based
// site detection behaves exactly like in the browser).
"use strict";

const { readFileSync } = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const EXTRACTOR_SRC = readFileSync(path.join(__dirname, "..", "extractor.js"), "utf8");

/**
 * @param {string} html  Full HTML of the page.
 * @param {string} url   The URL the page "lives" at.
 * @returns {object}     The extractor's result: { title, start, end, location, description, multipleEvents }
 */
function extractFromHtml(html, url) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  try {
    return dom.window.eval(EXTRACTOR_SRC);
  } finally {
    dom.window.close();
  }
}

module.exports = { extractFromHtml };

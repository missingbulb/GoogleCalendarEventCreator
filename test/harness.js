// Shared test harness: runs the real, unmodified extractor files against an
// HTML document as if it were loaded at a given URL (so hostname-based site
// detection behaves exactly like in the browser).
//
// The list of files — and their injection order — is read from
// EXTRACTOR_FILES in background.js, so the tests always exercise exactly
// what the extension injects.
"use strict";

const { readFileSync } = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");

function extractorSources() {
  const background = readFileSync(path.join(ROOT, "background.js"), "utf8");
  const listMatch = background.match(/EXTRACTOR_FILES\s*=\s*\[([^\]]*)\]/);
  assert.ok(listMatch, "Could not find EXTRACTOR_FILES in background.js");
  const files = [...listMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(files.length > 0, "EXTRACTOR_FILES in background.js is empty");
  return files.map((file) => ({ file, src: readFileSync(path.join(ROOT, file), "utf8") }));
}

const SOURCES = extractorSources();

/**
 * @param {string} html  Full HTML of the page.
 * @param {string} url   The page URL.
 * @returns {object}     The extractor's result: { title, start, end, location, description, multipleEvents }
 */
function extractFromHtml(html, url) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  try {
    let result;
    for (const { src } of SOURCES) {
      result = dom.window.eval(src); // last file (extractors/main.js) returns the event
    }
    return result;
  } finally {
    dom.window.close();
  }
}

module.exports = { extractFromHtml };

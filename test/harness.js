// Shared test harness: runs the real, unmodified extractor files against an
// HTML document as if it were loaded at a given URL (so hostname-based site
// detection behaves exactly like in the browser).
//
// The list of files — and their injection order — is read from the generated
// pipeline/load-order.generated.json (the same list popup.js injects), so the
// tests always exercise exactly what the popup injects.
"use strict";

const { readFileSync } = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");

function extractorSources() {
  const files = JSON.parse(
    readFileSync(path.join(ROOT, "pipeline/load-order.generated.json"), "utf8")
  );
  assert.ok(files.length > 0, "pipeline/load-order.generated.json is empty");
  return files.map((file) => ({ file, src: readFileSync(path.join(ROOT, file), "utf8") }));
}

const SOURCES = extractorSources();

/**
 * @param {string} html  Full HTML of the page.
 * @param {string} url   The page URL.
 * @returns {object}     The extractor's result: { events: [{ title, start, end, location, description, ctz }], supported }
 */
function extractFromHtml(html, url) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  try {
    let result;
    for (const { src } of SOURCES) {
      result = dom.window.eval(src); // last file (pipeline/assemble-events.js) returns the result
    }
    return result;
  } finally {
    dom.window.close();
  }
}

module.exports = { extractFromHtml };

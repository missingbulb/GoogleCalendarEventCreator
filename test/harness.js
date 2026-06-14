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
 * @param {object} [opts]
 * @param {"outside-only"|"dangerously"} [opts.runScripts]  jsdom scripting mode.
 *   Defaults to "outside-only". Pass "dangerously" only for script-free HTML
 *   fragments that need browser-faithful <noscript> parsing (with scripting on,
 *   jsdom keeps <noscript> content as raw text, like a real browser); never for
 *   real cached pages, whose third-party scripts would then execute.
 * @returns {object}     The extractor's result: { events: [{ title, start, end, location, description, ctz }], supported }
 */
function extractFromHtml(html, url, opts = {}) {
  const dom = new JSDOM(html, { url, runScripts: opts.runScripts || "outside-only" });
  try {
    // Load every file in injection order so they register onto GCal (the
    // helpers, the extract layers, and the sources), then run the SAME named
    // top-level extractor the popup runs — GCal.extract() picks the matching
    // site source for this URL internally. Going through GCal.extract() (rather
    // than the last file's completion value) keeps the tests on the exact entry
    // point the extension uses.
    for (const { src } of SOURCES) {
      dom.window.eval(src);
    }
    return dom.window.eval("GCal.extract()");
  } finally {
    dom.window.close();
  }
}

module.exports = { extractFromHtml };

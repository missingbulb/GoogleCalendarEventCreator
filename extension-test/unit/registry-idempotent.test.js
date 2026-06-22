// The popup re-injects the whole pipeline on every open (the page's isolated
// world persists between opens), so registration must be idempotent: injecting
// the same files twice must leave GCal.sources the same size, not stack a
// duplicate matcher per reopen. registry.js owns a fresh GCal.sources on each
// load — and it's pinned first in the load order — which is what guarantees it.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..", "..");
const EXT = path.join(ROOT, "extension"); // the extension root; load-order entries are relative to it
const FILES = JSON.parse(
  readFileSync(path.join(EXT, "pipeline/load-order.generated.json"), "utf8")
).map((file) => readFileSync(path.join(EXT, file), "utf8"));

// Inject the whole pipeline into a window exactly as executeScript does.
function injectPipeline(window) {
  for (const src of FILES) window.eval(src);
}

test("re-injecting the pipeline does not grow GCal.sources", () => {
  const dom = new JSDOM("", { url: "https://example.com/", runScripts: "outside-only" });
  try {
    injectPipeline(dom.window);
    const afterFirst = dom.window.eval("GCal.sources.length");
    assert.ok(afterFirst > 0, "sources should register on first injection");

    injectPipeline(dom.window); // the popup re-injects on every open
    const afterSecond = dom.window.eval("GCal.sources.length");
    assert.equal(afterSecond, afterFirst, "re-injection must not duplicate sources");

    // A supported host still resolves to exactly one matching source.
    const matches = dom.window.eval('GCal.sources.filter((s) => s.matches("meetup.com")).length');
    assert.equal(matches, 1, "exactly one source should match a supported host");
  } finally {
    dom.window.close();
  }
});

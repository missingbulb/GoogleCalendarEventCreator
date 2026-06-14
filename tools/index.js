#!/usr/bin/env node
// Generates pipeline/load-order.generated.json — the single source of truth for
// the order the extractor files are injected into the page (and exercised by
// the tests). Run it with `npm run index` after adding/removing an extractor.
//
// This replaces the hand-edited EXTRACTOR_FILES array that used to live in
// background.js: adding a source is now a single-new-file change, and the list
// is regenerated mechanically instead of being kept in sync by hand. A CI test
// (test/unit/load-order-generated.test.js) asserts the committed file matches
// what this generator would produce, so it can never silently drift.
//
// Ordering rule (the only ordering that matters): the shared helpers and the
// host registry load FIRST (they build globalThis.GCal), the orchestrator
// (main.js) loads LAST (its completion value is the extraction result), and
// everything in between is sorted for a stable, conflict-free list.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const EXTRACTORS_DIR = "extractors";
const OUTPUT = "pipeline/load-order.generated.json";

// Pinned positions; every other extractors/*.js sorts in between.
const FIRST = ["lib.js", "site-hosts.js"]; // shared toolbox + DOM-free host registry
const LAST = ["main.js"]; // orchestrator; its completion value is the result

function computeLoadOrder() {
  const all = fs
    .readdirSync(path.join(ROOT, EXTRACTORS_DIR))
    .filter((f) => f.endsWith(".js"));

  for (const f of [...FIRST, ...LAST]) {
    if (!all.includes(f)) {
      throw new Error(`expected ${EXTRACTORS_DIR}/${f} to exist`);
    }
  }

  const pinned = new Set([...FIRST, ...LAST]);
  const middle = all.filter((f) => !pinned.has(f)).sort();

  return [...FIRST, ...middle, ...LAST].map((f) => `${EXTRACTORS_DIR}/${f}`);
}

// JSON, one path per line, trailing newline — a clean, reviewable diff.
function render(list) {
  return JSON.stringify(list, null, 2) + "\n";
}

if (require.main === module) {
  const list = computeLoadOrder();
  fs.writeFileSync(path.join(ROOT, OUTPUT), render(list));
  console.log(`Wrote ${OUTPUT} (${list.length} files)`);
}

module.exports = { computeLoadOrder, render, OUTPUT };

#!/usr/bin/env node
// Generates the derived load order from the event-extractor sources on disk:
//   - event-extractors/load-order.generated.json — the single source of truth
//     for the order the extraction files are injected into the page (and
//     exercised by the tests).
// Run it with `npm run index` after adding/removing a source or extractor file.
//
// Adding a per-site extractor is a single-new-file change: drop
// event-extractors/custom/<site>.js and rerun this; the list is regenerated
// mechanically rather than kept in sync by hand. A CI test (the load-order
// drift guard) asserts the committed file matches what this generator would
// produce, so it can never silently drift.
//
// Ordering rule (the only ordering that matters): the registry and shared
// helpers load FIRST (they build globalThis.GCal), the per-site sources
// (event-extractors/custom/*.js) load next — sorted, for a stable conflict-free
// list — and the tail is pinned: the generic extractor, then the orchestrator
// (event-extractors/assemble-events.js, whose completion value is the result).
//
// generic-extractor.js lives OUTSIDE event-extractors/ (at the extension root):
// event-extractors/ is the extensibility point for per-site extractors, and the
// generic extractor is a different thing — the base layer every one of them
// overrides. It's pinned by name here rather than globbed, since it's the only
// injected file outside that folder.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
// The deployable extension lives under extension/ (its own extension root —
// the folder Chrome loads). Files are read/written there, but the emitted load
// list stays extension-root-relative ("event-extractors/...") because that's
// how the popup injects them (chrome.runtime.getURL / executeScript resolve
// against the extension root, i.e. extension/).
const EXT = path.join(ROOT, "extension");
const DIR = "event-extractors";
const OUTPUT = "event-extractors/load-order.generated.json";

// All paths below are extension-root-relative, so generic-extractor.js carries no
// directory prefix while everything else sits under event-extractors/.
const PINNED_FIRST = [`${DIR}/registry.js`]; // followed by helpers/*, added below
// The generic base layer, then the orchestrator.
const PINNED_LAST = ["generic-extractor.js", `${DIR}/assemble-events.js`];

const isJs = (f) => f.endsWith(".js");

function computeLoadOrder() {
  const helpers = fs
    .readdirSync(path.join(EXT, DIR, "helpers"))
    .filter(isJs)
    .sort()
    .map((f) => `${DIR}/helpers/${f}`);

  const sources = fs
    .readdirSync(path.join(EXT, DIR, "custom"))
    .filter(isJs)
    .map((f) => `${DIR}/custom/${f}`);

  const pinned = new Set([...PINNED_FIRST, ...PINNED_LAST]);
  const topLevelMiddle = fs
    .readdirSync(path.join(EXT, DIR))
    .filter(isJs)
    .map((f) => `${DIR}/${f}`)
    .filter((f) => !pinned.has(f));

  const middle = [...topLevelMiddle, ...sources].sort();

  for (const f of [...PINNED_FIRST, ...PINNED_LAST]) {
    if (!fs.existsSync(path.join(EXT, f))) {
      throw new Error(`expected ${f} to exist`);
    }
  }

  return [...PINNED_FIRST, ...helpers, ...middle, ...PINNED_LAST];
}

// JSON, one path per line, trailing newline — a clean, reviewable diff.
function render(list) {
  return JSON.stringify(list, null, 2) + "\n";
}

if (require.main === module) {
  const list = computeLoadOrder();
  fs.writeFileSync(path.join(EXT, OUTPUT), render(list));
  console.log(`Wrote ${OUTPUT} (${list.length} files)`);
}

module.exports = {
  computeLoadOrder,
  render,
  OUTPUT,
};

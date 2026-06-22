#!/usr/bin/env node
// Generates the derived load order from the event-extractor sources on disk:
//   - event-extractors/load-order.generated.json — the single source of truth
//     for the order the extraction files are injected into the page (and
//     exercised by the tests).
// Run it with `npm run index` after adding/removing a source or extractor file.
//
// Adding a source is a single-new-file change: drop
// event-extractors/custom/<site>.js and rerun this; the list is regenerated
// mechanically rather than kept in sync by hand. A CI test
// (dev/tools/test/load-order-generated.test.js) asserts the committed file
// matches what this generator would produce, so it can never silently drift.
//
// Ordering rule (the only ordering that matters): the registry and shared
// helpers load FIRST (they build globalThis.GCal), the orchestrator
// (assemble-events.js) loads LAST (its completion value is the extraction
// result), and everything in between — the extract-* layers and the per-source
// files — is sorted for a stable, conflict-free list.

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

const PINNED_FIRST = ["registry.js"]; // followed by helpers/*, added below
const PINNED_LAST = ["assemble-events.js"]; // the orchestrator

const isJs = (f) => f.endsWith(".js");

function computeLoadOrder() {
  const helpers = fs
    .readdirSync(path.join(EXT, DIR, "helpers"))
    .filter(isJs)
    .sort()
    .map((f) => `helpers/${f}`);

  const sources = fs
    .readdirSync(path.join(EXT, DIR, "custom"))
    .filter(isJs)
    .map((f) => `custom/${f}`);

  const pinned = new Set([...PINNED_FIRST, ...PINNED_LAST]);
  const topLevelMiddle = fs
    .readdirSync(path.join(EXT, DIR))
    .filter((f) => isJs(f) && !pinned.has(f)); // the extract-* layers

  const middle = [...topLevelMiddle, ...sources].sort();

  for (const f of [...PINNED_FIRST, ...PINNED_LAST]) {
    if (!fs.existsSync(path.join(EXT, DIR, f))) {
      throw new Error(`expected ${DIR}/${f} to exist`);
    }
  }

  return [...PINNED_FIRST, ...helpers, ...middle, ...PINNED_LAST].map((f) => `${DIR}/${f}`);
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

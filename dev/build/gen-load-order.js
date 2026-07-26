#!/usr/bin/env node
// Generates the derived load order from the event-extractor sources on disk:
//   - event-extractors/load-order.generated.json — the single source of truth
//     for the order the extraction files are injected into the page (and
//     exercised by the tests).
// Run it with `npm run index` after adding/removing a source or extractor file.
//
// Adding a source is a single-new-file change: drop
// event-extractors/custom/<site>.js and rerun this; the list is regenerated
// mechanically rather than kept in sync by hand. A CI test (the load-order
// drift guard) asserts the committed file matches what this generator would
// produce, so it can never silently drift.
//
// Ordering rule (the only ordering that matters): the registry and shared
// helpers load FIRST (they build globalThis.GCal), the per-site sources
// (custom/*.js) load next — sorted, for a stable conflict-free list — and the
// tail is pinned: the core generic extractor and the hosts it alone serves
// (core/*.js), then the orchestrator (assemble-events.js, whose completion value
// is the extraction result).
//
// core/generic-sites.js is pinned AFTER every custom/<site>.js on purpose: it
// registers a bare matcher per host served by the generic extractor alone, and
// assemble-events.js takes the FIRST source whose matches() accepts the host, so
// a dedicated source added for one of those hosts always wins.

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
// The core layer, then the orchestrator. See the ordering rule above for why
// core/generic-sites.js is pinned behind the per-site sources.
const PINNED_LAST = ["core/generic.js", "core/generic-sites.js", "assemble-events.js"];

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
    .filter((f) => isJs(f) && !pinned.has(f));

  const middle = [...topLevelMiddle, ...sources].sort();

  for (const f of [...PINNED_FIRST, ...PINNED_LAST]) {
    if (!fs.existsSync(path.join(EXT, DIR, f))) {
      throw new Error(`expected ${DIR}/${f} to exist`);
    }
  }

  // core/ is pinned by name rather than globbed, so a file added there would
  // otherwise drop out of the load list silently. Fail loudly instead.
  for (const f of fs.readdirSync(path.join(EXT, DIR, "core")).filter(isJs)) {
    if (!PINNED_LAST.includes(`core/${f}`)) {
      throw new Error(`${DIR}/core/${f} is not in PINNED_LAST — add it (order matters, see the ordering rule)`);
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

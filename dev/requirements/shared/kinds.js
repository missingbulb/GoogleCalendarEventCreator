// The registry of requirement KINDS — the single extension point of the executable
// requirements framework. A "kind" is one way a requirement leaf can be asserted
// (a popup snapshot, the toolbar icon, a click behavior, a per-host extractor, a
// logic predicate, …). Kinds are AUTO-DISCOVERED: every dev/requirements/<kind>/
// directory that contains a `kind.js` descriptor is a kind, named for its folder.
//
// The folder IS the classifier — a case's kind is the directory it lives in, never
// a field inside the case (one source of truth, no parallel classifier to drift).
//
// Adding a kind is therefore self-contained and obvious:
//   1. mkdir dev/requirements/<kind>/cases   (and <kind>/expected if it stores artifacts)
//   2. add dev/requirements/<kind>/kind.js     (this descriptor — `image` = has a PNG expected)
//   3. add dev/requirements/<kind>/*.test.js   (the runner that produces actual + compares to expected)
//   4. add the requirement leaf(s) to requirements.md and a case under <kind>/cases/
// Nothing here, in the loader, or in the coverage gate needs editing — they all
// iterate this registry. See README.md for the full methodology.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REQUIREMENTS_DIR = path.join(__dirname, "..");

// Every <kind>/ folder carrying a kind.js descriptor, in stable name order.
function loadKinds() {
  return fs
    .readdirSync(REQUIREMENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(REQUIREMENTS_DIR, d.name, "kind.js")))
    .map((d) => {
      const descriptor = require(path.join(REQUIREMENTS_DIR, d.name, "kind.js"));
      return {
        name: descriptor.name || d.name,
        // image = the kind's owner-approved EXPECTED is a committed PNG snapshot
        // (popup, icon); a non-image kind's expected is a JSON artifact or coded
        // assertion and it must carry no .png (enforced by the coverage gate).
        image: Boolean(descriptor.image),
        dir: path.join(REQUIREMENTS_DIR, d.name),
        casesDir: path.join(REQUIREMENTS_DIR, d.name, "cases"),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const KINDS = loadKinds();
const KIND_NAMES = KINDS.map((k) => k.name);
const IMAGE_KINDS = KINDS.filter((k) => k.image).map((k) => k.name);
const kindByName = (name) => KINDS.find((k) => k.name === name) || null;

module.exports = { loadKinds, KINDS, KIND_NAMES, IMAGE_KINDS, kindByName };

// The UI snapshot cases, decoupled from the (heavy) rendering stack so callers
// that only need the case list — the coverage ubertest, the inline-gallery
// generator — don't pull in satori/resvg/jsdom. popup-renderer.js re-exports
// these for the renderer's own callers.
//
// Each case is a per-leaf module `<slug>.<leaf-id>.case.js`, where <slug> is the
// requirement section's component/feature name (e.g. `event-cards-grouping`) and
// <leaf-id> is the dotted requirement number it pins (e.g. `4.2.1`). The FILENAME
// names the single requirements.md leaf it pins (the coverage gate reads the
// trailing leaf id via `leafIdOf`), and the case supplies only fake data (+ an
// optional DOM action) fed to the popup's real render(). Keying on the section's
// name rather than a bare `req-<id>` means renumbering a top-level section doesn't
// force a mass rename.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CASES_DIR = path.join(__dirname, "..", "ui", "cases");

// The leaf requirement id (`4.2.1`) a case name (`event-cards-grouping.4.2.1`) or
// PNG stem pins: the trailing dotted-number run. Returns null if the name carries
// no dotted id (a malformed/misnamed case — the coverage gate flags it).
function leafIdOf(name) {
  const m = /(\d+(?:\.\d+)+)$/.exec(name);
  return m ? m[1] : null;
}

// The UI cases, in stable (filename) order: [{ name, description, data, ... }].
// Each dev/requirements/ui/cases/<name>.case.js is a plain module; <name> is the stem shared
// with its reference PNG (dev/requirements/ui/cases/<name>.png). Named *.case.js so the test
// runner's *.test.js glob never picks them up as tests.
function loadCases() {
  return fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".case.js"))
    .sort()
    .map((f) => ({ name: f.replace(/\.case\.js$/, ""), ...require(path.join(CASES_DIR, f)) }));
}

module.exports = { loadCases, leafIdOf, CASES_DIR };

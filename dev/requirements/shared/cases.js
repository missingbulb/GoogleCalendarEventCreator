// The requirement CASES, loaded across every kind, decoupled from the (heavy)
// rendering stack so callers that only need the case list — the coverage ubertest,
// the inline-gallery generator — don't pull in satori/resvg/jsdom.
//
// Each case is a per-leaf module `<slug>.<leaf-id>.case.js` under `<kind>/cases/`,
// where <slug> is the requirement section's component/feature name (e.g.
// `event-cards-grouping`) and <leaf-id> is the dotted requirement number it pins
// (e.g. `4.2.1`). The FILENAME names the single requirements.md leaf it pins (the
// coverage gate reads the trailing leaf id via `leafIdOf`); the case's KIND is the
// folder it lives in (see kinds.js — the folder is the single classifier, so a case
// module carries NO `kind` field). A case supplies only fake data (+ an optional DOM
// action / verify()) fed to its kind's runner.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { KINDS } = require("./kinds");

// The leaf requirement id (`4.2.1`) a case name (`event-cards-grouping.4.2.1`) or
// PNG stem pins: the trailing dotted-number run. Returns null if the name carries
// no dotted id (a malformed/misnamed case — the coverage gate flags it).
function leafIdOf(name) {
  const m = /(\d+(?:\.\d+)+)$/.exec(name);
  return m ? m[1] : null;
}

// All cases across all kinds, in stable (name) order. Each entry is
// { ...caseModule, name, kind, dir, image } — kind/dir/image come from the case's
// folder (kinds.js) and are authoritative over anything the module might set, so
// the folder is the one source of truth for a case's kind. `dir` is the kind's
// cases/ directory, where this case's PNG (image kinds) lives.
function loadCases() {
  const cases = [];
  for (const kind of KINDS) {
    if (!fs.existsSync(kind.casesDir)) continue;
    for (const f of fs.readdirSync(kind.casesDir).filter((n) => n.endsWith(".case.js")).sort()) {
      const name = f.replace(/\.case\.js$/, "");
      const mod = require(path.join(kind.casesDir, f));
      cases.push({ ...mod, name, kind: kind.name, dir: kind.casesDir, image: kind.image });
    }
  }
  return cases.sort((a, b) => a.name.localeCompare(b.name));
}

// Absolute path to a case's committed reference PNG (image kinds only).
function snapshotPath(testCase) {
  return path.join(testCase.dir, `${testCase.name}.png`);
}

module.exports = { loadCases, leafIdOf, snapshotPath };

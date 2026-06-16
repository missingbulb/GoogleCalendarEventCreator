// The UI snapshot cases, decoupled from the (heavy) rendering stack so callers
// that only need the case list — the README generator, its drift gate — don't
// pull in satori/resvg/jsdom. popup-renderer.js re-exports these for the
// renderer's own callers.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CASES_DIR = path.join(__dirname, "cases");

// The UI cases, in stable (filename) order: [{ name, description, data, ... }].
// Each test/ui/cases/<name>.case.js is a plain module; <name> is the stem shared
// with its reference PNG (test/ui/cases/<name>.png). Named *.case.js so the test
// runner's *.test.js glob never picks them up as tests.
function loadCases() {
  return fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".case.js"))
    .sort()
    .map((f) => ({ name: f.replace(/\.case\.js$/, ""), ...require(path.join(CASES_DIR, f)) }));
}

module.exports = { loadCases, CASES_DIR };

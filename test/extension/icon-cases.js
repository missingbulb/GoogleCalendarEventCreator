// The toolbar-icon snapshot cases, mirroring test/ui/cases.js. Each case is a
// per-scenario module `icon-cases/<name>.case.js`: its FILENAME names the scenario
// (and its stored PNG, docs/extension-icon-<name>.png), and it supplies only fake
// data — a tab URL and faked host lists — with NO assertions. The runner
// (extension-icon-snapshots.test.js) and the refresh script both load them here.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ICON_CASES_DIR = path.join(__dirname, "icon-cases");

// The icon cases in stable (filename) order: [{ name, description, lists, tabUrl }].
// Named *.case.js so the test runner's *.test.js glob never picks them up as tests.
function loadIconCases() {
  return fs
    .readdirSync(ICON_CASES_DIR)
    .filter((f) => f.endsWith(".case.js"))
    .sort()
    .map((f) => ({ name: f.replace(/\.case\.js$/, ""), ...require(path.join(ICON_CASES_DIR, f)) }));
}

module.exports = { loadIconCases, ICON_CASES_DIR };

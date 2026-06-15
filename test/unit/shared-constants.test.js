// Guards string literals duplicated across files that can't share an import
// (e.g. a label that spans a YAML workflow guard, a YAML template, and a JS
// module). Each REGISTRY entry specifies the canonical value and the exact
// occurrence count per file. A count mismatch means either the value was
// renamed in one place but not all, or an old value was left behind.
//
// To add a new constant: push an entry to REGISTRY with the value and a
// `counts` map of { relativeFilePath: expectedCount }. To change a constant:
// update `value` and re-run to see which counts need adjusting.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const countOccurrences = (text, value) => {
  let n = 0;
  let pos = 0;
  while ((pos = text.indexOf(value, pos)) !== -1) { n++; pos += value.length; }
  return n;
};

// Each entry: { what, value, counts: { "repo-root-relative path": expectedCount } }
const REGISTRY = [
  {
    what: "extractor-request trigger label",
    value: "extractor-request",
    counts: {
      // functional: `labels:` field
      ".github/ISSUE_TEMPLATE/extractor-request.yml": 1,
      // functional: comment + job guard (`== 'extractor-request'`)
      ".github/workflows/auto-implement-extractor.yml": 2,
      // functional: SOURCE_REQUEST_LABEL constant + 2 comment references
      "ui/views/source-request-view.js": 5,
      // functional: test name + 2 assertions + path reference
      "test/unit/source-request.test.js": 4,
    },
  },
  {
    what: "extractor-request.yml template filename",
    value: "extractor-request.yml",
    counts: {
      // functional: SOURCE_REQUEST_TEMPLATE constant + comment reference
      "ui/views/source-request-view.js": 2,
      // functional: template assertion + ISSUE_TEMPLATE path reference
      "test/unit/source-request.test.js": 2,
    },
  },
  {
    what: "repo slug missingbulb/GoogleCalendarEventCreator",
    value: "missingbulb/GoogleCalendarEventCreator",
    counts: {
      // functional: SOURCE_REQUEST_REPO constant
      "ui/views/source-request-view.js": 1,
      // functional: URL assertion
      "test/unit/source-request.test.js": 1,
    },
  },
];

for (const { what, value, counts } of REGISTRY) {
  test(`shared constant "${value}" (${what})`, () => {
    for (const [rel, expected] of Object.entries(counts)) {
      const text = read(rel);
      const actual = countOccurrences(text, value);
      assert.equal(
        actual,
        expected,
        `${rel}: expected ${expected} occurrence(s) of "${value}" but found ${actual} — ` +
          `update the file or adjust REGISTRY (${what})`
      );
    }
  });
}

// Version sync: manifest.json and package.json must declare the same version.
test("manifest.json and package.json versions match", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const pkg = JSON.parse(read("package.json"));
  assert.equal(
    manifest.version,
    pkg.version,
    `manifest.json version (${manifest.version}) != package.json version (${pkg.version}) — run "bump version" to sync them`
  );
});

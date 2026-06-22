// Uber test: guards string literals duplicated across files that can't share
// an import (JS <-> YAML <-> workflow guard). Each entry in shared_constants/
// is a JSON file describing one constant and the exact occurrence count per
// file. A count mismatch means the value was renamed in some places but not
// all, or an old value was left behind after a rename.
//
// To add a constant: drop a new JSON file in dev/procedures/test/uber/shared_constants/.
// Entry shape:
//   { "what": "...", "value": "...", "counts": { "repo/relative/path": N, ... } }
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..", "..", "..");
const REGISTRY_DIR = path.join(__dirname, "shared_constants");

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const countOccurrences = (text, value) => {
  let n = 0, pos = 0;
  while ((pos = text.indexOf(value, pos)) !== -1) { n++; pos += value.length; }
  return n;
};

const entries = fs
  .readdirSync(REGISTRY_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(REGISTRY_DIR, f), "utf8")));

for (const { what, value, counts } of entries) {
  test(`shared constant "${value}" — ${what}`, () => {
    for (const [rel, expected] of Object.entries(counts)) {
      const actual = countOccurrences(read(rel), value);
      assert.equal(
        actual,
        expected,
        `${rel}: expected ${expected} occurrence(s) of "${value}" but found ${actual}\n` +
          `  (${what}) — update the file or adjust its shared_constants entry`
      );
    }
  });
}

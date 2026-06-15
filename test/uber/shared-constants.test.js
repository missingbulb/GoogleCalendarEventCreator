// Uber test: guards string literals duplicated across files that can't share
// an import (JS <-> YAML <-> workflow guard). Each entry in shared_constants/
// is a JSON file describing one constant and the exact occurrence count per
// file. A count mismatch means the value was renamed in some places but not
// all, or an old value was left behind after a rename.
//
// To add a constant: drop a new JSON file in test/uber/shared_constants/.
// Supported shapes:
//
//   Count check (default):
//   { "what": "...", "value": "...", "counts": { "repo/relative/path": N, ... } }
//
//   JSON field sync:
//   { "what": "...", "type": "json-field-sync", "field": "...", "files": [...] }
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
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

for (const entry of entries) {
  if (!entry.type || entry.type === "count") {
    test(`shared constant "${entry.value}" — ${entry.what}`, () => {
      for (const [rel, expected] of Object.entries(entry.counts)) {
        const actual = countOccurrences(read(rel), entry.value);
        assert.equal(
          actual,
          expected,
          `${rel}: expected ${expected} occurrence(s) of "${entry.value}" but found ${actual}\n` +
            `  (${entry.what}) — update the file or adjust its shared_constants entry`
        );
      }
    });
  } else if (entry.type === "json-field-sync") {
    test(`json-field-sync "${entry.field}" — ${entry.what}`, () => {
      const values = entry.files.map((f) => ({
        file: f,
        value: JSON.parse(read(f))[entry.field],
      }));
      const [first, ...rest] = values;
      for (const other of rest) {
        assert.equal(
          other.value,
          first.value,
          `"${entry.field}" mismatch: ${first.file}=${first.value}, ${other.file}=${other.value}\n` +
            `  (${entry.what})`
        );
      }
    });
  } else {
    test(`unknown entry type "${entry.type}" — ${entry.what}`, () => {
      assert.fail(`shared_constants entry has unknown type "${entry.type}"`);
    });
  }
}

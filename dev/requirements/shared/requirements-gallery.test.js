// Keeps the two-column gallery (the generated left-cell image/note lines, tagged
// `<!-- req-gallery:<id> -->`, in dev/requirements/requirements.md) in sync with the cases,
// the same REFRESH-then-GATE way as the snapshots: a refresh test rewrites the
// managed lines into the working tree (skipped in CI), and a gate test asserts
// the committed file already matches (the read-only truth in CI). So flipping a
// leaf's kind, or renaming a PNG, updates the left cells on the next local
// `npm test`/`npm run refresh:ui`, and a stale doc fails CI.
//
// A second gate checks STRUCTURE the generator can't fix on its own (it only
// rewrites existing marker lines, never inserts): every leaf — and only a leaf —
// carries exactly one marker, so a leaf whose two-column row was dropped, or a
// marker for a non-leaf, fails here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { buildGallery, markerLines, DOC_PATH } = require("./build-requirements-gallery");
const { leafRequirementIds } = require("./ui-requirements");

const isCI = Boolean(process.env.CI);

test("two-column gallery is refreshed (skipped in CI)", (t) => {
  if (isCI) {
    t.skip("CI: read-only gate — the committed dev/requirements/requirements.md is the reviewed truth");
    return;
  }
  fs.writeFileSync(DOC_PATH, buildGallery());
});

test("dev/requirements/requirements.md gallery matches the generator (run npm run refresh:ui)", () => {
  const committed = fs.existsSync(DOC_PATH) ? fs.readFileSync(DOC_PATH, "utf8") : "";
  assert.equal(
    committed,
    buildGallery(),
    "dev/requirements/requirements.md's generated left-cell lines are stale. " +
      "Run `npm run refresh:ui` (or `npm test` locally) and commit the result."
  );
});

test("every leaf — and only a leaf — has exactly one gallery marker", () => {
  const leaves = leafRequirementIds();
  const leafSet = new Set(leaves);
  const marks = markerLines(fs.readFileSync(DOC_PATH, "utf8").split("\n"));

  const counts = marks.reduce((acc, { id }) => ((acc[id] = (acc[id] || 0) + 1), acc), {});
  const missing = leaves.filter((id) => !counts[id]);
  const dupes = Object.keys(counts).filter((id) => counts[id] > 1);
  const stray = Object.keys(counts).filter((id) => !leafSet.has(id));

  assert.deepEqual(missing, [], "leaves with no `<!-- req-gallery:id -->` row in dev/requirements/requirements.md:");
  assert.deepEqual(dupes, [], "leaves with more than one gallery row:");
  assert.deepEqual(stray, [], "gallery markers for IDs that aren't leaf requirements:");
});

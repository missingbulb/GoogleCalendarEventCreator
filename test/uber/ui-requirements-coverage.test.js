// Ubertest: the traceability spine between docs/uiRequirements.md and the cases
// that verify it. The spec enumerates the requirement NUMBERS; the CASES declare,
// each for itself, how its leaf is verified (its `kind` / `tbd`). This gate is the
// strict bijection between them, plus the routing rules each kind implies:
//
//   - EVERY leaf has exactly one `req-<id>.case.js` (the FILENAME is the link), and
//     every case names a real leaf. No leaf is unclaimed; no case is a stray.
//   - A case's `kind` (default "popup") decides verification:
//       * "popup" / "icon" — an image leaf, pinned by a `req-<id>.png` snapshot
//         (rendered by render-snapshot.js, compared by popup-snapshots.test.js).
//       * "behavior"       — a click/navigation a static image can't observe, so it
//         carries NO image and is verified by test/unit/events-view-actions.test.js
//         (which self-asserts it covers exactly the kind:"behavior" cases). A PNG
//         "covering" a behavior is the #429 anti-pattern, so we forbid one here.
//   - A `tbd: true` case is an undecided edge case: it still renders (a provisional
//     snapshot under a "TO BE DECIDED" banner), so it needs no special handling here
//     beyond the bijection.
//
// A new leaf with no case fails here; a stray/misnamed case fails; a behavior case
// that smuggled in a PNG fails.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCases, CASES_DIR } = require("../ui/cases");
const { allRequirementIds, leafRequirementIds } = require("../ui/ui-requirements");

const allIds = new Set(allRequirementIds());
const leaves = leafRequirementIds();
const cases = loadCases();

const PER_LEAF = /^req-(\d+(?:\.\d+)+)$/;
const idOf = (c) => c.name.replace(/^req-/, "");
const kindOf = (c) => c.kind || "popup";
const KNOWN_KINDS = new Set(["popup", "icon", "behavior"]);

test("docs/uiRequirements.md yields leaf requirements", () => {
  assert.ok(allIds.size > 0, "no `N.M` requirement IDs parsed from docs/uiRequirements.md");
  assert.ok(leaves.length > 0, "no leaf requirements computed");
});

test("every UI case is a `req-<id>` case naming a real leaf", () => {
  const bad = [];
  for (const c of cases) {
    const m = PER_LEAF.exec(c.name);
    if (!m) bad.push(`${c.name} (not named req-<id>.case.js)`);
    else if (!allIds.has(m[1])) bad.push(`${c.name} (req-${m[1]} is not a requirement in the spec)`);
  }
  assert.deepEqual(bad, [], "stray/misnamed UI cases:");
});

test("every leaf has exactly one case (strict bijection)", () => {
  const counts = cases.reduce((acc, c) => ((acc[idOf(c)] = (acc[idOf(c)] || 0) + 1), acc), {});
  const missing = leaves.filter((id) => !counts[id]);
  const dupes = Object.keys(counts).filter((id) => counts[id] > 1);
  assert.deepEqual(missing, [], "leaves with no req-<id>.case.js:");
  assert.deepEqual(dupes, [], "leaves with more than one case:");
});

test("every case declares a known kind", () => {
  const bad = cases.filter((c) => !KNOWN_KINDS.has(kindOf(c))).map((c) => `${c.name} (kind="${kindOf(c)}")`);
  assert.deepEqual(bad, [], `cases with an unknown kind (known: ${[...KNOWN_KINDS].join(", ")}):`);
});

test("a behavior case carries no snapshot image (a PNG can't verify a click — #429)", () => {
  const bad = cases
    .filter((c) => kindOf(c) === "behavior" && fs.existsSync(path.join(CASES_DIR, `${c.name}.png`)))
    .map((c) => `${c.name}.png`);
  assert.deepEqual(bad, [], "behavior leaves must not carry a snapshot image:");
});

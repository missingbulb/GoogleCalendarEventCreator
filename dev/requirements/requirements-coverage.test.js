// Ubertest: the traceability spine between dev/requirements/requirements.md and the cases
// that verify it. The spec enumerates the requirement NUMBERS; the CASES declare,
// each for itself, how its leaf is verified (its `kind` / `tbd`). This gate is the
// strict bijection between them, plus the routing rules each kind implies:
//
//   - EVERY leaf has exactly one `<slug>.<id>.case.js` (the FILENAME is the link), and
//     every case names a real leaf. No leaf is unclaimed; no case is a stray.
//   - A case's `kind` (default "popup") decides verification:
//       * "popup" / "icon" — an image leaf, pinned by a `<slug>.<id>.png` snapshot
//         (rendered by render-snapshot.js, compared by popup-snapshots.test.js).
//       * "behavior"       — a click/navigation a static image can't observe, so it
//         carries NO image and is verified by dev/requirements/behavior/events-view-actions.test.js
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
const { loadCases, leafIdOf, snapshotPath } = require("./shared/cases");
const { allRequirementIds, leafRequirementIds } = require("./shared/ui-requirements");
const { KIND_NAMES, IMAGE_KINDS } = require("./shared/kinds");

const allIds = new Set(allRequirementIds());
const leaves = leafRequirementIds();
const cases = loadCases();

// A case file is `<slug>.<leaf-id>.case.js`: a kebab-case component/feature slug,
// then the dotted requirement number it pins. The leaf id is the trailing run.
const PER_LEAF = /^[a-z][a-z0-9-]*\.(\d+(?:\.\d+)+)$/;
const idOf = (c) => leafIdOf(c.name);
const kindOf = (c) => c.kind;
// Kinds are auto-discovered from the <kind>/kind.js descriptors (shared/kinds.js),
// so this gate hardcodes no list — adding a kind folder extends it for free.
const KNOWN_KINDS = new Set(KIND_NAMES);
// The kinds with no rendered image — verified by a dedicated runner, not a snapshot.
const NON_IMAGE_KINDS = new Set(KIND_NAMES.filter((k) => !IMAGE_KINDS.includes(k)));

test("dev/requirements/requirements.md yields leaf requirements", () => {
  assert.ok(allIds.size > 0, "no `N.M` requirement IDs parsed from dev/requirements/requirements.md");
  assert.ok(leaves.length > 0, "no leaf requirements computed");
});

test("every UI case is a `<slug>.<id>` case naming a real leaf", () => {
  const bad = [];
  for (const c of cases) {
    const m = PER_LEAF.exec(c.name);
    if (!m) bad.push(`${c.name} (not named <slug>.<id>.case.js)`);
    else if (!allIds.has(m[1])) bad.push(`${c.name} (${m[1]} is not a requirement in the spec)`);
  }
  assert.deepEqual(bad, [], "stray/misnamed UI cases:");
});

test("every leaf has exactly one case (strict bijection)", () => {
  const counts = cases.reduce((acc, c) => ((acc[idOf(c)] = (acc[idOf(c)] || 0) + 1), acc), {});
  const missing = leaves.filter((id) => !counts[id]);
  const dupes = Object.keys(counts).filter((id) => counts[id] > 1);
  assert.deepEqual(missing, [], "leaves with no <slug>.<id>.case.js:");
  assert.deepEqual(dupes, [], "leaves with more than one case:");
});

test("every case declares a known kind", () => {
  const bad = cases.filter((c) => !KNOWN_KINDS.has(kindOf(c))).map((c) => `${c.name} (kind="${kindOf(c)}")`);
  assert.deepEqual(bad, [], `cases with an unknown kind (known: ${[...KNOWN_KINDS].join(", ")}):`);
});

test("a non-image case carries no snapshot image (a PNG can't verify a click or an extraction — #429)", () => {
  const bad = cases
    .filter((c) => NON_IMAGE_KINDS.has(kindOf(c)) && fs.existsSync(snapshotPath(c)))
    .map((c) => `${c.name}.png`);
  assert.deepEqual(bad, [], "behavior/extractor/logic leaves must not carry a snapshot image:");
});

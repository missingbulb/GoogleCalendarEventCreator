// Ubertest: the traceability spine between docs/uiRequirements.md and the tests
// that verify it. Every LEAF requirement must be covered, but — crucially —
// covered by the RIGHT KIND of test (the segmented gate, issue #429):
//
//   - a RENDER leaf is covered by a UI snapshot case (test/ui/cases/*.case.js):
//       either a per-leaf case named `req-<id>.case.js` (the migration target —
//       the filename IS the link), or a bundled case that lists the id in its
//       `requirements: { id: note }` map (the legacy multi-requirement cases,
//       still being split out — see the INCOMPLETE-TESTING banner in the spec).
//   - a BEHAVIOR leaf (`_(behavior)_` in the spec — a click/navigation a static
//       image can't observe) is covered by the behavior test, declared in
//       test/ui/behavior-coverage.js. A snapshot case may NOT claim one: a PNG
//       can't verify an action, so parking it there is the #429 bug we're fixing.
//
// A new requirement with no covering test of its kind fails here until one is
// added; a typo'd/stale reference fails too.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadCases, caseRequirementIds } = require("../ui/cases");
const { BEHAVIOR_COVERAGE } = require("../ui/behavior-coverage");
const { allRequirementIds, leafRequirementKinds } = require("../ui/ui-requirements");

const cases = loadCases();
const allIds = new Set(allRequirementIds());
const kinds = leafRequirementKinds();
const leaves = Object.keys(kinds);
const renderLeaves = leaves.filter((id) => kinds[id] === "render");
const behaviorLeaves = leaves.filter((id) => kinds[id] === "behavior");

// A per-leaf case `req-<id>.case.js` declares the single leaf it pins via its
// filename; any other case declares its leaves in a `requirements` map.
const PER_LEAF = /^req-(\d+(?:\.\d+)+)$/;
function perLeafId(c) {
  const m = PER_LEAF.exec(c.name);
  return m ? m[1] : null;
}
function caseRenderIds(c) {
  const id = perLeafId(c);
  return id ? [id] : caseRequirementIds(c);
}

test("docs/uiRequirements.md yields requirements of both kinds", () => {
  assert.ok(allIds.size > 0, "no `N.M` requirement IDs parsed from docs/uiRequirements.md");
  assert.ok(renderLeaves.length > 0, "no render leaves computed");
  assert.ok(behaviorLeaves.length > 0, "no behavior leaves computed (the `_(behavior)_` tag?)");
});

test("every bundled (non per-leaf) case declares a non-empty `requirements` map", () => {
  const offenders = cases.filter(
    (c) =>
      !perLeafId(c) &&
      (!c.requirements || typeof c.requirements !== "object" || Object.keys(c.requirements).length === 0)
  );
  assert.deepEqual(
    offenders.map((c) => c.name),
    [],
    "these cases are missing a `requirements: { id: note }` field (or rename to req-<id>.case.js)"
  );
});

test("every claimed requirement carries a brief note saying what the case checks", () => {
  const bad = [];
  for (const c of cases) {
    for (const [id, note] of Object.entries(c.requirements || {})) {
      if (typeof note !== "string" || note.trim() === "") bad.push(`${c.name} → ${id}`);
    }
  }
  assert.deepEqual(bad, [], "these requirement IDs have no note explaining what the case checks for them:");
});

test("every requirement a case references exists in docs/uiRequirements.md", () => {
  const bad = [];
  for (const c of cases) {
    for (const id of caseRenderIds(c)) {
      if (!allIds.has(id)) bad.push(`${c.name} → ${id}`);
    }
  }
  assert.deepEqual(bad, [], "cases reference requirement IDs not found in docs/uiRequirements.md (typo or stale):");
});

test("no snapshot case claims a BEHAVIOR leaf (those are routed to the behavior test)", () => {
  const behavior = new Set(behaviorLeaves);
  const bad = [];
  for (const c of cases) {
    for (const id of caseRenderIds(c)) {
      if (behavior.has(id)) bad.push(`${c.name} → ${id}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "a PNG can't verify a click — move these to test/unit/events-view-actions.test.js + behavior-coverage.js:"
  );
});

test("every RENDER leaf is covered by at least one snapshot case", () => {
  const covered = new Set(cases.flatMap(caseRenderIds));
  const uncovered = renderLeaves.filter((id) => !covered.has(id));
  assert.deepEqual(
    uncovered,
    [],
    "these render requirements have no UI case — add a req-<id>.case.js or list them in a case's `requirements`:"
  );
});

test("every BEHAVIOR leaf is covered by the behavior test (behavior-coverage.js)", () => {
  const covered = new Set(Object.keys(BEHAVIOR_COVERAGE));
  const uncovered = behaviorLeaves.filter((id) => !covered.has(id));
  assert.deepEqual(uncovered, [], "these behavior requirements aren't routed to the behavior test:");
});

test("behavior-coverage.js lists only real behavior leaves (no stale/typo'd IDs)", () => {
  const behavior = new Set(behaviorLeaves);
  const bad = Object.keys(BEHAVIOR_COVERAGE).filter((id) => !behavior.has(id));
  assert.deepEqual(bad, [], "behavior-coverage.js claims IDs that aren't `_(behavior)_` leaves in the spec:");
});

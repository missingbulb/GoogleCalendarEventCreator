// Ubertest: the traceability spine between docs/uiRequirements.md and the tests
// that verify it. Every LEAF requirement is covered by exactly the RIGHT KIND of
// test (the segmented gate, issue #429), in a strict one-case-per-leaf bijection:
//
//   - a SNAPSHOT leaf has exactly one per-leaf case named `req-<id>.case.js` →
//       `req-<id>.png`; the FILENAME is the link, and its image is embedded inline
//       under the requirement in docs/uiRequirements.md. Two kinds are snapshots —
//       a RENDER leaf (rendered by the popup's real render()) and an `_(icon)_`
//       leaf (the toolbar icon, rendered by the real ui/toolbar-icon.js in a fake
//       browser). They differ only in the renderer behind the PNG
//       (render-snapshot.js dispatches); for coverage they are identical — each
//       needs exactly one req-<id> case.
//   - a BEHAVIOR leaf (`_(behavior)_` in the spec — a click/navigation a static
//       image can't observe) is covered by the behavior test, declared in
//       test/ui/behavior-coverage.js. A snapshot case may NOT exist for one: a
//       PNG can't verify an action, so a `req-<behavior-id>` case is the #429 bug.
//   - a TBD leaf (`_(TBD)_` in the spec — an edge case whose behavior isn't
//       decided yet) is a placeholder, exempt from the bijection: it MAY carry a
//       provisional `req-<id>` case (a snapshot of current behavior) but isn't
//       required to.
//
// A new requirement with no covering test of its kind fails here; a stray case
// (a typo'd id, or one with no requirement) fails too.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadCases } = require("../ui/cases");
const { BEHAVIOR_COVERAGE } = require("../ui/behavior-coverage");
const { allRequirementIds, leafRequirementKinds } = require("../ui/ui-requirements");

const allIds = new Set(allRequirementIds());
const kinds = leafRequirementKinds();
const renderLeaves = Object.keys(kinds).filter((id) => kinds[id] === "render");
const behaviorLeaves = Object.keys(kinds).filter((id) => kinds[id] === "behavior");
const iconLeaves = Object.keys(kinds).filter((id) => kinds[id] === "icon");
// Render and icon leaves are both pinned by a req-<id> snapshot (only the renderer differs).
const snapshotLeaves = [...renderLeaves, ...iconLeaves];

// Each render case is `req-<id>.case.js`; the id is parsed from the filename.
const PER_LEAF = /^req-(\d+(?:\.\d+)+)$/;
const caseIds = loadCases().map((c) => c.name);

test("docs/uiRequirements.md yields requirements of each kind", () => {
  assert.ok(allIds.size > 0, "no `N.M` requirement IDs parsed from docs/uiRequirements.md");
  assert.ok(renderLeaves.length > 0, "no render leaves computed");
  assert.ok(behaviorLeaves.length > 0, "no behavior leaves computed (the `_(behavior)_` tag?)");
  assert.ok(iconLeaves.length > 0, "no icon leaves computed (the `_(icon)_` tag?)");
});

test("every UI case is a `req-<id>` per-leaf case naming a real leaf", () => {
  const bad = [];
  for (const name of caseIds) {
    const m = PER_LEAF.exec(name);
    if (!m) bad.push(`${name} (not named req-<id>.case.js)`);
    else if (!allIds.has(m[1])) bad.push(`${name} (req-${m[1]} is not a requirement in the spec)`);
  }
  assert.deepEqual(bad, [], "stray/misnamed UI cases:");
});

test("no `req-<id>` case exists for a BEHAVIOR leaf (those go to the behavior test)", () => {
  const behavior = new Set(behaviorLeaves);
  const bad = caseIds.map((n) => PER_LEAF.exec(n)).filter((m) => m && behavior.has(m[1])).map((m) => `req-${m[1]}`);
  assert.deepEqual(bad, [], "a PNG can't verify a click — these belong in events-view-actions.test.js:");
});

test("every SNAPSHOT leaf (render or icon) has exactly one per-leaf case; TBD leaves at most one", () => {
  const tbd = new Set(Object.keys(kinds).filter((id) => kinds[id] === "tbd"));
  const have = caseIds.map((n) => PER_LEAF.exec(n)).filter(Boolean).map((m) => m[1]);
  const counts = have.reduce((acc, id) => ((acc[id] = (acc[id] || 0) + 1), acc), {});
  const missing = snapshotLeaves.filter((id) => !counts[id]);
  const dupes = Object.keys(counts).filter((id) => counts[id] > 1);
  assert.deepEqual(missing, [], "render/icon leaves with no req-<id>.case.js:");
  assert.deepEqual(dupes, [], "leaves with more than one case (strictly one per render/icon leaf, ≤1 per TBD):");
  // (TBD leaves are exempt from the missing-case check; a provisional case is optional.)
  void tbd;
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

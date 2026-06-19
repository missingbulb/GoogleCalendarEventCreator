// Ubertest: every numbered popup UI requirement in docs/uiRequirements.md is
// claimed by at least one UI snapshot case (test/ui/cases/*.case.js), and no case
// claims a requirement that doesn't exist. This is the traceability spine between
// the spec and the snapshots: a new requirement with no case fails here until a
// case covers it, and a typo'd/stale reference in a case fails here too.
//
// Coverage is checked over LEAF requirements (the finest-grained items — 5.6.1,
// not its parent 5.6); a case declares the requirements it exercises in its
// `requirements: [...]` field. Cases legitimately cover several requirements each
// (and a requirement may be covered by more than one case) — see the README's
// generated coverage map.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadCases } = require("../ui/cases");
const { allRequirementIds, leafRequirementIds } = require("../ui/ui-requirements");

const cases = loadCases();
const allIds = new Set(allRequirementIds());
const leaves = leafRequirementIds();

test("docs/uiRequirements.md yields a non-empty set of requirements", () => {
  assert.ok(allIds.size > 0, "no `N.M` requirement IDs parsed from docs/uiRequirements.md");
  assert.ok(leaves.length > 0, "no leaf requirements computed");
});

test("every UI case declares a non-empty `requirements` array", () => {
  const offenders = cases.filter((c) => !Array.isArray(c.requirements) || c.requirements.length === 0);
  assert.deepEqual(
    offenders.map((c) => c.name),
    [],
    "these cases are missing a `requirements: [...]` field listing the uiRequirements they check"
  );
});

test("every requirement a case claims exists in docs/uiRequirements.md", () => {
  const bad = [];
  for (const c of cases) {
    for (const id of c.requirements || []) {
      if (!allIds.has(id)) bad.push(`${c.name} → ${id}`);
    }
  }
  assert.deepEqual(bad, [], "cases reference requirement IDs not found in docs/uiRequirements.md (typo or stale):");
});

test("every leaf requirement in docs/uiRequirements.md is covered by at least one case", () => {
  const covered = new Set(cases.flatMap((c) => c.requirements || []));
  const uncovered = leaves.filter((id) => !covered.has(id));
  assert.deepEqual(
    uncovered,
    [],
    "these uiRequirements have no UI case covering them — add them to a case's `requirements`, or add a case:"
  );
});

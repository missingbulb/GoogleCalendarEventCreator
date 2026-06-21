// Validation for the product/behavior requirements (Requirements.md §12–§16):
// the non-visual, logic leaves converted from the old productRequirements.md —
// the five popup states, the events model, field rules, timezone rules, and the
// support-request flow. Each is a `kind: "logic"` case:
//
//   - a WIRED case carries an executable `verify()` that asserts the rule against
//     the real shipped code (importing the production predicate/config, or running
//     the extractor harness on an inline fragment) — this test runs it.
//   - a TBD case (`tbd: true`) is tracked but not yet wired here; it names where
//     the behavior is currently covered (`coveredBy`) and is reported skipped, so
//     the requirement is visible and unverified-here rather than silently absent.
//     (Wiring these is an owned follow-up, like the #435 behavior-stub gap.)
//
// The strict requirement↔case bijection (every §12–§16 leaf has exactly one case)
// is enforced by ui-requirements-coverage.test.js; this file executes the wired
// ones and surfaces the tbd ones.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadCases, leafIdOf } = require("./infrastructure/cases");

const logicCases = loadCases().filter((c) => c.kind === "logic");

test("there is at least one product-requirements (logic) case", () => {
  assert.ok(logicCases.length > 0, "no kind:\"logic\" cases found");
});

for (const testCase of logicCases) {
  const id = leafIdOf(testCase.name);
  if (testCase.tbd) {
    test(`${id}: ${testCase.description} [untested here]`, (t) => {
      assert.ok(testCase.coveredBy, `${testCase.name}: a tbd logic case must name its current coverage (coveredBy)`);
      t.skip(`tracked but not wired into the executable runner — covered today by ${testCase.coveredBy}`);
    });
    continue;
  }
  test(`${id}: ${testCase.description}`, async () => {
    assert.equal(typeof testCase.verify, "function", `${testCase.name}: a wired logic case must export verify()`);
    await testCase.verify();
  });
}

// The integration test for the GENERIC fallback extractor
// (pipeline/extract-unsupported.js): a high-watermark gate on how much it
// recovers, per page, relative to each page's dedicated per-site source.
//
// The comparison itself lives in executable-requirements/extractors/fallback/fallback-coverage.js (run GCal.extract()
// twice on every cached case page — once normally, once with the site registry
// emptied — and grade the fallback's primary event field-by-field against the
// custom one). This file turns that into a regression gate plus a refreshed
// human-readable report:
//
//   - One GATE test asserts the current critical-field and all-field coverage
//     have not dropped below the stored watermark in
//     executable-requirements/extractors/fallback/fallback-coverage.baseline.GENERATED.json — compared over the cases the run and the
//     watermark SHARE. A newly added case isn't in the watermark's `cases` list,
//     so it's excluded: adding an extractor never fails the gate (#240). Existing
//     cases are still held to the bar, so a regression bundled with an addition
//     is still caught.
//   - A REFRESH test (skipped in CI) rewrites executable-requirements/extractors/fallback/fallback-coverage.GENERATED.md and the
//     baseline: it ratchets the watermark UP on an unchanged case set, and
//     re-anchors it to the current full-set aggregate when the set changed (a
//     new/removed case). It writes the working tree only; committing is the
//     normal review flow (like the UI snapshots), not something the test does to
//     git. In CI it is a no-op — the committed report/baseline are the truth.
//
// Caveat (accepted, see #240): the watermark is a single aggregate, so a
// regression bundled into the same change as a case-set change can be re-anchored
// over rather than caught. Don't commit a re-anchored baseline while the gate is
// red. Like the live tests, this runs offline against the cached HTML in data/,
// so a cached-page refresh that changes a source's ground truth can move these
// numbers; re-baseline by hand when that happens.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  computeCoverage,
  renderMarkdown,
  renderNotableDifferences,
  gateStatus,
  nextBaseline,
} = require("./fallback-coverage");

const BASELINE_PATH = path.join(__dirname, "fallback-coverage.baseline.GENERATED.json");
const REPORT_PATH = path.join(__dirname, "fallback-coverage.GENERATED.md");
const GATED = ["criticalFieldsPct", "allFieldsPct"];
const isCI = Boolean(process.env.CI);

// Compute once; all tests share it (each run does 2x jsdom extraction per case).
const coverage = computeCoverage();
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
const gate = gateStatus(baseline, coverage);

// Compare on tenths so the stored watermark (one decimal) and the live value
// can't disagree over float noise.
const tenths = (x) => Math.round((x || 0) * 10);

const BASELINE_COMMENT =
  "High-watermark gate for the generic fallback extractor's coverage, asserted by " +
  "fallback-coverage.test.js and explained in executable-requirements/extractors/fallback/fallback-coverage.GENERATED.md. criticalFieldsPct/" +
  "allFieldsPct are the best field-match percentages reached against the dedicated sources, and " +
  "cases is the list they were computed over. The gate compares the current run to these over the " +
  "SHARED cases, so adding a new case never fails it; the watermark ratchets up on an unchanged " +
  "case set and re-anchors to the current aggregate when the set changes. Re-baseline by hand " +
  "(lower a number) only for a deliberate, reviewed drop.";

test("fallback-coverage report and baseline are refreshed (skipped in CI)", (t) => {
  if (isCI) {
    t.skip("CI: read-only gate — the committed report and baseline are the reviewed truth");
    return;
  }
  const next = nextBaseline(baseline, coverage);
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({ _comment: BASELINE_COMMENT, ...next }, null, 2) + "\n");
  fs.writeFileSync(REPORT_PATH, renderMarkdown(coverage, next));
});

// The actual mismatched values, surfaced as test output (local and CI) rather
// than committed to the report — reference material for improving the fallback,
// and a record of what diverged when the gate fails. Informational; no assert.
test("fallback value differences (informational)", () => {
  console.log("\n" + renderNotableDifferences(coverage) + "\n");
});

test("fallback coverage has not regressed below the high-watermark", (t) => {
  // A case the watermark covers but the run no longer has (a removed/renamed
  // case) makes the stored aggregate stale — it can't be compared apples-to-
  // apples over the shared subset. The local refresh has already re-anchored the
  // baseline in the working tree, so skip locally (commit it); in CI a stale
  // committed baseline is an error to fix.
  if (gate.removed.length) {
    const msg =
      `Baseline lists case(s) no longer present: ${gate.removed.join(", ")}. The watermark was ` +
      `re-anchored in your working tree — commit the updated executable-requirements/extractors/fallback/fallback-coverage.baseline.GENERATED.json.`;
    if (isCI) assert.fail(msg + " (CI sees a stale committed baseline.)");
    t.skip(msg);
    return;
  }
  const note = gate.added.length
    ? ` (${gate.added.length} newly added case(s) excluded until re-baselined: ${gate.added.join(", ")})`
    : "";
  for (const key of GATED) {
    assert.ok(
      tenths(gate.current[key]) >= tenths(baseline[key]),
      `Fallback ${key} dropped to ${gate.current[key]}% over the ${gate.shared.length} cases shared ` +
        `with the watermark (${baseline[key]}%)${note}. The generic extractor lost coverage relative to ` +
        `the dedicated sources — see executable-requirements/extractors/fallback/fallback-coverage.GENERATED.md and the value differences printed above. ` +
        `If this is an intentional, reviewed change, lower ${key} in ` +
        `executable-requirements/extractors/fallback/fallback-coverage.baseline.GENERATED.json.`
    );
  }
});

// Guard the baseline file itself: a typo'd or impossible watermark (>100, a
// gated key gone missing, or a non-array case list) would make the gate
// meaningless.
test("the coverage baseline file is well-formed", () => {
  for (const key of GATED) {
    assert.equal(typeof baseline[key], "number", `baseline.${key} must be a number`);
    assert.ok(baseline[key] >= 0 && baseline[key] <= 100, `baseline.${key} must be a percentage`);
  }
  if (baseline.cases !== undefined) {
    assert.ok(Array.isArray(baseline.cases), "baseline.cases must be an array when present");
  }
});

// The integration test for the GENERIC fallback extractor
// (pipeline/extract-unsupported.js): a high-watermark gate on how much it
// recovers, per page, relative to each page's dedicated per-site source.
//
// The comparison itself lives in test/fallback-coverage.js (run GCal.extract()
// twice on every cached case page — once normally, once with the site registry
// emptied — and grade the fallback's primary event field-by-field against the
// custom one). This file turns that into a regression gate plus a refreshed
// human-readable report:
//
//   - Two GATE tests assert the current critical-field and all-field coverage
//     have not dropped below the stored high-watermark in
//     fallback-coverage.baseline.json. The watermark only ever ratchets UP, so
//     these catch a fallback (or shared-helper) change that quietly makes the
//     generic extractor worse.
//   - A REFRESH test (skipped in CI) rewrites docs/fallback-coverage.md to the
//     current numbers and ratchets the baseline up when coverage improved, so
//     the committed artifact and watermark track reality. It writes into the
//     working tree only; committing is the normal review flow (like the UI
//     snapshots refreshed by `npm run refresh:ui`), not something the test does
//     to git. In CI it is a no-op — the committed report/baseline are the
//     reviewed truth and re-committing them on a runner is not worth the hassle.
//
// Like the live tests, this runs offline against the cached HTML in data/, so a
// cached-page refresh that genuinely changes a source's ground truth can move
// these numbers; re-baseline by hand when that happens (see the baseline file).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { computeCoverage, renderMarkdown } = require("../fallback-coverage");

const BASELINE_PATH = path.join(__dirname, "fallback-coverage.baseline.json");
const REPORT_PATH = path.join(__dirname, "..", "..", "docs", "fallback-coverage.md");
const GATED = ["criticalFieldsPct", "allFieldsPct"];
const isCI = Boolean(process.env.CI);

// Compute once; all tests share it (each run does 2x jsdom extraction per case).
const coverage = computeCoverage();
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));

// Compare on tenths so the stored watermark (one decimal) and the live value
// can't disagree over float noise.
const tenths = (x) => Math.round(x * 10);

test("fallback-coverage report and watermark are refreshed (skipped in CI)", (t) => {
  if (isCI) {
    t.skip("CI: read-only gate — the committed report and baseline are the reviewed truth");
    return;
  }
  // Ratchet each gated watermark UP when the fallback improved; never down.
  const next = { ...baseline };
  for (const key of GATED) {
    if (tenths(coverage.scores[key]) > tenths(baseline[key])) next[key] = coverage.scores[key];
  }
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + "\n");
  fs.writeFileSync(REPORT_PATH, renderMarkdown(coverage, next));
});

for (const key of GATED) {
  test(`fallback ${key} has not regressed below its high-watermark`, () => {
    const current = coverage.scores[key];
    const mark = baseline[key];
    assert.ok(
      tenths(current) >= tenths(mark),
      `Fallback ${key} dropped to ${current}% (watermark ${mark}%). The generic extractor ` +
        `lost coverage relative to the dedicated sources. Investigate via docs/fallback-coverage.md; ` +
        `if the drop is an intentional, reviewed change, lower ${key} in ` +
        `test/integration/fallback-coverage.baseline.json to re-baseline.`
    );
  });
}

// Guard the baseline file itself: a typo'd or impossible watermark (>100, or a
// gated key gone missing) would make the gate meaningless.
test("the coverage baseline file is well-formed", () => {
  for (const key of GATED) {
    assert.equal(typeof baseline[key], "number", `baseline.${key} must be a number`);
    assert.ok(baseline[key] >= 0 && baseline[key] <= 100, `baseline.${key} must be a percentage`);
  }
});

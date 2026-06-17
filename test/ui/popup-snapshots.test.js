// UI snapshot tests. Each case (test/ui/cases/<name>.case.js) supplies fake data
// (and an optional DOM action); the renderer feeds it to the popup's REAL
// render() — the same chooseContent + view code the extension runs — and
// rasterizes the result, which is compared pixel-by-pixel (via pixelmatch)
// against the committed reference PNG (test/ui/cases/<name>.png). So the
// snapshots track the shipped views and styles directly; there is no
// hand-maintained copy of the popup markup. Run `npm run refresh:ui` to
// regenerate after an intentional change to the popup, the views, or ui/popup.css.
//
// A case is a self-contained scenario: its data lives only in the case file
// (never in production code, never in a shared gallery). See docs/claude/testing.md.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { renderCasePng, loadCases, CASES_DIR } = require("./popup-renderer");
const { artifactPath } = require("./snapshot-artifacts-dir");

// Rendering is deterministic (satori + resvg + bundled fonts, no browser), so a
// snapshot must match its reference EXACTLY — any differing pixel is a real,
// intentional-or-not change to the popup. If cross-platform rasterization noise
// ever makes this flap, revisit a small tolerance then rather than pre-emptively.
const MAX_DIFF_RATIO = 0;

async function compareToSnapshot(name, pngBuffer) {
  const snapshotPath = path.join(CASES_DIR, `${name}.png`);
  const actualPath = artifactPath(`${name}.actual.png`);
  const diffPath = artifactPath(`${name}.diff.png`);

  const actual = PNG.sync.read(pngBuffer);
  assert.ok(
    fs.existsSync(snapshotPath),
    `No stored snapshot at ${snapshotPath}; run "npm run refresh:ui" to create one.`
  );
  const expected = PNG.sync.read(fs.readFileSync(snapshotPath));

  if (actual.width !== expected.width || actual.height !== expected.height) {
    fs.writeFileSync(actualPath, pngBuffer);
    assert.fail(
      `${name}: popup size changed: expected ${expected.width}x${expected.height}, got ` +
        `${actual.width}x${actual.height}. Run "npm run refresh:ui" if this is intentional.`
    );
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(actual.data, expected.data, diff.data, width, height, { threshold: 0.1 });
  const ratio = diffPixels / (width * height);

  if (ratio > MAX_DIFF_RATIO) {
    fs.writeFileSync(actualPath, pngBuffer);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    assert.fail(
      `${name}: popup UI changed: ${diffPixels} of ${width * height} pixels differ ` +
        `(${(ratio * 100).toFixed(2)}%). See ${actualPath} and ${diffPath}, ` +
        `or run "npm run refresh:ui" if this is intentional.`
    );
  } else {
    for (const p of [actualPath, diffPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

const CASES = loadCases();

test("there is at least one UI case", () => {
  assert.ok(CASES.length > 0, "no test/ui/cases/*.case.js found");
});

// The popup's date/time copy comes from the real views' toLocale* calls, which
// follow the runtime's default locale. The committed PNGs are authored in en-US
// (Node's fallback when LANG is unset or C.UTF-8 — the CI/sandbox default). Guard
// it so a maintainer on a non-English shell gets an actionable message instead of
// a baffling text-only pixel diff.
test("the environment resolves to the en-US locale the snapshots assume", () => {
  const locale = new Intl.DateTimeFormat().resolvedOptions().locale;
  assert.equal(
    locale,
    "en-US",
    `UI snapshots are authored in en-US, but this environment resolves to "${locale}". ` +
      `Unset LANG/LC_ALL (or set LANG=C.UTF-8) when running/regenerating the UI snapshots.`
  );
});

for (const testCase of CASES) {
  test(`UI case "${testCase.name}" (${testCase.description}) matches its snapshot`, async () => {
    await compareToSnapshot(testCase.name, await renderCasePng(testCase));
  });
}

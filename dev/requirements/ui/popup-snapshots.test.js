// UI snapshot tests — the single visual-comparison engine for every pixel-asserted
// requirement. Each case (dev/requirements/ui/cases/<name>.case.js) supplies fake data;
// render-snapshot.js turns it into a PNG with the RIGHT renderer, chosen by the
// case's own `kind` (the popup's REAL render() by default; the real
// extension/icon/toolbar-icon.js in a fake browser for a `kind: "icon"` case — §10), and the
// result is compared pixel-by-pixel (via pixelmatch) against the committed
// reference PNG (dev/requirements/ui/cases/<name>.png). So the
// snapshots track the shipped code directly; there is no hand-maintained copy of
// the popup markup or the icon art. The comparison, naming, and refresh below are
// shared across both — only the pixel source differs. Run `npm run refresh:ui` to
// regenerate after an intentional change to the popup, the views, events-popup/popup.css, or
// the toolbar icon.
//
// A case is a self-contained scenario: its data lives only in the case file
// (never in production code, never in a shared gallery). See dev/procedures/claude/testing.md.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { loadCases, CASES_DIR } = require("../infra/popup-renderer");
const { renderSnapshot, rendersImage } = require("../infra/render-snapshot");
const { artifactPath } = require("../infra/snapshot-artifacts-dir");

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

// Only the image-producing cases are snapshotted here; a `kind: "behavior"` case
// has no pixels and is verified by dev/requirements/ui/events-view-actions.test.js instead.
const CASES = loadCases().filter(rendersImage);

test("there is at least one UI case", () => {
  assert.ok(CASES.length > 0, "no image-producing dev/requirements/ui/cases/*.case.js found");
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
    await compareToSnapshot(testCase.name, await renderSnapshot(testCase));
  });
}

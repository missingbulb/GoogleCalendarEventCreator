// UI snapshot test: renders an approximation of the popup with fixed fixture
// data (see fixture.js and render.js) and compares it against the stored
// image in test/ui/snapshots/popup.png. Run `npm run refresh:ui` to
// regenerate the stored image after an intentional UI change.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { renderPopupPng } = require("./render");

const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const SNAPSHOT_PATH = path.join(SNAPSHOTS_DIR, "popup.png");
const ACTUAL_PATH = path.join(SNAPSHOTS_DIR, "popup.actual.png");
const DIFF_PATH = path.join(SNAPSHOTS_DIR, "popup.diff.png");

// Rendering is deterministic (no browser/fonts involved), so pixels should
// match exactly run to run; allow a tiny tolerance for any
// platform-dependent rasterization differences.
const MAX_DIFF_RATIO = 0.005;

test("popup UI matches the stored snapshot", async () => {
  const actualBuffer = await renderPopupPng();
  const actual = PNG.sync.read(actualBuffer);

  assert.ok(
    fs.existsSync(SNAPSHOT_PATH),
    `No stored snapshot at ${SNAPSHOT_PATH}; run "npm run refresh:ui" to create one.`
  );
  const expected = PNG.sync.read(fs.readFileSync(SNAPSHOT_PATH));

  if (actual.width !== expected.width || actual.height !== expected.height) {
    fs.writeFileSync(ACTUAL_PATH, actualBuffer);
    assert.fail(
      `Popup size changed: expected ${expected.width}x${expected.height}, got ` +
        `${actual.width}x${actual.height}. Run "npm run refresh:ui" if this is intentional.`
    );
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(actual.data, expected.data, diff.data, width, height, {
    threshold: 0.1,
  });
  const ratio = diffPixels / (width * height);

  if (ratio > MAX_DIFF_RATIO) {
    fs.writeFileSync(ACTUAL_PATH, actualBuffer);
    fs.writeFileSync(DIFF_PATH, PNG.sync.write(diff));
    assert.fail(
      `Popup UI changed: ${diffPixels} of ${width * height} pixels differ ` +
        `(${(ratio * 100).toFixed(2)}%). See test/ui/snapshots/popup.actual.png and ` +
        `popup.diff.png, or run "npm run refresh:ui" if this is intentional.`
    );
  } else {
    // Clean up stale artifacts from a previous failing run.
    for (const p of [ACTUAL_PATH, DIFF_PATH]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
});

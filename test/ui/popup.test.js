// UI snapshot tests: render approximations of the popup with fixed fixture
// data (see fixture.js and render.js) and compare against stored images in
// test/ui/snapshots/. Run `npm run refresh:ui` to regenerate the stored
// images after an intentional UI change.
//
// Cases:
//   popup.png       — a single-event page: one ~60px "Add to Google Calendar"
//                     button under the heading.
//   popup-multi.png — a listing/series page with several events: one ~60px
//                     button per event (6 here), under an "N events on this
//                     page" heading.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { renderPopupPng } = require("./render");
const { SINGLE_EVENT, MULTI_EVENT } = require("./fixture");

const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

// Rendering is deterministic (no browser/fonts involved), so pixels should
// match exactly run to run; allow a tiny tolerance for any
// platform-dependent rasterization differences.
const MAX_DIFF_RATIO = 0.005;

async function compareToSnapshot(t, name, data) {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${name}.png`);
  const actualPath = path.join(SNAPSHOTS_DIR, `${name}.actual.png`);
  const diffPath = path.join(SNAPSHOTS_DIR, `${name}.diff.png`);

  const actualBuffer = await renderPopupPng(data);
  const actual = PNG.sync.read(actualBuffer);

  assert.ok(
    fs.existsSync(snapshotPath),
    `No stored snapshot at ${snapshotPath}; run "npm run refresh:ui" to create one.`
  );
  const expected = PNG.sync.read(fs.readFileSync(snapshotPath));

  if (actual.width !== expected.width || actual.height !== expected.height) {
    fs.writeFileSync(actualPath, actualBuffer);
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
    fs.writeFileSync(actualPath, actualBuffer);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    assert.fail(
      `${name}: popup UI changed: ${diffPixels} of ${width * height} pixels differ ` +
        `(${(ratio * 100).toFixed(2)}%). See ${name}.actual.png and ${name}.diff.png, ` +
        `or run "npm run refresh:ui" if this is intentional.`
    );
  } else {
    for (const p of [actualPath, diffPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

test("single-event popup matches the stored snapshot", async (t) => {
  await compareToSnapshot(t, "popup", SINGLE_EVENT);
});

test("multi-event popup matches the stored snapshot", async (t) => {
  await compareToSnapshot(t, "popup-multi", MULTI_EVENT);
});

// UI snapshot tests: render each of the popup's five states
// (ui/views/popup-states.html) to a PNG and compare against the stored image in
// test/ui/snapshots/. The states file is the single visual reference; the real
// ui/popup.css is inlined onto it before rendering (see popup-renderer.js), so
// the snapshots track the shipped styling. Run `npm run refresh:ui` to
// regenerate after an intentional change to the popup markup or ui/popup.css.
//
// The five states (issue #192; see ui/popup.js's chooseContent):
//   1-supported     — supported host: the extractor's events (a 2-event listing)
//   2-denylisted    — denylisted host: "No events found" (no link, no prompt)
//   3-nothing-found — not denylisted, nothing complete: "No events found" + Disagree? link
//   4-allowlisted   — complete fallback event, allowlisted: the event only
//   5-unlisted      — complete fallback event, on neither list: event + request button
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { renderStatePng, loadStatePopups } = require("./popup-renderer");
const { artifactPath } = require("./snapshot-artifacts-dir");

const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

// Rendering is deterministic (no browser/fonts involved beyond the bundled
// ones), so pixels should match run to run; allow a tiny tolerance for any
// platform-dependent rasterization differences.
const MAX_DIFF_RATIO = 0.005;

async function compareToSnapshot(name, pngBuffer) {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${name}.png`);
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

const STATES = loadStatePopups();

test("the gallery has all five states", () => {
  assert.equal(STATES.length, 5, "ui/views/popup-states.html should define five .state sections");
});

for (const { name, popup } of STATES) {
  test(`popup state "${name}" matches the stored snapshot`, async () => {
    await compareToSnapshot(`popup-state-${name}`, await renderStatePng(popup));
  });
}

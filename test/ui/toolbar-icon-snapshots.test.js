// UI snapshot test: generates the expected toolbar icon (128x128, see
// icon-renderer.js) for both states described in ui/toolbar-icon.js -- a green
// border for pages with a site-specific extractor and a red border
// otherwise -- and compares each against the stored images in
// test/ui/snapshots/icon-{red,green}.png. Run `npm run refresh:ui` to
// regenerate those images after an intentional change.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { renderIconPng, RED, GREEN } = require("./icon-renderer");
const { artifactPath } = require("./snapshot-artifacts-dir");

const ICONS_DIR = path.join(__dirname, "..", "..", "icons");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");

const CASES = [
  { state: "unsupported", color: RED, name: "icon-unsupported.png", shippedIcon: "icon128-red.png" },
  { state: "supported", color: GREEN, name: "icon-supported.png", shippedIcon: "icon128-green.png" },
];

for (const { state, color, name, shippedIcon } of CASES) {
  test(`toolbar icon for ${state} pages matches the stored snapshot`, () => {
    const actualBuffer = renderIconPng(color);
    const actual = PNG.sync.read(actualBuffer);

    const snapshotPath = path.join(SNAPSHOTS_DIR, name);
    const actualPath = artifactPath(name.replace(/\.png$/, ".actual.png"));
    const diffPath = artifactPath(name.replace(/\.png$/, ".diff.png"));

    assert.ok(
      fs.existsSync(snapshotPath),
      `No stored snapshot at ${snapshotPath}; run "npm run refresh:ui" to create one.`
    );
    const expected = PNG.sync.read(fs.readFileSync(snapshotPath));

    if (actual.width !== expected.width || actual.height !== expected.height) {
      fs.writeFileSync(actualPath, actualBuffer);
      assert.fail(
        `Icon size changed: expected ${expected.width}x${expected.height}, got ` +
          `${actual.width}x${actual.height}. Run "npm run refresh:ui" if this is intentional.`
      );
    }

    const { width, height } = actual;
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(actual.data, expected.data, diff.data, width, height, {
      threshold: 0.1,
    });

    if (diffPixels > 0) {
      fs.writeFileSync(actualPath, actualBuffer);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      assert.fail(
        `Icon for ${state} pages changed: ${diffPixels} of ${width * height} pixels differ ` +
          `from ${snapshotPath}. See ${actualPath} and ${diffPath}, ` +
          `or run "npm run refresh:ui" if this is intentional.`
      );
    } else {
      for (const p of [actualPath, diffPath]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
  });

  // Cross-check against the actual shipped icon used by ui/toolbar-icon.js, so a
  // drift between tools/gen_icons.py and icon-renderer.js is caught too.
  test(`toolbar icon for ${state} pages matches icons/${shippedIcon}`, () => {
    const actual = PNG.sync.read(renderIconPng(color));
    const shippedPath = path.join(ICONS_DIR, shippedIcon);
    assert.ok(fs.existsSync(shippedPath), `Missing icon asset at ${shippedPath}; run "tools/gen_icons.py".`);
    const expected = PNG.sync.read(fs.readFileSync(shippedPath));

    assert.equal(actual.width, expected.width);
    assert.equal(actual.height, expected.height);

    const diff = new PNG({ width: actual.width, height: actual.height });
    const diffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, {
      threshold: 0.1,
    });
    assert.equal(diffPixels, 0, `Generated ${state} icon differs from icons/${shippedIcon} in ${diffPixels} pixels`);
  });
}

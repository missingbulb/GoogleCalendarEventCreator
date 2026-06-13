// UI test: generates the expected toolbar icon (128x128, see
// render-icon.js) for both the "supported" (green border, e.g. meetup.com)
// and "unsupported" (red border) states from icon-state.js, and compares
// each against the corresponding committed icon in icons/.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { renderIconPng, RED, GREEN } = require("./render-icon");

const ICONS_DIR = path.join(__dirname, "..", "..", "icons");

const CASES = [
  { state: "unsupported", color: RED, file: "icon128-red.png" },
  { state: "supported", color: GREEN, file: "icon128-green.png" },
];

for (const { state, color, file } of CASES) {
  test(`toolbar icon for ${state} pages matches icons/${file}`, () => {
    const actualBuffer = renderIconPng(color);
    const actual = PNG.sync.read(actualBuffer);

    const iconPath = path.join(ICONS_DIR, file);
    assert.ok(fs.existsSync(iconPath), `Missing icon asset at ${iconPath}; run "tools/gen_icons.py".`);
    const expected = PNG.sync.read(fs.readFileSync(iconPath));

    assert.equal(actual.width, expected.width);
    assert.equal(actual.height, expected.height);

    const diff = new PNG({ width: actual.width, height: actual.height });
    const diffPixels = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, {
      threshold: 0.1,
    });
    assert.equal(diffPixels, 0, `Generated ${state} icon differs from icons/${file} in ${diffPixels} pixels`);
  });
}

// Toolbar-icon snapshot tests, built like the popup UI snapshots
// (test/ui/popup-snapshots.test.js). Each scenario lives in its own data-only case
// file (icon-cases/<name>.case.js, no assertions); this runner does the same thing
// for every case: feed the case's tab URL + faked host lists to the extension's
// REAL icon pipeline (extension-icon-for-url.js boots the shipped ui/toolbar-icon.js
// and reads back the ImageData its buildRules() bakes), then compare the generated
// PNG to the committed reference docs/extension-icon-<name>.png — the same image
// embedded in docs/productRequirements.md. Regenerate after an intentional icon or
// classification change with `node test/extension/refresh-icon-snapshots.js`.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default;
const { iconPngForUrl } = require("./extension-icon-for-url");
const { loadIconCases } = require("./icon-cases");

const DOCS = path.join(__dirname, "..", "..", "docs");
const ARTIFACTS_DIR = path.join(__dirname, ".artifacts");
const referencePath = (name) => path.join(DOCS, `extension-icon-${name}.png`);

// The pipeline is deterministic (a fixed decode + re-encode), so a snapshot must
// match its reference EXACTLY — any differing pixel is a real change to the icon
// art or to the classification that selects it.
const MAX_DIFF_RATIO = 0;

// On a mismatch, write the rendered actual (and a highlighted diff) next to a
// single ignored artifacts dir, mirroring the UI snapshot runner.
function artifactPath(name) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  return path.join(ARTIFACTS_DIR, name);
}

function compareToReference(name, pngBuffer) {
  const refPath = referencePath(name);
  assert.ok(fs.existsSync(refPath), `No stored image at ${refPath}; run "node test/extension/refresh-icon-snapshots.js" to create one.`);

  const actual = PNG.sync.read(pngBuffer);
  const expected = PNG.sync.read(fs.readFileSync(refPath));

  if (actual.width !== expected.width || actual.height !== expected.height) {
    fs.writeFileSync(artifactPath(`${name}.actual.png`), pngBuffer);
    assert.fail(`${name}: icon size changed: expected ${expected.width}x${expected.height}, got ${actual.width}x${actual.height}.`);
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(actual.data, expected.data, diff.data, width, height, { threshold: 0.1 });

  if (diffPixels / (width * height) > MAX_DIFF_RATIO) {
    const actualPath = artifactPath(`${name}.actual.png`);
    const diffPath = artifactPath(`${name}.diff.png`);
    fs.writeFileSync(actualPath, pngBuffer);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    assert.fail(
      `${name}: toolbar icon changed: ${diffPixels} of ${width * height} pixels differ. ` +
        `See ${actualPath} and ${diffPath}, or run "node test/extension/refresh-icon-snapshots.js" if this is intentional.`
    );
  }
}

const CASES = loadIconCases();

test("there is at least one icon case", () => {
  assert.ok(CASES.length > 0, "no test/extension/icon-cases/*.case.js found");
});

for (const testCase of CASES) {
  test(`icon case "${testCase.name}" (${testCase.description}) matches its image`, async () => {
    compareToReference(testCase.name, await iconPngForUrl(testCase.tabUrl, testCase.lists));
  });
}

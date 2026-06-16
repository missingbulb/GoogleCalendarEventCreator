// Regenerates the UI snapshots (test/ui/cases/<name>.png) from the cases in
// test/ui/cases/*.case.js, using the same rendering as the snapshot test (each
// case's fake data through the popup's real render() — see popup-renderer.js),
// plus the gallery README.md derived from the same cases. Run after an
// intentional change to the popup, its views, or ui/popup.css, and commit the
// PNGs (and README) so reviewers see the before/after in the diff.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderCasePng, loadCases, CASES_DIR } = require("./popup-renderer");
const { buildReadme, README_PATH } = require("./build-readme");

(async () => {
  for (const testCase of loadCases()) {
    const outPath = path.join(CASES_DIR, `${testCase.name}.png`);
    fs.writeFileSync(outPath, await renderCasePng(testCase));
    console.log(`Wrote ${outPath}`);
  }
  // The gallery README is derived from the same cases — refresh it alongside.
  fs.writeFileSync(README_PATH, buildReadme());
  console.log(`Wrote ${README_PATH}`);
})();

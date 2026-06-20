// Regenerates the UI snapshots (test/ui/cases/<name>.png) from the cases in
// test/ui/cases/*.case.js, using the same rendering as the snapshot test (each
// case's fake data through the popup's real render() — see popup-renderer.js),
// plus the two derived galleries. Run after an intentional change to the popup,
// its views, or ui/popup.css, and commit the PNGs (and galleries) so reviewers
// see the before/after in the diff.
//
// Two galleries are written, in order (the inline one embeds the PNGs that must
// exist first):
//   - the legacy case-first gallery test/ui/README.md (build-readme.js) — being
//     superseded by the inline gallery; kept until the per-leaf migration is done
//     (#435).
//   - the requirement-first INLINE gallery: the PNGs embedded directly under each
//     requirement in docs/uiRequirements.md (build-requirements-gallery.js).
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderCasePng, loadCases, CASES_DIR } = require("./popup-renderer");
const { buildReadme, README_PATH } = require("./build-readme");
const { buildGallery, DOC_PATH } = require("./build-requirements-gallery");

(async () => {
  for (const testCase of loadCases()) {
    const outPath = path.join(CASES_DIR, `${testCase.name}.png`);
    fs.writeFileSync(outPath, await renderCasePng(testCase));
    console.log(`Wrote ${outPath}`);
  }
  // The galleries are derived from the same cases — refresh them alongside.
  fs.writeFileSync(README_PATH, buildReadme());
  console.log(`Wrote ${README_PATH}`);
  fs.writeFileSync(DOC_PATH, buildGallery());
  console.log(`Wrote inline gallery into ${DOC_PATH}`);
})();

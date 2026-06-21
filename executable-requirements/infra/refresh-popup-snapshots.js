// Regenerates the UI snapshots (executable-requirements/ui/cases/<name>.png) from the cases in
// executable-requirements/ui/cases/*.case.js, using the same rendering as the snapshot test (each case
// through render-snapshot.js, which dispatches to the popup renderer or the
// toolbar-icon renderer by leaf kind), plus the requirement-first INLINE gallery:
// each per-leaf PNG embedded directly under its requirement in
// executable-requirements/Requirements.md (build-requirements-gallery.js). Run after an intentional
// change to the popup, its views, ui/popup.css, or the toolbar icon, and commit the
// PNGs + the gallery so reviewers see the before/after in the diff.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { loadCases, CASES_DIR } = require("./popup-renderer");
const { renderSnapshot, rendersImage } = require("./render-snapshot");
const { buildGallery, DOC_PATH } = require("./build-requirements-gallery");

(async () => {
  // Skip non-image cases (e.g. `kind: "behavior"`): they have no snapshot to write.
  for (const testCase of loadCases().filter(rendersImage)) {
    const outPath = path.join(CASES_DIR, `${testCase.name}.png`);
    fs.writeFileSync(outPath, await renderSnapshot(testCase));
    console.log(`Wrote ${outPath}`);
  }
  // The inline gallery embeds those PNGs — refresh it after they exist.
  fs.writeFileSync(DOC_PATH, buildGallery());
  console.log(`Wrote inline gallery into ${DOC_PATH}`);
})();

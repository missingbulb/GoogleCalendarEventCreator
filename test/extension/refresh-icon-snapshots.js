// Regenerate the committed toolbar-icon reference PNGs from the icon cases, the
// counterpart to test/ui/refresh-popup-snapshots.js for the UI snapshots. Runs the
// extension's real icon pipeline for each case and writes the result to
// docs/extension-icon-<name>.png (the image embedded in docs/productRequirements.md).
// Run after an intentional change to the icon art or the classification, then review
// and commit the PNGs:  node test/extension/refresh-icon-snapshots.js
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { iconPngForUrl } = require("./extension-icon-for-url");
const { loadIconCases } = require("./icon-cases");

const DOCS = path.join(__dirname, "..", "..", "docs");

(async () => {
  for (const c of loadIconCases()) {
    const png = await iconPngForUrl(c.tabUrl, c.lists);
    fs.writeFileSync(path.join(DOCS, `extension-icon-${c.name}.png`), png);
    console.log(`extension-icon-${c.name}.png`);
  }
})();

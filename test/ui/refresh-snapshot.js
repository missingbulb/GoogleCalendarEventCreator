// Regenerates test/ui/snapshots/popup.png from the current popup.html, using
// the same fixed fixture data and rendering as the snapshot test. Run after
// an intentional change to the popup's UI.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { capturePopupScreenshot } = require("./capture");

(async () => {
  const buffer = await capturePopupScreenshot();
  const outDir = path.join(__dirname, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "popup.png");
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath}`);
})();

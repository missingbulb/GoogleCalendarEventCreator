// Regenerates the popup state snapshots (test/ui/snapshots/popup-state-*.png)
// from ui/views/popup-states.html, using the same rendering as the snapshot
// test (see popup-renderer.js). Run after an intentional change to the popup
// markup (ui/views/popup-states.html) or its styling (ui/popup.css).
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderStatePng, loadStatePopups } = require("./popup-renderer");

(async () => {
  const outDir = path.join(__dirname, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });
  for (const { name, popup } of loadStatePopups()) {
    const outPath = path.join(outDir, `popup-state-${name}.png`);
    fs.writeFileSync(outPath, await renderStatePng(popup));
    console.log(`Wrote ${outPath}`);
  }
})();

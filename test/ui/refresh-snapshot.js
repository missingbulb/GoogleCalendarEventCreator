// Regenerates the popup UI snapshots (test/ui/snapshots/popup.png and
// popup-multi.png), using the same fixed fixture data and rendering as the
// snapshot test (see render.js). Run after an intentional change to the
// popup's UI.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderPopupPng } = require("./render");
const { SINGLE_EVENT, MULTI_EVENT, TRUNCATED_EVENT, NO_EVENTS } = require("./fixture");

(async () => {
  const outDir = path.join(__dirname, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, data] of [
    ["popup", SINGLE_EVENT],
    ["popup-multi", MULTI_EVENT],
    ["popup-truncated", TRUNCATED_EVENT],
    ["popup-empty", NO_EVENTS],
  ]) {
    const outPath = path.join(outDir, `${name}.png`);
    fs.writeFileSync(outPath, await renderPopupPng(data));
    console.log(`Wrote ${outPath}`);
  }
})();

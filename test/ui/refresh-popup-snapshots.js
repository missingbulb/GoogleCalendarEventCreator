// Regenerates the popup UI snapshots (test/ui/snapshots/popup-single-event.png
// and popup-multi-event.png), using the same fixed fixture data and rendering as the
// snapshot test (see popup-renderer.js). Run after an intentional change to the
// popup's UI.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderPopupPng } = require("./popup-renderer");
const { SINGLE_EVENT, MULTI_EVENT, TRUNCATED_EVENT, NO_EVENTS } = require("./popup-fixtures");

(async () => {
  const outDir = path.join(__dirname, "snapshots");
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, data, opts] of [
    ["popup-single-event", SINGLE_EVENT],
    ["popup-multi-event", MULTI_EVENT],
    ["popup-truncated", TRUNCATED_EVENT],
    ["popup-empty", NO_EVENTS],
    ["popup-fallback-request", SINGLE_EVENT, { requestButton: true }],
    ["popup-unsupported-empty", NO_EVENTS, { policyLink: true }],
  ]) {
    const outPath = path.join(outDir, `${name}.png`);
    fs.writeFileSync(outPath, await renderPopupPng(data, opts));
    console.log(`Wrote ${outPath}`);
  }
})();

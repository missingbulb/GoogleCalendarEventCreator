// Regenerates test/ui/snapshots/icon-unsupported.png and icon-supported.png, the
// expected toolbar icon images for the "unsupported" and "supported" states
// from icon-state.js (see render-icon.js). Run after an intentional change
// to tools/gen_icons.py / render-icon.js.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { renderIconPng, RED, GREEN } = require("./render-icon");

const outDir = path.join(__dirname, "snapshots");
fs.mkdirSync(outDir, { recursive: true });

for (const [name, color] of [["icon-unsupported.png", RED], ["icon-supported.png", GREEN]]) {
  const outPath = path.join(outDir, name);
  fs.writeFileSync(outPath, renderIconPng(color));
  console.log(`Wrote ${outPath}`);
}

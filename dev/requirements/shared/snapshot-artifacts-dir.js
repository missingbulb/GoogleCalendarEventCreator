// Where the UI snapshot tests write their <name>.actual.png / <name>.diff.png
// debugging artifacts when a comparison fails. This is a single dir separate
// from the committed reference PNGs in dev/requirements/<kind>/cases/, ignored by one
// .gitignore line, so adding cases never adds per-file ignore entries. Keeping
// it in-repo (rather than the system temp dir) lets CI collect the diffs as
// build artifacts on failure. Failure messages print the full path.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ARTIFACTS_DIR = path.join(__dirname, ".artifacts");

// Absolute path for a named artifact, creating the temp dir on first use.
function artifactPath(name) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  return path.join(ARTIFACTS_DIR, name);
}

module.exports = { ARTIFACTS_DIR, artifactPath };

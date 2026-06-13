// Where the UI snapshot tests write their <name>.actual.png / <name>.diff.png
// debugging artifacts when a comparison fails. This is a temp dir *outside*
// the repo, so the artifacts never land next to the committed reference PNGs
// in test/ui/snapshots/ and never need a .gitignore entry. Failure messages
// print the full path so the files are easy to find.
"use strict";

const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

const ARTIFACTS_DIR = path.join(os.tmpdir(), "gcal-ui-snapshots");

// Absolute path for a named artifact, creating the temp dir on first use.
function artifactPath(name) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  return path.join(ARTIFACTS_DIR, name);
}

module.exports = { ARTIFACTS_DIR, artifactPath };

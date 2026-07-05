#!/usr/bin/env node
// Filters a list of repo-relative paths down to the ones that SHIP — i.e. that
// land in the Web Store zip per dev/build/release/shipping-files.js (the single source of
// truth for the shipping set). Docs, tests, dev tooling, workflows, and
// anything else outside the shipping set pass through as non-shipped and are
// dropped.
//
// Used by the daily auto-release workflow (.github/workflows/daily-release.yml)
// to decide whether the changes since the last release warrant a store release:
//
//   git diff --name-only vX.Y.Z HEAD | node dev/build/release/filter-shipped-paths.js
//
// Prints the shipped subset (one per line, order preserved); empty output means
// nothing deployable changed. Always exits 0 — emptiness is the signal.

const { EXTENSION_DIR, isShipped } = require("./shipping-files");

// `paths` are repo-relative (as git prints them); the shipping set is relative
// to the extension root, so membership = "under EXTENSION_DIR and isShipped of
// the remainder".
function filterShippedPaths(paths) {
  const prefix = EXTENSION_DIR + "/";
  return paths.filter((p) => p.startsWith(prefix) && isShipped(p.slice(prefix.length)));
}

module.exports = { filterShippedPaths };

if (require.main === module) {
  const input = require("fs").readFileSync(0, "utf8");
  const paths = input.split("\n").filter((line) => line.trim() !== "");
  const shipped = filterShippedPaths(paths);
  if (shipped.length) process.stdout.write(shipped.join("\n") + "\n");
}

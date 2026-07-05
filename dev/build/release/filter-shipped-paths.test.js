// Pins the daily-release change filter: repo-relative paths in, the shipped
// subset out. A wrong answer here either cuts a store release for a docs-only
// day or silently skips a real code change, so both directions are pinned.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");
const { filterShippedPaths } = require("./filter-shipped-paths");

test("shipped extension files pass the filter", () => {
  const shipped = [
    "extension/manifest.json",
    "extension/config.js",
    "extension/fallback-lists.json",
    "extension/event-extractors/custom/meetup.js",
    "extension/events-popup/popup.css",
    "extension/icon/images/icon16.png",
  ];
  assert.deepEqual(filterShippedPaths(shipped), shipped);
});

test("docs, tests, dev tooling, and workflows are dropped", () => {
  assert.deepEqual(
    filterShippedPaths([
      "README.md",
      "CLAUDE.md",
      "dev/procedures/this_project/workflow.md",
      "dev/requirements/extractor/expected/meetup.json",
      "dev/requirements/extractor/data/server-fetched/meetup.html",
      "extension-test/events-popup/popup.test.js",
      "dev/build/release/shipping-files.js",
      ".github/workflows/test.yml",
      "package.json",
    ]),
    []
  );
});

test("a non-shipped file under extension/ is dropped, not prefix-matched in", () => {
  // Nothing outside SHIPPING_PATHS ships even inside the extension root, and a
  // path merely sharing a shipped prefix ("icon-notes…" vs "icon/") stays out.
  assert.deepEqual(filterShippedPaths(["extension/notes.md", "extension/icon-notes.md"]), []);
});

test("mixed input keeps only the shipped subset, order preserved", () => {
  assert.deepEqual(
    filterShippedPaths(["README.md", "extension/events-popup/popup.js", "dev/build/release/build-zip.js"]),
    ["extension/events-popup/popup.js"]
  );
});

test("CLI reads paths on stdin and prints the shipped subset", () => {
  const out = execFileSync("node", [path.join(__dirname, "filter-shipped-paths.js")], {
    input: "README.md\nextension/events-popup/popup.js\n\ndev/procedures/this_project/github.md\n",
    encoding: "utf8",
  });
  assert.equal(out, "extension/events-popup/popup.js\n");
});

test("CLI prints nothing (and exits 0) when nothing deployable changed", () => {
  const out = execFileSync("node", [path.join(__dirname, "filter-shipped-paths.js")], {
    input: "README.md\ndocs.md\n",
    encoding: "utf8",
  });
  assert.equal(out, "");
});

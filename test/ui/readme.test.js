// Keeps test/ui/README.md (the snapshot gallery) in sync with the cases, the
// same way the fallback-coverage report is kept: a REFRESH test rewrites the file
// into the working tree (skipped in CI), and a GATE test asserts the committed
// file matches what the generator produces (the read-only truth in CI). So
// adding/renaming a case or editing its description updates the gallery on the
// next local `npm test`/`npm run refresh:ui`, and a stale committed README fails
// CI. The generator is the single source of truth — see build-readme.js.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { buildReadme, README_PATH } = require("./build-readme");

const isCI = Boolean(process.env.CI);

test("UI snapshot README is refreshed (skipped in CI)", (t) => {
  if (isCI) {
    t.skip("CI: read-only gate — the committed README.md is the reviewed truth");
    return;
  }
  fs.writeFileSync(README_PATH, buildReadme());
});

test("test/ui/README.md matches the generator (run npm run refresh:ui)", () => {
  const committed = fs.existsSync(README_PATH) ? fs.readFileSync(README_PATH, "utf8") : "";
  assert.equal(
    committed,
    buildReadme(),
    "test/ui/README.md is stale: it's generated from the cases. Run `npm run refresh:ui` " +
      "(or `npm test` locally) and commit the result."
  );
});

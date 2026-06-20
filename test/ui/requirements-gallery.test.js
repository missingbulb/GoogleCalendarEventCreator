// Keeps the INLINE gallery (the generated `![req-…]` image lines and behavior
// notes embedded under each requirement in docs/uiRequirements.md) in sync with
// the cases, the same REFRESH-then-GATE way as readme.test.js: a refresh test
// rewrites the managed lines into the working tree (skipped in CI), and a gate
// test asserts the committed file already matches (the read-only truth in CI). So
// adding a per-leaf case (or its PNG) embeds its image inline on the next local
// `npm test`/`npm run refresh:ui`, and a stale doc fails CI.
//
// The generator only rewrites managed lines — the hand-authored requirement prose
// is untouched — so this gate does NOT fight a spec edit; it only catches a
// missing/stale generated image line. Single source of truth: the requirement
// kinds + the per-leaf PNGs on disk (see build-requirements-gallery.js).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { buildGallery, DOC_PATH } = require("./build-requirements-gallery");

const isCI = Boolean(process.env.CI);

test("inline requirements gallery is refreshed (skipped in CI)", (t) => {
  if (isCI) {
    t.skip("CI: read-only gate — the committed docs/uiRequirements.md is the reviewed truth");
    return;
  }
  fs.writeFileSync(DOC_PATH, buildGallery());
});

test("docs/uiRequirements.md inline gallery matches the generator (run npm run refresh:ui)", () => {
  const committed = fs.existsSync(DOC_PATH) ? fs.readFileSync(DOC_PATH, "utf8") : "";
  assert.equal(
    committed,
    buildGallery(),
    "docs/uiRequirements.md's inline `![req-…]` gallery is stale: it's generated from the cases. " +
      "Run `npm run refresh:ui` (or `npm test` locally) and commit the result."
  );
});

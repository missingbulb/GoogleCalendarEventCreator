// Guards pipeline/load-order.generated.json against drift: it must match what
// `npm run index` (tools/gen-load-order.js) would produce from the current extractor
// files. If this fails, an extractor was added/removed/renamed without
// regenerating the list — run `npm run index` and commit the result.

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { computeLoadOrder, render, OUTPUT } = require("../../tools/gen-load-order");

const ROOT = path.join(__dirname, "..", "..");
// OUTPUT is relative to the extension root (extension/), where the generated
// load list is committed alongside the pipeline it lists.
const EXT = path.join(ROOT, "extension");

test("the committed load order matches `npm run index`", () => {
  const committed = fs.readFileSync(path.join(EXT, OUTPUT), "utf8");
  assert.equal(
    committed,
    render(computeLoadOrder()),
    "extension/pipeline/load-order.generated.json is stale — run `npm run index` and commit it"
  );
});

test("the registry loads first and the orchestrator loads last", () => {
  const list = computeLoadOrder();
  assert.equal(list[0], "pipeline/registry.js", "the registry must load first");
  // After the registry, the helpers form a contiguous block before any
  // extract layer or source.
  const afterRegistry = list.slice(1);
  const firstNonHelper = afterRegistry.findIndex((f) => !f.startsWith("pipeline/helpers/"));
  assert.ok(
    afterRegistry.slice(firstNonHelper).every((f) => !f.startsWith("pipeline/helpers/")),
    "the helpers must load before the extract layers and sources"
  );
  assert.equal(
    list[list.length - 1],
    "pipeline/assemble-events.js",
    "the orchestrator (assemble-events.js) must load last"
  );
});

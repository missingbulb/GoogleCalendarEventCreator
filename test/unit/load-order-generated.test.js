// Guards pipeline/load-order.generated.json against drift: it must match what
// `npm run index` (tools/index.js) would produce from the current extractor
// files. If this fails, an extractor was added/removed/renamed without
// regenerating the list — run `npm run index` and commit the result.

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { computeLoadOrder, render, OUTPUT } = require("../../tools/index");

const ROOT = path.join(__dirname, "..", "..");

test("the committed load order matches `npm run index`", () => {
  const committed = fs.readFileSync(path.join(ROOT, OUTPUT), "utf8");
  assert.equal(
    committed,
    render(computeLoadOrder()),
    "pipeline/load-order.generated.json is stale — run `npm run index` and commit it"
  );
});

test("helpers load first and the orchestrator loads last", () => {
  const list = computeLoadOrder();
  assert.deepEqual(
    list.slice(0, 2),
    ["extractors/lib.js", "extractors/site-hosts.js"],
    "the shared toolbox and host registry must load first"
  );
  assert.equal(
    list[list.length - 1],
    "extractors/main.js",
    "the orchestrator (main.js) must load last"
  );
});

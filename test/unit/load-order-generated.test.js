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

// The toolbar service worker (ui/toolbar-icon.js) can't read the generated JSON at
// startup (MV3 only allows synchronous importScripts), so it lists registry +
// every source explicitly. Guard that hand-list against drift: it must import
// registry.js and exactly the sources in the generated load order.
test("the service worker imports the registry and every source", () => {
  const worker = fs.readFileSync(path.join(ROOT, "ui/toolbar-icon.js"), "utf8");
  const importBlock = worker.match(/importScripts\(([^)]*)\)/s);
  assert.ok(importBlock, "ui/toolbar-icon.js must call importScripts");
  // Worker paths are root-relative (leading slash); strip it to compare.
  const imported = [...importBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/^\//, ""));

  const loadOrder = computeLoadOrder();
  const sources = loadOrder.filter((f) => f.startsWith("pipeline/sources/"));

  assert.ok(imported.includes("pipeline/registry.js"), "worker must import pipeline/registry.js");
  assert.deepEqual(
    imported.filter((f) => f.startsWith("pipeline/sources/")).sort(),
    [...sources].sort(),
    "worker's source imports must match the generated sources — run `npm run index` and update ui/toolbar-icon.js"
  );
});

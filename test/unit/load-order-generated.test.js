// Guards pipeline/load-order.generated.json against drift: it must match what
// `npm run index` (tools/index.js) would produce from the current extractor
// files. If this fails, an extractor was added/removed/renamed without
// regenerating the list — run `npm run index` and commit the result.

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  computeLoadOrder, render, OUTPUT,
  renderFallbackLists, FALLBACK_LISTS_JSON, FALLBACK_LISTS_JS,
} = require("../../tools/index");

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

test("the committed fallback-lists.js matches `npm run index`", () => {
  const committed = fs.readFileSync(path.join(ROOT, FALLBACK_LISTS_JS), "utf8");
  const lists = JSON.parse(fs.readFileSync(path.join(ROOT, FALLBACK_LISTS_JSON), "utf8"));
  assert.equal(
    committed,
    renderFallbackLists(lists),
    `${FALLBACK_LISTS_JS} is stale — run \`npm run index\` and commit it`
  );
});

// The toolbar service worker (ui/toolbar-icon.js) can't read the generated JSON at
// startup (MV3 only allows synchronous importScripts), so it lists registry +
// every source explicitly. Guard that hand-list against drift: it must import
// registry.js, fallback-lists.js, and exactly the sources in the generated load order.
test("the service worker imports the registry and every source", () => {
  const worker = fs.readFileSync(path.join(ROOT, "ui/toolbar-icon.js"), "utf8");
  const importBlock = worker.match(/importScripts\(([^)]*)\)/s);
  assert.ok(importBlock, "ui/toolbar-icon.js must call importScripts");
  const imported = [...importBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(imported.length, "ui/toolbar-icon.js must importScripts at least one file");

  // An MV3 service worker resolves an importScripts path relative to the
  // worker's OWN location (ui/), with a leading slash meaning the extension
  // root. Resolve each the same way — as a repo-root-relative path — and assert
  // it lands on a real file there, which is what actually has to load. (The #146
  // regression used ui/-relative paths with no leading slash, so every import
  // resolved to a non-existent ui/pipeline/… and the worker failed to load.)
  const fromWorker = (p) =>
    p.startsWith("/") ? p.slice(1) : path.relative(ROOT, path.resolve(ROOT, "ui", p));
  const resolved = imported.map(fromWorker);
  imported.forEach((p, i) => {
    assert.ok(
      fs.existsSync(path.join(ROOT, resolved[i])),
      `worker imports "${p}", which resolves to ${resolved[i]} from ui/ — no such file`
    );
  });

  const loadOrder = computeLoadOrder();
  const sources = loadOrder.filter((f) => f.startsWith("pipeline/sources/"));

  assert.ok(resolved.includes("pipeline/fallback-lists.js"), "worker must import pipeline/fallback-lists.js");
  assert.ok(resolved.includes("pipeline/registry.js"), "worker must import pipeline/registry.js");
  assert.deepEqual(
    resolved.filter((f) => f.startsWith("pipeline/sources/")).sort(),
    [...sources].sort(),
    "worker's source imports must match the generated sources — run `npm run index` and update ui/toolbar-icon.js"
  );
});

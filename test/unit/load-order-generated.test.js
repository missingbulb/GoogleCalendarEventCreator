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
  computeLoadOrder,
  computeWorkerImports,
  render,
  renderWorkerImports,
  OUTPUT,
  WORKER_OUTPUT,
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

// The toolbar service worker (ui/toolbar-icon.js) can't read the generated JSON
// at startup (MV3 only allows synchronous importScripts), so the registry +
// source list it loads is generated into pipeline/worker-imports.generated.js,
// which the worker importScripts. Guard that generated file against drift the
// same way as the load order.
test("the committed worker imports match `npm run index`", () => {
  const committed = fs.readFileSync(path.join(ROOT, WORKER_OUTPUT), "utf8");
  assert.equal(
    committed,
    renderWorkerImports(computeWorkerImports()),
    "pipeline/worker-imports.generated.js is stale — run `npm run index` and commit it"
  );
});

// The worker itself just loads the generated file (no hand-list to drift): a
// single extension-root-absolute importScripts. Anything more would mean a
// hand-maintained list crept back in.
test("the service worker importScripts only the generated worker-imports file", () => {
  const worker = fs.readFileSync(path.join(ROOT, "ui/toolbar-icon.js"), "utf8");
  const importBlock = worker.match(/importScripts\(([^)]*)\)/s);
  assert.ok(importBlock, "ui/toolbar-icon.js must call importScripts");
  const imported = [...importBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    imported,
    ["/pipeline/worker-imports.generated.js"],
    "the worker must importScripts only pipeline/worker-imports.generated.js — run `npm run index`"
  );
});

// The generated file is what actually loads the registry + every source, so the
// "imports the registry and every source" guarantee (and the #146 leading-slash
// rule) now applies to it.
test("the generated worker imports cover the registry and every source, all resolvable", () => {
  const generated = fs.readFileSync(path.join(ROOT, WORKER_OUTPUT), "utf8");
  const importBlock = generated.match(/importScripts\(([^)]*)\)/s);
  assert.ok(importBlock, "worker-imports.generated.js must call importScripts");
  const imported = [...importBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(imported.length, "worker-imports.generated.js must importScripts at least one file");

  // An MV3 worker resolves these relative to the worker's own dir (ui/), with a
  // leading slash meaning the extension root. They must all be leading-slash
  // absolute (the #146 regression used ui/-relative paths that resolved to a
  // non-existent ui/pipeline/…), and each must land on a real file.
  imported.forEach((p) => {
    assert.ok(
      p.startsWith("/"),
      `worker import "${p}" must be extension-root absolute (leading slash) — see #146`
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, p.slice(1))),
      `worker imports "${p}", which resolves to ${p.slice(1)} from the extension root — no such file`
    );
  });

  const resolved = imported.map((p) => p.slice(1));
  const sources = computeLoadOrder().filter((f) => f.startsWith("pipeline/sources/"));
  assert.ok(resolved.includes("pipeline/registry.js"), "worker must import pipeline/registry.js");
  assert.deepEqual(
    resolved.filter((f) => f.startsWith("pipeline/sources/")).sort(),
    [...sources].sort(),
    "worker's source imports must match the generated sources — run `npm run index`"
  );
});

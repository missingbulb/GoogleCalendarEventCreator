// Top-level "does the extension load?" smoke test — pure Node, no browser.
//
// Simulates how Chrome brings up the extension's entry points so a startup
// failure fails *here* instead of only when a human loads the unpacked
// extension: a bad service-worker importScripts path (#146), a missing/renamed
// injected file, or a syntax error in one. This is the deterministic,
// dependency-light layer; the real-Chrome equivalent (the only thing that
// exercises Chrome's actual extension loader) lives in test/e2e/ and runs in CI.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

// Resolve an importScripts() argument the way a real MV3 service worker does:
// relative to the worker's OWN location, with a leading slash meaning the
// extension root. (Resolving relative to the repo root instead is exactly what
// hid #146.)
function resolveImport(workerPath, spec) {
  return spec.startsWith("/")
    ? path.join(ROOT, spec.slice(1))
    : path.resolve(ROOT, path.dirname(workerPath), spec);
}

// Boot the background service worker in a sandbox with just enough of the
// extension APIs stubbed, recording which event listeners it registers. A
// thrown importScripts (file not found) aborts here just as it aborts the real
// worker — before any listener registers and before chrome.action.setIcon runs.
function bootServiceWorker() {
  const workerPath = manifest.background.service_worker; // e.g. "ui/toolbar-icon.js"
  const registered = [];
  const listener = (name) => ({ addListener: () => registered.push(name) });
  const sandbox = {
    URL,
    fetch: async () => ({ json: async () => ({ allowlist: [], denylist: [] }) }),
    chrome: {
      action: { onClicked: listener("action.onClicked"), setIcon() {} },
      tabs: {
        onActivated: listener("tabs.onActivated"),
        onUpdated: listener("tabs.onUpdated"),
        query: async () => [],
        get: async () => null,
      },
      runtime: {
        onInstalled: listener("runtime.onInstalled"),
        onStartup: listener("runtime.onStartup"),
        getURL: (p) => p,
      },
    },
    importScripts(...specs) {
      for (const spec of specs) {
        vm.runInContext(fs.readFileSync(resolveImport(workerPath, spec), "utf8"), sandbox);
      }
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, workerPath), "utf8"), sandbox);
  return { sandbox, registered };
}

test("the background service worker loads (every importScripts resolves) and builds GCal", () => {
  const { sandbox } = bootServiceWorker(); // throws if any import path is wrong
  assert.ok(sandbox.GCal, "the worker's imports must build the GCal namespace");
  assert.equal(
    typeof sandbox.GCal.isSupportedHost,
    "function",
    "the worker's imports must build GCal.isSupportedHost"
  );
});

test("the service worker registers its tab/runtime listeners after importScripts", () => {
  const { registered } = bootServiceWorker();
  // These run at the bottom of the worker, after importScripts. If an import had
  // thrown, none would register and the toolbar icon would be stuck on the
  // neutral default (the user-visible symptom of #146).
  for (const name of ["tabs.onActivated", "tabs.onUpdated", "runtime.onInstalled", "runtime.onStartup"]) {
    assert.ok(registered.includes(name), `worker must register ${name}`);
  }
});

test("every injected pipeline file parses as a script", () => {
  // load-order.generated.json is exactly what the popup injects into the page;
  // a syntax error in any of them would break the popup's extraction at runtime.
  const files = JSON.parse(fs.readFileSync(path.join(ROOT, "pipeline/load-order.generated.json"), "utf8"));
  assert.ok(files.length, "load order lists no files");
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.doesNotThrow(() => new vm.Script(src, { filename: f }), `${f} must parse as a script`);
  }
});

test("every file the manifest references exists", () => {
  const refs = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons),
  ];
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(ROOT, ref)), `manifest references ${ref}, which does not exist`);
  }
});

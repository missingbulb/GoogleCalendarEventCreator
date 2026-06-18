// Top-level "does the extension load?" smoke test — pure Node, no browser.
//
// Simulates how Chrome brings up the extension's entry points so a startup
// failure fails *here* instead of only when a human loads the unpacked
// extension: a bad service-worker importScripts path (#146), a missing/renamed
// injected file, or a syntax error in one. This is the deterministic,
// dependency-light layer; the real-Chrome equivalent (the only thing that
// exercises Chrome's actual extension loader) lives in test/fullBrowserHeavyTests/ and runs in CI.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

// Boot the background service worker in a sandbox with just enough of the
// extension APIs stubbed, recording which event listeners it registers and
// capturing the install handler so a caller can drive it. A syntax error in the
// worker aborts here just as it aborts the real worker — before any listener
// registers. (The worker no longer importScripts the pipeline: it colors the
// icon via chrome.declarativeContent, so it never loads the sources or builds
// GCal — see ui/toolbar-icon.js.)
function bootServiceWorker() {
  const workerPath = manifest.background.service_worker; // e.g. "ui/toolbar-icon.js"
  const registered = [];
  const handlers = {};
  const listener = (name) => ({ addListener: (fn) => { registered.push(name); handlers[name] = fn; } });
  const addedRules = [];
  const sandbox = {
    URL,
    // The worker fetches the host lists (.json) and the packaged icons (.blob).
    fetch: async (url) => ({
      json: async () => ({ allowlist: [], denylist: ["cnn.com"], supportedDomains: ["meetup.com"] }),
      blob: async () => ({ __path: String(url) }),
    }),
    createImageBitmap: async (blob) => blob,
    OffscreenCanvas: class {
      getContext() {
        return { drawImage(bitmap) { this.__bitmap = bitmap; }, getImageData() { return { __path: this.__bitmap?.__path }; } };
      }
    },
    chrome: {
      action: { onClicked: listener("action.onClicked") },
      declarativeContent: {
        PageStateMatcher: class { constructor(arg) { Object.assign(this, arg); } },
        SetIcon: class { constructor(arg) { Object.assign(this, arg); } },
        onPageChanged: {
          removeRules: (_ids, cb) => cb && cb(),
          addRules: (rules, cb) => { addedRules.push(...rules); cb && cb(); },
        },
      },
      runtime: {
        onInstalled: listener("runtime.onInstalled"),
        onStartup: listener("runtime.onStartup"),
        getURL: (p) => p,
      },
    },
    importScripts() { throw new Error("the worker must not importScripts the pipeline anymore"); },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, workerPath), "utf8"), sandbox);
  return { sandbox, registered, handlers, addedRules };
}

test("the background service worker loads without error", () => {
  assert.doesNotThrow(bootServiceWorker, "the worker's top-level script must parse and run");
});

test("the service worker registers its install/startup listeners", () => {
  const { registered } = bootServiceWorker();
  // The declarativeContent rules are (re)installed on install and on startup;
  // if neither registered, the toolbar icon would never reflect page support.
  for (const name of ["runtime.onInstalled", "runtime.onStartup"]) {
    assert.ok(registered.includes(name), `worker must register ${name}`);
  }
  assert.ok(!registered.includes("tabs.onActivated"), "worker must not read tabs (no 'tabs' permission)");
});

test("installing registers declarativeContent icon rules (no tab URL read)", async () => {
  const { handlers, addedRules } = bootServiceWorker();
  await handlers["runtime.onInstalled"]();
  assert.ok(addedRules.length, "the install handler must add declarativeContent rules");
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

// Integration test: the toolbar worker applies its icon as decoded ImageData,
// never as a path.
//
// chrome.action.setIcon({ path }) is a silent no-op in an MV3 service worker
// (Chromium #1262029 / docs issue #2165): the worker has no document to decode
// the referenced PNG, so the icon stays on the manifest default and never turns
// green. That is the root cause of #204 that survived the earlier fix — making
// the listeners async kept the worker alive, but the setIcon call it was keeping
// alive did nothing. toolbar-badge.test.js only checks which *variant*
// availabilityIcon() picks; this fires the real tab listeners and asserts the
// worker hands setIcon `imageData` decoded from the correct variant, not `path`.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const WORKER = "ui/toolbar-icon.js";
const FALLBACK_LISTS = path.join(ROOT, "pipeline/fallback-lists.json");

// Resolve an importScripts() argument the way a real MV3 service worker does:
// relative to the worker's own location (ui/), leading slash = extension root.
function resolveImport(spec) {
  return spec.startsWith("/")
    ? path.join(ROOT, spec.slice(1))
    : path.resolve(ROOT, path.dirname(WORKER), spec);
}

// Boot the worker with Chrome plus the worker-only image APIs stubbed. The image
// stubs model the real decode chain (fetch -> Blob -> createImageBitmap ->
// OffscreenCanvas -> getImageData) just enough to thread each PNG's path through
// to the resulting ImageData, so a test can read back which icon variant reached
// setIcon. Tab listeners are captured (not discarded) so the test can fire them.
function bootWorker() {
  const listeners = {};
  const setIconCalls = [];
  let activeTab = null;
  const capture = (key) => ({ addListener: (fn) => { listeners[key] = fn; } });
  const sandbox = {
    URL,
    console,
    createImageBitmap: async (blob) => ({ width: 16, height: 16, _path: blob._path }),
    OffscreenCanvas: class {
      constructor(width, height) { this.width = width; this.height = height; }
      getContext() {
        let _path;
        return {
          drawImage: (bitmap) => { _path = bitmap._path; },
          getImageData: (x, y, width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4), _path }),
        };
      }
    },
    fetch: async (url) =>
      url.endsWith(".json")
        ? { json: async () => JSON.parse(fs.readFileSync(FALLBACK_LISTS, "utf8")) }
        : { blob: async () => ({ _path: url }) },
    chrome: {
      action: { onClicked: capture("action.onClicked"), setIcon: async (arg) => { setIconCalls.push(arg); } },
      tabs: {
        onActivated: capture("tabs.onActivated"),
        onUpdated: capture("tabs.onUpdated"),
        query: async () => [],
        get: async () => activeTab,
      },
      runtime: { onInstalled: capture("runtime.onInstalled"), onStartup: capture("runtime.onStartup"), getURL: (p) => p },
    },
    importScripts(...files) {
      for (const file of files) vm.runInContext(fs.readFileSync(resolveImport(file), "utf8"), sandbox);
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, WORKER), "utf8"), sandbox);
  return {
    ready: sandbox.ready,
    setIconCalls,
    fireUpdated: (tabId, tab) => listeners["tabs.onUpdated"](tabId, { status: "complete" }, tab),
    fireActivated: (tab) => { activeTab = tab; return listeners["tabs.onActivated"]({ tabId: tab.id }); },
  };
}

let worker;
before(async () => {
  worker = bootWorker();
  await worker.ready;
});

// host -> the PNG-name fragment identifying its icon variant. "" is the default
// blue tile (its files carry no suffix).
const CASES = [
  { description: "supported host (meetup) → green tile imageData", url: "https://www.meetup.com/g/events/1/", fragment: "-supported" },
  { description: "denied host (barby) → gray tile imageData",      url: "https://barby.co.il/event/1",       fragment: "-denied" },
  { description: "unknown host (example) → blue tile imageData",   url: "https://www.example.com/x",          fragment: "" },
];

for (const { description, url, fragment } of CASES) {
  test(`onUpdated: ${description}`, async () => {
    await worker.fireUpdated(7, { url });
    const call = worker.setIconCalls.at(-1);
    assert.ok(call, "the worker must call chrome.action.setIcon");
    assert.equal(call.path, undefined, "setIcon({ path }) is a no-op in an MV3 service worker — must not be used (#204)");
    assert.ok(call.imageData, "setIcon must be given decoded imageData");
    for (const size of [16, 32, 48, 128]) {
      const img = call.imageData[size];
      assert.ok(img && img.data, `imageData must include a decoded bitmap for size ${size}`);
      if (fragment) {
        assert.ok(img._path.includes(fragment), `size ${size} must be decoded from the ${fragment} PNG`);
      } else {
        assert.ok(
          !img._path.includes("-supported") && !img._path.includes("-denied"),
          `size ${size} must be decoded from the default blue PNG`
        );
      }
    }
  });
}

test("onActivated decodes the active tab's icon to imageData too", async () => {
  await worker.fireActivated({ id: 9, url: "https://www.meetup.com/g/events/2/" });
  const call = worker.setIconCalls.at(-1);
  assert.equal(call.path, undefined, "setIcon({ path }) is a no-op in an MV3 service worker — must not be used (#204)");
  assert.ok(call.imageData[128]._path.includes("-supported"), "the active supported tab must get the green tile imageData");
});

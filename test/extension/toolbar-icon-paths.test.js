// Integration test: the toolbar worker applies the icon with extension-root
// absolute URLs, and wires the tab listeners through to chrome.action.setIcon.
//
// #204 was "the icon never turns green". The cause was a path-resolution bug:
// the worker lives at ui/toolbar-icon.js, so chrome.action.setIcon resolved the
// bare relative path "icons/icon16.png" against ui/ and rejected with "Failed to
// set icon: Failed to fetch" (it was looking for ui/icons/...). The fix is to
// hand setIcon chrome.runtime.getURL("icons/...") — the same extension-root trap
// the importScripts list dodges with leading slashes (#146).
//
// toolbar-icon-state.test.js checks which variant availabilityIcon() picks; this fires
// the real tabs.onUpdated / tabs.onActivated listeners and asserts setIcon is
// called with a `path` map whose entries are extension-root absolute (a relative
// "icons/..." path — the regression — fails this). setIcon is stubbed, as it
// must be without a real browser, so this guards the path SHAPE, not Chrome's
// actual repaint; the real-Chrome check is a manual unpacked load.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const WORKER = "ui/toolbar-icon.js";
const FALLBACK_LISTS = path.join(ROOT, "pipeline/fallback-lists.json");

// Stand in for chrome.runtime.getURL: a real extension-root absolute URL. The
// worker must run every icon path through this; a bare relative path would not
// carry this prefix, which is exactly what the assertions below catch.
const EXT_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop/";

function resolveImport(spec) {
  return spec.startsWith("/")
    ? path.join(ROOT, spec.slice(1))
    : path.resolve(ROOT, path.dirname(WORKER), spec);
}

function bootWorker() {
  const listeners = {};
  const setIconCalls = [];
  let activeTab = null;
  const capture = (key) => ({ addListener: (fn) => { listeners[key] = fn; } });
  const sandbox = {
    URL,
    fetch: async () => ({ json: async () => JSON.parse(fs.readFileSync(FALLBACK_LISTS, "utf8")) }),
    chrome: {
      action: { onClicked: capture("action.onClicked"), setIcon: async (arg) => { setIconCalls.push(arg); } },
      tabs: {
        onActivated: capture("tabs.onActivated"),
        onUpdated: capture("tabs.onUpdated"),
        query: async () => [],
        get: async () => activeTab,
      },
      runtime: { onInstalled: capture("runtime.onInstalled"), onStartup: capture("runtime.onStartup"), getURL: (p) => EXT_ORIGIN + p },
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
  await worker.ready; // denylist loaded, so a denied host resolves to the gray tile
});

const CASES = [
  { description: "supported host (meetup) → green tile", url: "https://www.meetup.com/g/events/1/", suffix: "-supported" },
  { description: "denied host (barby) → gray tile",      url: "https://barby.co.il/event/1",       suffix: "-denied" },
  { description: "unknown host (example) → blue tile",   url: "https://www.example.com/x",          suffix: "" },
];

for (const { description, url, suffix } of CASES) {
  test(`onUpdated applies the ${description} as extension-root URLs`, async () => {
    await worker.fireUpdated(7, { url });
    const call = worker.setIconCalls.at(-1);
    assert.ok(call, "the worker must call chrome.action.setIcon");
    assert.equal(call.tabId, 7, "setIcon must target the updated tab");
    assert.ok(call.path, "setIcon must be given a { size -> URL } path map");
    for (const size of [16, 32, 48, 128]) {
      const url = call.path[size];
      assert.ok(
        url.startsWith(EXT_ORIGIN),
        `size ${size} must be an extension-root URL (got "${url}") — a relative path fails to fetch from the ui/ worker (#204)`
      );
      assert.equal(url, `${EXT_ORIGIN}icons/icon${size}${suffix}.png`, `size ${size} must point at the icon${size}${suffix}.png tile`);
    }
  });
}

test("onActivated applies the active tab's icon as extension-root URLs", async () => {
  await worker.fireActivated({ id: 9, url: "https://www.meetup.com/g/events/2/" });
  const call = worker.setIconCalls.at(-1);
  assert.equal(call.tabId, 9);
  assert.equal(call.path[128], `${EXT_ORIGIN}icons/icon128-supported.png`);
});

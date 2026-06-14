// Integration test: for a given page URL, the toolbar icon's border should
// be green when the page has a site-specific source (pipeline/sources/<site>.js,
// whose `matches` GCal.isSupportedHost checks) and red otherwise.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const WORKER = "ui/toolbar-icon.js";

// Resolve an importScripts() argument the way a real MV3 service worker does:
// relative to the worker's own location (ui/), with a leading slash meaning the
// extension root. Resolving relative to the repo root instead would have masked
// the path regression in #146 — where the worker's relative paths resolved to a
// non-existent ui/pipeline/… and the first importScripts call aborted the whole
// worker before any listener registered.
function resolveImport(spec) {
  return spec.startsWith("/")
    ? path.join(ROOT, spec.slice(1))
    : path.resolve(ROOT, path.dirname(WORKER), spec);
}

// ui/toolbar-icon.js registers chrome listeners and importScripts()'s the
// registry and every source at load time; stub just enough of the extension
// APIs and run them in the same sandbox so iconBorderColor() sees GCal.sources
// exactly as it does in the real extension. A bad importScripts path throws
// here (file not found) just as it aborts the real worker.
function loadIconState() {
  const sandbox = {
    URL,
    chrome: {
      action: { onClicked: { addListener() {} }, setIcon() {} },
      tabs: { onActivated: { addListener() {} }, onUpdated: { addListener() {} }, query: async () => [], get() {} },
      runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    },
    importScripts(...files) {
      for (const file of files) {
        vm.runInContext(fs.readFileSync(resolveImport(file), "utf8"), sandbox);
      }
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, WORKER), "utf8"), sandbox);
  return { iconBorderColor: sandbox.iconBorderColor };
}

const { iconBorderColor } = loadIconState();

const CASES = [
  { url: "https://www.meetup.com/some-group/events/123456/", expected: "green" },
  { url: "https://meetup.com/some-group/events/123456/", expected: "green" },
  { url: "https://www.eventbrite.com/e/some-event-tickets-123456", expected: "green" },
  { url: "https://www.eventbrite.co.uk/e/some-event-tickets-123456", expected: "green" },
  { url: "https://www.facebook.com/events/123456/", expected: "green" },
  { url: "https://www.edfringe.com/tickets/whats-on/some-show", expected: "green" },
  { url: "https://www.ticketmaster.co.il/event/MR330/ALL/iw", expected: "green" },
  { url: "https://www.example.com/some-page", expected: "red" },
  // Regression (#101): an unsupported event site stays red — its popup must
  // not offer event buttons under a red border.
  { url: "https://www.songkick.com/concerts/123456-some-artist", expected: "red" },
  { url: "https://www.google.com/calendar", expected: "red" },
  { url: "chrome://extensions", expected: "red" },
  { url: "", expected: "red" },
];

for (const { url, expected } of CASES) {
  test(`${url || "(empty url)"} -> ${expected}`, () => {
    assert.equal(iconBorderColor(url), expected);
  });
}

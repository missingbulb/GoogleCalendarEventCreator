// Integration test: the toolbar icon reflects whether a page has a
// site-specific source (pipeline/sources/<site>.js, whose `matches`
// GCal.isSupportedHost checks). Supported pages get the green tile icon;
// every other page gets the default blue tile icon.
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
// APIs and run them in the same sandbox so availabilityIcon() sees GCal.sources
// exactly as it does in the real extension. A bad importScripts path throws
// here (file not found) just as it aborts the real worker.
function loadIconState() {
  const sandbox = {
    URL,
    chrome: {
      action: {
        onClicked: { addListener() {} },
        setIcon() {},
      },
      tabs: { onActivated: { addListener() {} }, onUpdated: { addListener() {} }, query: async () => [], get: async () => null },
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
  return { availabilityIcon: sandbox.availabilityIcon };
}

const { availabilityIcon } = loadIconState();

// States: "supported" → green tile, "denied" → gray tile, "unknown" → blue tile.
const CASES = [
  { url: "https://www.meetup.com/some-group/events/123456/",         state: "supported" },
  { url: "https://meetup.com/some-group/events/123456/",             state: "supported" },
  { url: "https://www.eventbrite.com/e/some-event-tickets-123456",   state: "supported" },
  { url: "https://www.eventbrite.co.uk/e/some-event-tickets-123456", state: "supported" },
  { url: "https://www.facebook.com/events/123456/",                  state: "supported" },
  { url: "https://www.edfringe.com/tickets/whats-on/some-show",      state: "supported" },
  { url: "https://www.ticketmaster.co.il/event/MR330/ALL/iw",        state: "supported" },
  // Denylisted hosts → gray tile (generic extraction is noise there).
  { url: "https://www.barby.co.il/event/123",                        state: "denied" },
  { url: "https://barby.co.il/event/123",                            state: "denied" },
  // Everything else → blue tile.
  { url: "https://www.example.com/some-page",                        state: "unknown" },
  // Regression (#101): an unsupported event site shows no indicator — its popup must
  // not offer event buttons for a page we don't actually support.
  { url: "https://www.songkick.com/concerts/123456-some-artist",     state: "unknown" },
  { url: "https://www.google.com/calendar",                          state: "unknown" },
  { url: "chrome://extensions",                                      state: "unknown" },
  { url: "",                                                         state: "unknown" },
];

const STATE_LABEL = { supported: "green tile icon", denied: "gray tile icon", unknown: "blue tile icon" };

for (const { url, state } of CASES) {
  test(`${url || "(empty url)"} -> ${STATE_LABEL[state]}`, () => {
    const icon = availabilityIcon(url);
    if (state === "supported") {
      assert.ok(icon[128].includes("-supported"), "a supported page must use the green (supported) icon");
    } else if (state === "denied") {
      assert.ok(icon[128].includes("-denied"), "a denied page must use the gray (denied) icon");
    } else {
      assert.ok(
        !icon[128].includes("-supported") && !icon[128].includes("-denied"),
        "an unknown page must use the default blue icon"
      );
    }
  });
}

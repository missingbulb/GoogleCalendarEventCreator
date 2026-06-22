// Regression test for issue #48: the pipeline files must not clobber each
// other's contributions to globalThis.GCal regardless of the order they run in.
// registry.js creates GCal.sources, the helpers add the shared toolbox, and the
// sources push their { name, matches, extract } onto GCal.sources; because every
// file augments GCal with Object.assign (rather than replacing it), loading them
// in any order keeps every contribution intact.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const EXT = path.join(ROOT, "extension"); // the extension root; pipeline paths are relative to it

function runInFreshSandbox(files) {
  const sandbox = { document: undefined, URL };
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(EXT, file), "utf8"), sandbox);
  }
  return sandbox;
}

test("a helper loaded before the registry still leaves both intact", () => {
  // Deliberately load a helper before registry.js (the reverse of the load order).
  const sandbox = runInFreshSandbox(["event-extractors/helpers/dom.js", "event-extractors/registry.js"]);

  // registry.js must not have wiped out the helper's contribution...
  assert.equal(typeof sandbox.GCal.clean, "function", "the dom helper survives");
  // ...nor should the helper have prevented registry.js's bootstrap.
  assert.ok(Array.isArray(sandbox.GCal.sources), "GCal.sources is present");
  assert.equal(typeof sandbox.GCal.isSupportedHost, "function");
});

test("a source registers onto GCal.sources whichever order the base files run", () => {
  for (const baseOrder of [
    ["event-extractors/registry.js", "event-extractors/helpers/dom.js"],
    ["event-extractors/helpers/dom.js", "event-extractors/registry.js"],
  ]) {
    const sandbox = runInFreshSandbox(baseOrder);
    assert.doesNotThrow(() => {
      vm.runInContext(
        fs.readFileSync(path.join(EXT, "event-extractors/custom/meetup.js"), "utf8"),
        sandbox
      );
    }, `meetup.js threw with base order ${baseOrder.join(", ")}`);
    const meetup = sandbox.GCal.sources.find((s) => s.name === "meetup");
    assert.ok(meetup, "meetup registered itself onto GCal.sources");
    assert.ok(meetup.matches("www.meetup.com"), "meetup.matches works");
    assert.ok(sandbox.GCal.isSupportedHost("https://www.meetup.com/x/events/1/"), "isSupportedHost sees it");
  }
});

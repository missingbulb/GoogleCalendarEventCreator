// Regression test for issue #48: the extractor files must not clobber each
// other's contributions to globalThis.GCal regardless of the order they run
// in. lib.js builds the shared toolbox and site-hosts.js adds `siteHosts`;
// if lib.js replaced globalThis.GCal wholesale, running site-hosts.js first
// would lose `siteHosts`, and the first site extractor (meetup.js) would
// throw "Cannot read properties of undefined (reading 'find')" at load time.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");

function runInFreshSandbox(files) {
  const sandbox = { document: undefined };
  vm.createContext(sandbox);
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox);
  }
  return sandbox;
}

test("site-hosts.js loaded before lib.js still leaves both intact", () => {
  // Deliberately reverse the EXTRACTOR_FILES order of the first two files.
  const sandbox = runInFreshSandbox([
    "extractors/site-hosts.js",
    "extractors/lib.js",
  ]);

  // lib.js must not have wiped out site-hosts.js's contribution...
  assert.ok(Array.isArray(sandbox.GCal.siteHosts), "GCal.siteHosts survives");
  assert.ok(
    sandbox.GCal.siteHosts.find((s) => s.name === "meetup"),
    "the meetup host entry survives"
  );
  // ...nor should site-hosts.js have prevented lib.js's toolbox from loading.
  assert.ok(Array.isArray(sandbox.GCal.sites), "GCal.sites is present");
  assert.equal(typeof sandbox.GCal.normalizeDateValue, "function");
});

test("meetup.js loads without throwing whichever order the base files run", () => {
  for (const baseOrder of [
    ["extractors/lib.js", "extractors/site-hosts.js"],
    ["extractors/site-hosts.js", "extractors/lib.js"],
  ]) {
    const sandbox = runInFreshSandbox(baseOrder);
    assert.doesNotThrow(() => {
      vm.runInContext(
        fs.readFileSync(path.join(ROOT, "extractors/meetup.js"), "utf8"),
        sandbox
      );
    }, `meetup.js threw with base order ${baseOrder.join(", ")}`);
    const meetup = sandbox.GCal.sites.find((s) => s.name === "meetup");
    assert.ok(meetup, "meetup registered itself onto GCal.sites");
    assert.ok(meetup.matches("www.meetup.com"), "meetup.matches works");
  }
});

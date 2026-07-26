// Drift guard: every per-site extractor's host must be declared in
// fallback-lists.json's `supportedDomains` — so a source can never exist for a
// host we don't claim as supported (the toolbar icon would stay blue while the
// popup showed the source's events, and the auto-extractor triage would accept a
// "please support this site" request for a site we already cover).
//
// ONE DIRECTION ONLY, on purpose. The reverse — "every listed domain has a
// source" — is deliberately NOT asserted: `supportedDomains` is the declaration
// of what we support, and a site whose pages the core generic extractor already
// reads correctly is supported with no per-site file at all. Requiring a source
// per entry is exactly the duplication this guard used to force.
//
// Each source's matches() is a regex, not a domain literal, so we can't read the
// domain out of it — instead we LOAD the real sources (DOM-free, pure Node vm,
// the same way extension-test/integration/extension-loads.test.js boots them: only
// matches() runs here, and that's a pure host check) and run the matchers
// against the list.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const EXT = path.join(ROOT, "extension"); // the extension root; pipeline paths are relative to it

// Load event-extractors/registry.js + every event-extractors/custom/*.js into a
// bare sandbox.
// No DOM is stubbed: a source's extract() touches document, but only its
// matches() runs here, and that's a pure host regex. registry.js sets
// globalThis.GCal (the context's global), each source pushes its matcher onto
// GCal.sources. Returns the assembled GCal.
function loadSources() {
  const sandbox = { URL };
  vm.createContext(sandbox);
  const run = (rel) => vm.runInContext(fs.readFileSync(path.join(EXT, rel), "utf8"), sandbox, { filename: rel });
  run("event-extractors/registry.js");
  const sources = fs
    .readdirSync(path.join(EXT, "event-extractors/custom"))
    .filter((f) => f.endsWith(".js"))
    .sort();
  for (const f of sources) run(`event-extractors/custom/${f}`);
  return sandbox.GCal;
}

const GCal = loadSources();
const { supportedDomains } = JSON.parse(
  fs.readFileSync(path.join(EXT, "fallback-lists.json"), "utf8")
);

test("supportedDomains is a non-empty array", () => {
  assert.ok(
    Array.isArray(supportedDomains) && supportedDomains.length > 0,
    "extension/fallback-lists.json must define a non-empty supportedDomains array"
  );
});

test("every source is represented by a supportedDomains entry (none missing)", () => {
  for (const s of GCal.sources) {
    assert.ok(
      supportedDomains.some((domain) => s.matches(domain)),
      `source "${s.name}" matches none of supportedDomains — add a domain it covers ` +
        `to extension/fallback-lists.json, or delete the source if we don't claim its host`
    );
  }
});

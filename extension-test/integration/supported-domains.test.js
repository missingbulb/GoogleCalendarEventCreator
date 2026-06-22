// Drift guard: config.js's supportedDomains (fallback-lists.json) — the
// static list the auto-extractor triage uses to skip a request for a host we
// already cover — must stay in sync with the actual per-site sources. The
// runtime never relies on this list (it derives "supported" straight from the
// sources via GCal.isSupportedHost); the list exists only so the triage can
// decide without loading the pipeline. This test stops the two from disagreeing.
//
// Each source's matches() is a regex, not a domain literal, so we can't read the
// domain out of it — instead we LOAD the real sources (DOM-free, pure Node vm,
// the same way extension-test/integration/extension-loads.test.js boots them: only
// matches() runs here, and that's a pure host check) and run the matchers
// against the list, both directions:
//   - every listed domain is matched by some source  (no stale/orphan entries);
//   - every source matches some listed domain         (no source left off).
// So a new source added without a supportedDomains entry, or an entry left
// behind after a source is removed/renamed, fails here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const EXT = path.join(ROOT, "extension"); // the extension root; pipeline paths are relative to it

// Load event-extractors/registry.js + every event-extractors/custom/*.js into a bare sandbox.
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

test("every supportedDomains entry is matched by a real source (no orphans)", () => {
  for (const domain of supportedDomains) {
    assert.ok(
      GCal.sources.some((s) => s.matches(domain)),
      `supportedDomains lists "${domain}", but no source's matches() accepts it — ` +
        `remove the stale entry from extension/fallback-lists.json or fix the host`
    );
  }
});

test("every source is represented by a supportedDomains entry (none missing)", () => {
  for (const s of GCal.sources) {
    assert.ok(
      supportedDomains.some((domain) => s.matches(domain)),
      `source "${s.name}" matches none of supportedDomains — add a domain it covers ` +
        `to extension/fallback-lists.json so the triage can skip requests for it`
    );
  }
});

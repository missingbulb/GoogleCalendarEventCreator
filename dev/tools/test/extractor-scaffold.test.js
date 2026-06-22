// Unit tests for the deterministic Phase-1 scaffolding the auto-implement-
// extractor workflow does before the agent runs: the source stub
// (dev/tools/new-extractors-creation/scaffold-source.js) and the supportedDomains insert
// (dev/tools/new-extractors-creation/add-supported-domain.js). Pure-function level; the CLIs that
// wrap them just do file I/O.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { sourceStub } = require("../new-extractors-creation/scaffold-source");
const { caseStub } = require("../new-extractors-creation/scaffold-case");
const { withDomain } = require("../new-extractors-creation/add-supported-domain");

const URL = "https://www.axs.com/event/629455-volleyball-tickets";

test("sourceStub fills name, the matches() regex, host and cache path", () => {
  const stub = sourceStub(URL);
  assert.match(stub, /name: "axs"/);
  assert.match(stub, /matches: \(host\) => \/\(\^\|\\\.\)axs\\\.com\$\/\.test\(host\)/);
  assert.match(stub, /axs\.com event pages: https:\/\/www\.axs\.com/);
  assert.match(stub, /data\/axs\.html/); // points the agent at the cached page
});

test("the scaffolded stub is loadable and registers a working matcher", () => {
  // Boot it like the extension does: registry.js sets GCal, the source pushes
  // its matcher. Only matches() is exercised (a pure host check).
  const fs = require("node:fs");
  const path = require("node:path");
  const ROOT = path.join(__dirname, "..", "..", "..");
  const sandbox = { URL, document: { querySelector: () => null } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "extension/event-extractors/registry.js"), "utf8"), sandbox);
  vm.runInContext(sourceStub(URL), sandbox);
  const source = sandbox.GCal.sources.find((s) => s.name === "axs");
  assert.ok(source, "stub registered a source named axs");
  assert.ok(source.matches("axs.com"));
  assert.ok(source.matches("tickets.axs.com"));
  assert.ok(!source.matches("example.com"));
});

test("caseStub is a valid placeholder: empty events, host in the description", () => {
  const stub = caseStub("axs.com");
  assert.deepEqual(stub.expected, { events: [] }); // empty = "not filled yet" (bail signal)
  assert.match(stub.description, /axs\.com/);
  JSON.parse(JSON.stringify(stub)); // round-trips as JSON
});

test("withDomain adds, sorts, and de-duplicates", () => {
  assert.deepEqual(withDomain(["b.com", "a.com"], "c.com"), ["a.com", "b.com", "c.com"]);
  assert.deepEqual(withDomain(["a.com"], "a.com"), ["a.com"]); // idempotent
  assert.deepEqual(withDomain([], "a.com"), ["a.com"]);
  assert.deepEqual(withDomain(undefined, "a.com"), ["a.com"]); // tolerates missing list
});

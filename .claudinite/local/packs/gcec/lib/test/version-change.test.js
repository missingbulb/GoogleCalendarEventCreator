// The version half of the unattended runs' scope (lib/version-change.mjs),
// judged over synthetic branches with the vendored release actions' own version
// helpers.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const ROOT = path.join(__dirname, "../../../../../..");

const load = async () => {
  const { judgeVersionChange } = await import("../version-change.mjs");
  const { nextVersion, readVersion } = await import(path.join(ROOT, ".github/actions/bump-extension-patch/bump.mjs"));
  return (changed, manifest, pkg) => judgeVersionChange({
    changed,
    roots: ["extension"],
    records: [
      { path: "extension/manifest.json", ...manifest },
      { path: "package.json", ...pkg },
    ],
    nextVersion,
    readVersion,
  });
};

const manifest = (v, extra = "") => `{\n  "manifest_version": 3,\n  "version": "${v}",${extra}\n  "name": "x"\n}\n`;
const pkg = (v) => `{\n  "name": "x",\n  "version": "${v}"\n}\n`;
const same = (text) => ({ base: text, head: text });
const SOURCE = "extension/event-extractors/custom/dice.js";

test("a shipped change with the patch raised once in both records passes", async () => {
  const judge = await load();
  const changed = [SOURCE, "extension/manifest.json", "package.json"];
  assert.deepEqual(judge(changed, { base: manifest("1.5.8"), head: manifest("1.5.9") }, { base: pkg("1.5.8"), head: pkg("1.5.9") }), []);
});

test("a shipped change that leaves the version alone fails, naming the bump", async () => {
  const judge = await load();
  const problems = judge([SOURCE], same(manifest("1.5.8")), same(pkg("1.5.8")));
  assert.equal(problems.length, 2);
  assert.match(problems[0], /extension\/manifest\.json is at 1\.5\.8, but this branch ships extension\/event-extractors\/custom\/dice\.js — raise it once, 1\.5\.8 → 1\.5\.9/);
});

test("a double bump, or one record left behind, fails", async () => {
  const judge = await load();
  assert.equal(judge([SOURCE], { base: manifest("1.5.8"), head: manifest("1.5.10") }, { base: pkg("1.5.8"), head: pkg("1.5.10") }).length, 2);
  const lagging = judge([SOURCE], { base: manifest("1.5.8"), head: manifest("1.5.9") }, same(pkg("1.5.8")));
  assert.equal(lagging.length, 1);
  assert.match(lagging[0], /^package\.json is at 1\.5\.8/);
});

test("a manifest edit beyond the version fails even with a correct bump", async () => {
  const judge = await load();
  const problems = judge([SOURCE], { base: manifest("1.5.8"), head: manifest("1.5.9", '\n  "permissions": ["tabs"],') }, { base: pkg("1.5.8"), head: pkg("1.5.9") });
  assert.deepEqual(problems, ['extension/manifest.json changes beyond its "version" field — only the version may change here']);
});

test("a branch that ships nothing must not bump", async () => {
  const judge = await load();
  const caseOnly = ["dev/requirements/extractor/expected/meetup-berlin.json"];
  assert.deepEqual(judge(caseOnly, same(manifest("1.5.8")), same(pkg("1.5.8"))), []);
  const problems = judge(caseOnly, { base: manifest("1.5.8"), head: manifest("1.5.9") }, { base: pkg("1.5.8"), head: pkg("1.5.9") });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /ships nothing/);
});

test("a record added or deleted is refused", async () => {
  const judge = await load();
  assert.match(judge([SOURCE], { base: manifest("1.5.8"), head: null }, same(pkg("1.5.8")))[0], /extension\/manifest\.json is deleted/);
});

#!/usr/bin/env node
// Bumps the extension's PATCH version (x.y.Z -> x.y.Z+1) across the three files
// that must stay in sync — extension/manifest.json, package.json, and the
// version-sync uber-test constant — and prints the new version to stdout.
//
//   node dev/build/release/bump-patch-version.js <repo-root>
//
// Used by the daily auto-release workflow (.github/workflows/daily-release.yml),
// which needs a version strictly higher than the live store one before it can
// upload. Deliberate human bumps (the "bump version" instruction, default
// minor) are unchanged — this is only the automated daily patch step.
//
// manifest.json and package.json are edited by replacing the exact
// `"version": "<old>"` token (required to appear exactly once per file, as the
// version-sync uber test enforces) rather than JSON.parse/stringify, so the
// files' formatting is untouched. version-sync.json's `value` holds that same
// token as a string, and is rewritten as JSON (it is 2-space formatted).

const fs = require("fs");
const path = require("path");

const VERSION_FILES = ["extension/manifest.json", "package.json"];
const SYNC_FILE = "dev/procedures/test/uber/shared_constants/version-sync.json";

function fail(msg) {
  console.error(`bump-patch-version: ${msg}`);
  process.exit(1);
}

const root = process.argv[2];
if (!root) fail("usage: node dev/build/release/bump-patch-version.js <repo-root>");

const current = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8")).version;
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!match) fail(`current version '${current}' is not X.Y.Z`);
const next = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;

const oldToken = `"version": "${current}"`;
const newToken = `"version": "${next}"`;

// Validate every file before writing any, so a failure never leaves the three
// files disagreeing (a half-bumped tree would trip the version-sync uber test).
const writes = [];
for (const file of VERSION_FILES) {
  const full = path.join(root, file);
  const text = fs.readFileSync(full, "utf8");
  const occurrences = text.split(oldToken).length - 1;
  if (occurrences !== 1) fail(`expected exactly one ${oldToken} in ${file}, found ${occurrences}`);
  writes.push([full, text.replace(oldToken, newToken)]);
}

const syncFull = path.join(root, SYNC_FILE);
const sync = JSON.parse(fs.readFileSync(syncFull, "utf8"));
if (sync.value !== oldToken) fail(`${SYNC_FILE} value '${sync.value}' does not match the current version token`);
sync.value = newToken;
writes.push([syncFull, JSON.stringify(sync, null, 2) + "\n"]);

for (const [full, text] of writes) fs.writeFileSync(full, text);

console.log(next);

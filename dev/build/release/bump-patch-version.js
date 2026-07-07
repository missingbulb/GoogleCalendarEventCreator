#!/usr/bin/env node
// Bumps the extension's PATCH version (x.y.Z -> x.y.Z+1) across the two files
// that must stay in sync — extension/manifest.json and package.json — and prints
// the new version to stdout.
//
//   node dev/build/release/bump-patch-version.js <repo-root>
//
// Used by the daily auto-release workflow (.github/workflows/daily-release.yml),
// which needs a version strictly higher than the live store one before it can
// upload. Deliberate human bumps (the "bump version" instruction, default
// minor) are unchanged — this is only the automated daily patch step.
//
// Each file is edited by replacing the exact `"version": "<old>"` token (required
// to appear exactly once per file, as the shared-constants check enforces) rather
// than JSON.parse/stringify, so the file's formatting is untouched.

const fs = require("fs");
const path = require("path");

const VERSION_FILES = ["extension/manifest.json", "package.json"];

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

// Validate every file before writing any, so a failure never leaves the files
// disagreeing (a half-bumped tree would trip the shared-constants check).
const writes = [];
for (const file of VERSION_FILES) {
  const full = path.join(root, file);
  const text = fs.readFileSync(full, "utf8");
  const occurrences = text.split(oldToken).length - 1;
  if (occurrences !== 1) fail(`expected exactly one ${oldToken} in ${file}, found ${occurrences}`);
  writes.push([full, text.replace(oldToken, newToken)]);
}

for (const [full, text] of writes) fs.writeFileSync(full, text);

console.log(next);

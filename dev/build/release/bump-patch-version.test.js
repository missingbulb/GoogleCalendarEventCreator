// Pins the daily-release patch bumper against a scratch copy of the three real
// version-bearing files: it must raise exactly the patch digit, keep all three
// files in sync (the version-sync uber test's invariant), preserve the JSON
// files' formatting, and refuse a tree where the version token isn't where it
// expects it (rather than half-bumping).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");
const SCRIPT = path.join(__dirname, "bump-patch-version.js");
const FILES = [
  "extension/manifest.json",
  "package.json",
  "dev/procedures/test/uber/shared_constants/version-sync.json",
];

// A scratch repo root holding copies of the real three files, so the test
// exercises the exact content the script will meet without touching the repo.
function scratchRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bump-test-"));
  for (const f of FILES) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(root, f));
  }
  return root;
}

const bump = (root) => execFileSync("node", [SCRIPT, root], { encoding: "utf8" }).trim();

test("bumps the patch digit in all three files and prints the new version", () => {
  const root = scratchRoot();
  const before = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8")).version;
  const [major, minor, patch] = before.split(".").map(Number);

  const printed = bump(root);
  const expected = `${major}.${minor}.${patch + 1}`;
  assert.equal(printed, expected);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8"));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const sync = JSON.parse(fs.readFileSync(path.join(root, FILES[2]), "utf8"));
  assert.equal(manifest.version, expected);
  assert.equal(pkg.version, expected);
  assert.equal(sync.value, `"version": "${expected}"`);
});

test("only the version line changes in manifest.json and package.json", () => {
  const root = scratchRoot();
  const before = FILES.slice(0, 2).map((f) => fs.readFileSync(path.join(root, f), "utf8"));
  const printed = bump(root);
  FILES.slice(0, 2).forEach((f, i) => {
    const after = fs.readFileSync(path.join(root, f), "utf8");
    const expected = before[i].replace(/"version": "[^"]+"/, `"version": "${printed}"`);
    assert.equal(after, expected, `${f} changed beyond the version token`);
  });
});

test("fails without editing anything when the sync constant disagrees", () => {
  const root = scratchRoot();
  const syncPath = path.join(root, FILES[2]);
  const drifted = JSON.parse(fs.readFileSync(syncPath, "utf8"));
  drifted.value = '"version": "0.0.0"';
  fs.writeFileSync(syncPath, JSON.stringify(drifted, null, 2) + "\n");

  const manifestBefore = fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8");
  assert.throws(() => bump(root), /does not match the current version token/);
  // Validate-before-write: the failure must not have half-bumped the tree.
  assert.equal(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8"), manifestBefore);
});

test("requires the repo-root argument", () => {
  assert.throws(() => execFileSync("node", [SCRIPT], { encoding: "utf8" }), /usage:/);
});

#!/usr/bin/env node
// Builds the shippable extension zip — the artifact uploaded to the Chrome Web
// Store and attached to GitHub Releases for "Load unpacked" testing.
//
//   node tools/build-zip.js        ->  dist/google-calendar-event-creator.zip
//
// The zip name is stable (not version-stamped) so a GitHub Release can serve it
// at a permanent URL:
//   https://github.com/missingbulb/GoogleCalendarEventCreator/releases/latest/download/google-calendar-event-creator.zip
// The version it contains is manifest.json's `version`, printed below.
//
// Contents come from tools/shipping-files.js (the single source of truth), so
// the zip and the manifest can't drift. Uses the system `zip` (preinstalled on
// the GitHub Ubuntu runners and on macOS/Linux) to avoid adding a runtime dep.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { SHIPPING_PATHS } = require("./shipping-files");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "dist");
const OUT_NAME = "google-calendar-event-creator.zip";
const OUT_PATH = path.join(OUT_DIR, OUT_NAME);

function fail(msg) {
  console.error(`build-zip: ${msg}`);
  process.exit(1);
}

// Every shipping path must exist, so a renamed/removed runtime file is a loud
// build failure rather than a silently incomplete package.
const missing = SHIPPING_PATHS.filter((p) => !fs.existsSync(path.join(ROOT, p)));
if (missing.length) fail(`shipping path(s) not found: ${missing.join(", ")}`);

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).version;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(OUT_PATH, { force: true });

try {
  // `zip` paths are relative to ROOT so the archive has no leading repo dir —
  // it unzips straight to a folder containing manifest.json. -r recurses into
  // the listed directories; -X drops extra file attributes for a tidy archive.
  execFileSync("zip", ["-rX", OUT_PATH, ...SHIPPING_PATHS], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch (e) {
  if (e.code === "ENOENT") fail("`zip` command not found — install zip (e.g. `apt-get install zip`).");
  fail(`zip failed: ${e.message}`);
}

const sizeKb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`Built ${path.relative(ROOT, OUT_PATH)} (v${version}, ${sizeKb} KB)`);

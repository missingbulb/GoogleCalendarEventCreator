#!/usr/bin/env node
// Builds the shippable extension zip — the artifact uploaded to the Chrome Web
// Store and attached to GitHub Releases for "Load unpacked" testing.
//
//   node dev/release/build-zip.js              ->  dist/google-calendar-event-creator.zip
//
// The zip name is stable (not version-stamped) so a GitHub Release can serve it
// at a permanent URL:
//   https://github.com/missingbulb/GoogleCalendarEventCreator/releases/latest/download/google-calendar-event-creator.zip
// The version it contains is manifest.json's `version`, printed below.
//
// Contents come from dev/release/shipping-files.js (the single source of truth), so
// the zip and the manifest can't drift. Uses the system `zip` (preinstalled on
// the GitHub Ubuntu runners and on macOS/Linux) to avoid adding a runtime dep.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { EXTENSION_DIR, SHIPPING_PATHS, SHIPPING_EXCLUDES } = require("./shipping-files");

const ROOT = path.join(__dirname, "..", "..");
// The extension root — the folder Chrome loads. Shipping paths are relative to
// it, and the zip is built from inside it, so the archive has manifest.json at
// its top (no leading repo or extension/ dir).
const EXT = path.join(ROOT, EXTENSION_DIR);
const OUT_DIR = path.join(ROOT, "dist");
const OUT_NAME = "google-calendar-event-creator.zip";
const OUT_PATH = path.join(OUT_DIR, OUT_NAME);

function fail(msg) {
  console.error(`build-zip: ${msg}`);
  process.exit(1);
}

// Every shipping path must exist, so a renamed/removed runtime file is a loud
// build failure rather than a silently incomplete package.
const missing = SHIPPING_PATHS.filter((p) => !fs.existsSync(path.join(EXT, p)));
if (missing.length) fail(`shipping path(s) not found: ${missing.join(", ")}`);

const version = JSON.parse(fs.readFileSync(path.join(EXT, "manifest.json"), "utf8")).version;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.rmSync(OUT_PATH, { force: true });

try {
  // `zip` runs with cwd inside the extension root and paths relative to it, so
  // the archive has no leading repo/extension dir — it unzips straight to a
  // folder containing manifest.json. -r recurses into the listed directories;
  // -X drops extra file attributes for a tidy archive. -x drops dev-only files
  // that live under a shipped directory.
  const args = ["-rX", OUT_PATH, ...SHIPPING_PATHS];
  if (SHIPPING_EXCLUDES.length) args.push("-x", ...SHIPPING_EXCLUDES);
  execFileSync("zip", args, { cwd: EXT, stdio: ["ignore", "ignore", "inherit"] });
} catch (e) {
  if (e.code === "ENOENT") fail("`zip` command not found — install zip (e.g. `apt-get install zip`).");
  fail(`zip failed: ${e.message}`);
}

const sizeKb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`Built ${path.relative(ROOT, OUT_PATH)} (v${version}, ${sizeKb} KB)`);

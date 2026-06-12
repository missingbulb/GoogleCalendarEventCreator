#!/usr/bin/env node
// Refresh the committed HTML snapshots that the live tests assert against
// (test/integration/snapshots/<case>.html + test/integration/snapshots/manifest.json).
//
// A snapshot is refreshed when any of these hold:
//   - --force was given
//   - the snapshot file or its manifest entry is missing
//   - the case's URL changed since the snapshot was fetched
//   - the snapshot is older than 24 hours
//
// A failed fetch KEEPS the previous snapshot and only warns — a site outage
// or bot-blocking must not break the pipeline. It is an error only when a
// case ends up with no snapshot at all.
//
// Usage:
//   node test/integration/refresh-snapshots.js            # refresh stale snapshots only
//   node test/integration/refresh-snapshots.js --force    # refresh everything
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CASES_DIR = path.join(__dirname, "cases");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const MANIFEST_PATH = path.join(SNAPSHOTS_DIR, "manifest.json");

const MAX_AGE_HOURS = 24;
const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 20_000;
// Event sites tend to reject clients that don't look like a browser.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw new Error(`${lastError.message} (after ${FETCH_ATTEMPTS} attempts)`);
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function needsRefresh(name, url, manifest, force) {
  if (force) return "forced";
  const entry = manifest[name];
  if (!entry || !fs.existsSync(path.join(SNAPSHOTS_DIR, `${name}.html`))) return "missing";
  if (entry.url !== url) return "case URL changed";
  const ageHours = (Date.now() - Date.parse(entry.fetchedAt)) / 3_600_000;
  if (!(ageHours < MAX_AGE_HOURS)) return `${Math.round(ageHours)}h old`;
  return null;
}

async function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const manifest = readManifest();
  let missingSnapshots = 0;

  const caseFiles = fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  for (const file of caseFiles) {
    const name = path.basename(file, ".json");
    const { url } = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));
    const reason = needsRefresh(name, url, manifest, force);

    if (!reason) {
      console.log(`${name}: fresh, skipping`);
      continue;
    }

    try {
      const html = await fetchPage(url);
      fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${name}.html`), html);
      manifest[name] = { url, fetchedAt: new Date().toISOString() };
      console.log(`${name}: refreshed (${reason})`);
    } catch (err) {
      if (fs.existsSync(path.join(SNAPSHOTS_DIR, `${name}.html`)) && manifest[name]) {
        console.warn(`${name}: fetch failed (${err.message}) — keeping snapshot from ${manifest[name].fetchedAt}`);
      } else {
        console.error(`${name}: fetch failed (${err.message}) and no previous snapshot exists`);
        missingSnapshots++;
      }
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  if (missingSnapshots > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// Refresh the committed cached HTML files that the live tests assert against
// (data/<case>.html + data/urlsToCacheLocally.json).
//
// A cached HTML file is refreshed when any of these hold:
//   - --force was given
//   - the cached HTML file or its urlsToCacheLocally entry is missing
//   - the case's URL changed since the file was fetched
//   - the cached HTML file is older than 24 hours
//
// A failed fetch KEEPS the previous cached HTML file and only warns — a site
// outage or bot-blocking must not break the pipeline. It is an error only when
// a case ends up with no cached HTML file at all.
//
// Usage:
//   node test/integration/refresh-cache.js            # refresh stale cached HTML files only
//   node test/integration/refresh-cache.js --force    # refresh everything
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const CASES_DIR = path.join(__dirname, "cases");
const URLS_PATH = path.join(DATA_DIR, "urlsToCacheLocally.json");

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

function readCacheIndex() {
  if (!fs.existsSync(URLS_PATH)) return {};
  return JSON.parse(fs.readFileSync(URLS_PATH, "utf8"));
}

function needsRefresh(name, url, cacheIndex, force) {
  if (force) return "forced";
  const entry = cacheIndex[name];
  if (!entry || !fs.existsSync(path.join(DATA_DIR, `${name}.html`))) return "missing";
  if (entry.url !== url) return "case URL changed";
  const ageHours = (Date.now() - Date.parse(entry.fetchedAt)) / 3_600_000;
  if (!(ageHours < MAX_AGE_HOURS)) return `${Math.round(ageHours)}h old`;
  return null;
}

async function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const cacheIndex = readCacheIndex();
  let missingFiles = 0;

  const caseFiles = fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  // What to fetch: every case file's URL, plus any urlsToCacheLocally entry
  // that has no case file yet. The latter lets you register an entry
  // (name + url) and fetch it *before* writing its case — so you can record the
  // HTML first, then fill the case's `expected` against the committed file.
  const targets = new Map();
  for (const file of caseFiles) {
    const name = path.basename(file, ".json");
    const { url } = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));
    targets.set(name, url);
  }
  for (const [name, entry] of Object.entries(cacheIndex)) {
    if (!targets.has(name) && entry && entry.url) targets.set(name, entry.url);
  }

  for (const [name, url] of targets) {
    const reason = needsRefresh(name, url, cacheIndex, force);

    if (!reason) {
      console.log(`${name}: fresh, skipping`);
      continue;
    }

    try {
      const html = await fetchPage(url);
      fs.writeFileSync(path.join(DATA_DIR, `${name}.html`), html);
      cacheIndex[name] = { url, fetchedAt: new Date().toISOString() };
      console.log(`${name}: refreshed (${reason})`);
    } catch (err) {
      if (fs.existsSync(path.join(DATA_DIR, `${name}.html`)) && cacheIndex[name]) {
        console.warn(`${name}: fetch failed (${err.message}) — keeping cached HTML from ${cacheIndex[name].fetchedAt}`);
      } else {
        console.error(`${name}: fetch failed (${err.message}) and no previous cached HTML exists`);
        missingFiles++;
      }
    }
  }

  fs.writeFileSync(URLS_PATH, JSON.stringify(cacheIndex, null, 2) + "\n");
  if (missingFiles > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

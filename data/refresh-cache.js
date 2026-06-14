#!/usr/bin/env node
// Refresh the committed cached HTML files that the live tests assert against.
//
// A cached HTML file is fetched when:
//   - --force was given, OR
//   - data/<name>.html is missing or empty (zero bytes)
//
// URL sources:
//   - test/integration/cases/<name>.json  ("url" field) — primary, for landed cases
//   - data/<name>.url                     — plain-text URL for the pre-case flow:
//     commit an empty data/<name>.html + data/<name>.url, run the Refresh
//     workflow to fill the HTML, then add the case file once you can read
//     the expected values off the committed HTML.
//
// A failed fetch KEEPS the previous cached HTML file and only warns — a site
// outage or bot-blocking must not break the pipeline. It is an error only when
// a case ends up with no cached HTML file at all.
//
// Usage:
//   node data/refresh-cache.js            # fetch missing/empty cached HTML files only
//   node data/refresh-cache.js --force    # re-fetch everything
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = __dirname;
const CASES_DIR = path.join(__dirname, "..", "test", "integration", "cases");

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

function isEmptyOrMissing(filePath) {
  try {
    return fs.statSync(filePath).size === 0;
  } catch {
    return true;
  }
}

function needsRefresh(name, force) {
  if (force) return "forced";
  const htmlPath = path.join(DATA_DIR, `${name}.html`);
  if (!fs.existsSync(htmlPath)) return "missing";
  if (fs.statSync(htmlPath).size === 0) return "empty";
  return null;
}

async function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let missingFiles = 0;

  // Collect targets. Case files take priority over .url files (same name).
  const targets = new Map();

  // data/<name>.url: URL-only files for the pre-case flow (no case file yet)
  for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".url")).sort()) {
    const name = path.basename(file, ".url");
    const url = fs.readFileSync(path.join(DATA_DIR, file), "utf8").trim();
    if (url) targets.set(name, url);
  }

  // test/integration/cases/<name>.json: landed cases override .url files
  for (const file of fs.readdirSync(CASES_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const name = path.basename(file, ".json");
    const { url } = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));
    targets.set(name, url);
  }

  for (const [name, url] of targets) {
    const reason = needsRefresh(name, force);

    if (!reason) {
      console.log(`${name}: already cached, skipping`);
      continue;
    }

    const htmlPath = path.join(DATA_DIR, `${name}.html`);
    try {
      const html = await fetchPage(url);
      fs.writeFileSync(htmlPath, html);
      console.log(`${name}: refreshed (${reason})`);
    } catch (err) {
      if (!isEmptyOrMissing(htmlPath)) {
        console.warn(`${name}: fetch failed (${err.message}) — keeping existing cached HTML`);
      } else {
        console.error(`${name}: fetch failed (${err.message}) and no previous cached HTML exists`);
        missingFiles++;
      }
    }
  }

  if (missingFiles > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

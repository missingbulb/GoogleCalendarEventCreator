#!/usr/bin/env node
// Refresh the committed cached HTML files that the live tests assert against.
//
// Each cached page is described by two per-case files in data/:
//   - data/<name>.url   — plain text, the source URL (single source of truth;
//                         live.test.js reads it too, to fetch and to set the
//                         DOM's origin).
//   - data/<name>.html  — the recorded HTML the live tests assert against.
//
// A cached HTML file is fetched when:
//   - --force was given, OR
//   - data/<name>.html is missing or empty (zero bytes).
// A committed empty (zero-byte) data/<name>.html is the "fetch me" signal: pair
// it with a data/<name>.url and the next refresh fills it in. That's also the
// pre-case flow — record the HTML first, then add test/integration/cases/<name>.json
// once you can read the expected values off the committed file.
//
// A failed fetch KEEPS the previous cached HTML file and only warns — a site
// outage or bot-blocking must not break the pipeline. It is an error only when
// a page ends up with no cached HTML file at all.
//
// Usage:
//   node data/refresh-cache.js            # fetch missing/empty cached HTML files only
//   node data/refresh-cache.js --force    # re-fetch everything
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = __dirname;

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

async function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let missingFiles = 0;

  const urlFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".url"))
    .sort();

  for (const file of urlFiles) {
    const name = path.basename(file, ".url");
    const url = fs.readFileSync(path.join(DATA_DIR, file), "utf8").trim();
    if (!url) {
      console.warn(`${name}: ${file} is empty — skipping`);
      continue;
    }

    const htmlPath = path.join(DATA_DIR, `${name}.html`);
    const reason = force ? "forced" : isEmptyOrMissing(htmlPath) ? "missing/empty" : null;

    if (!reason) {
      console.log(`${name}: already cached, skipping`);
      continue;
    }

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

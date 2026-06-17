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
// pre-case flow — record the HTML first, then add test/extractors/custom/<name>.json
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
// The fetch itself (browser headers, retries, timeout) lives in fetch-page.js
// so tools/new-extractors-creation/probe-url.js can fetch identically — see that file's header.
const { fetchPage } = require("./fetch-page");

const DATA_DIR = __dirname;

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

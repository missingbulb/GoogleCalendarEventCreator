#!/usr/bin/env node
// Refresh the committed cached HTML files that the live tests assert against.
//
// Each cached page is described by two per-case files in data/:
//   - executable-requirements/data/<name>.url   — plain text, the source URL (single source of truth;
//                         live.test.js reads it too, to fetch and to set the
//                         DOM's origin).
//   - executable-requirements/data/<name>.html  — the recorded HTML the live tests assert against.
//
// A cached HTML file is fetched when:
//   - --force was given, OR
//   - executable-requirements/data/<name>.html is missing or empty (zero bytes).
// A committed empty (zero-byte) executable-requirements/data/<name>.html is the "fetch me" signal: pair
// it with a executable-requirements/data/<name>.url and the next refresh fills it in. That's also the
// pre-case flow — record the HTML first, then add executable-requirements/extractors/custom/<name>.json
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
// A plain fetch can return a data-less JS single-page-app shell (a real 2xx with
// nothing for a static extractor — #277). When spa-shell.js detects exactly that,
// re-record through a headless browser (render-page.js) so the rendered HTML is
// cached instead. CI-only: without a Chrome binary the render step no-ops and we
// keep the static HTML. See issue #310.
const { shouldRender, hasExtractableData } = require("./spa-shell");
const { renderPage } = require("./render-page");

const DATA_DIR = path.join(__dirname, "..", "executable-requirements", "data");

function isEmptyOrMissing(filePath) {
  try {
    return fs.statSync(filePath).size === 0;
  } catch {
    return true;
  }
}

// If the fetched HTML is a data-less SPA shell, try to render it with a headless
// browser and use the rendered HTML only if it now has extractable data — so a
// render can only help, never replace a known shell with a differently-broken
// one. Any render failure (including no Chrome) keeps the static HTML.
async function maybeRender(name, url, html) {
  if (!shouldRender(html)) return html;
  try {
    const rendered = await renderPage(url);
    if (hasExtractableData(rendered)) {
      console.log(`${name}: SPA shell rendered via headless Chrome`);
      return rendered;
    }
    console.warn(`${name}: rendered but still no extractable data — keeping static HTML`);
  } catch (err) {
    const why =
      err.code === "NO_CHROME"
        ? "no Chrome available (set CHROME_PATH)"
        : `render failed (${err.message})`;
    console.warn(`${name}: SPA shell detected but ${why} — keeping static HTML`);
  }
  return html;
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
      let html = await fetchPage(url);
      html = await maybeRender(name, url, html);
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

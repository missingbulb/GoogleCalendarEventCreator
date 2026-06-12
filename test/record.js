#!/usr/bin/env node
// Snapshot the live page for one or more test cases into test/fixtures/,
// so the e2e tests stay fast, deterministic, and offline.
//
// Usage:
//   node test/record.js test/cases/my-new-case.json [more-case-files...]
//   node test/record.js --all          # (re-)record every case
//
// Run this on a machine with normal internet access when adding a case or
// when a site's markup has changed. Review the diff before committing.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CASES_DIR = path.join(__dirname, "cases");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

// Some event sites block obvious non-browser clients.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function recordCase(caseFile) {
  const testCase = JSON.parse(fs.readFileSync(caseFile, "utf8"));
  if (!testCase.url) throw new Error(`${caseFile}: missing "url"`);

  const fixtureName = testCase.fixture || path.basename(caseFile).replace(/\.json$/, ".html");
  process.stdout.write(`${testCase.url}\n  -> fixtures/${fixtureName} ... `);

  const res = await fetch(testCase.url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${testCase.url}`);

  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(path.join(FIXTURES_DIR, fixtureName), await res.text());
  process.stdout.write("saved\n");
}

async function main() {
  let files = process.argv.slice(2);
  if (files[0] === "--all") {
    files = fs
      .readdirSync(CASES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(CASES_DIR, f));
  }
  if (files.length === 0) {
    console.error("Usage: node test/record.js <case-file.json>... | --all");
    process.exit(1);
  }
  for (const file of files) await recordCase(file);
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});

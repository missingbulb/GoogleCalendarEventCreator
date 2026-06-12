// Live end-to-end tests: fetch each case's REAL event page over the network
// at test time, run the extractor on it, and check the result. This is the
// suite that proves the extractor still works against today's markup of each
// site — nothing is cached or committed.
//
// Each JSON file in test/cases/ describes one scenario:
//
//   {
//     "description": "Meetup event page is parseable",
//     "url":         "https://www.meetup.com/<group>/events/<id>/",
//     "expected": {
//       "title":    "Exact Title",                  <- string: exact match
//       "start":    { "matches": "^2026-06-25" },   <- regex on the value
//       "location": { "includes": "Library" },      <- substring(s)
//       "description": { "nonEmpty": true },        <- just has to be there
//       "multipleEvents": false                     <- boolean: exact match
//     }
//   }
//
// Use exact strings when the event's details are known and stable; use
// matchers when the page is live and you only need to prove the field is
// extracted correctly. Every field is optional — assert what matters.
//
// To cover a new website or platform: add a case file pointing at a real
// event page on it. No runner changes needed.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { extractFromHtml } = require("./harness");

const CASES_DIR = path.join(__dirname, "cases");
const FIELDS = ["title", "start", "end", "location", "description", "multipleEvents"];

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
  throw new Error(`Could not fetch ${url} after ${FETCH_ATTEMPTS} attempts: ${lastError.message}`);
}

function assertField(field, actual, expectation, extracted) {
  const context = `\nfull extracted event: ${JSON.stringify(extracted, null, 2)}`;
  if (typeof expectation === "string" || typeof expectation === "boolean") {
    assert.equal(actual, expectation, `"${field}" mismatch${context}`);
    return;
  }
  if (expectation && typeof expectation === "object") {
    if (expectation.nonEmpty) {
      assert.ok(actual, `"${field}" should be non-empty${context}`);
    }
    if (expectation.matches) {
      assert.match(String(actual || ""), new RegExp(expectation.matches), `"${field}" regex mismatch${context}`);
    }
    if (expectation.includes) {
      for (const part of [].concat(expectation.includes)) {
        assert.ok(
          String(actual || "").includes(part),
          `"${field}" should include "${part}" but was: "${actual}"${context}`
        );
      }
    }
    return;
  }
  assert.fail(`Unsupported expectation for "${field}": ${JSON.stringify(expectation)}`);
}

const caseFiles = fs
  .readdirSync(CASES_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

assert.ok(caseFiles.length > 0, `No test cases found in ${CASES_DIR}`);

for (const file of caseFiles) {
  const testCase = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));

  test(`${testCase.description || file} — ${testCase.url}`, async (t) => {
    assert.ok(testCase.url, `${file}: "url" is required`);
    assert.ok(
      testCase.expected && Object.keys(testCase.expected).length > 0,
      `${file}: "expected" must list at least one field`
    );

    let html;
    try {
      html = await fetchPage(testCase.url);
    } catch (err) {
      // Some sites refuse anonymous datacenter clients (Facebook answers
      // HTTP 400 from CI runners). A case can opt into tolerating that with
      // "allowFetchFailure": true — the test is then skipped, but a fetched
      // page that fails to PARSE still fails the test.
      if (testCase.allowFetchFailure) {
        t.skip(`tolerated fetch failure ("allowFetchFailure" is set): ${err.message}`);
        return;
      }
      throw err;
    }
    const extracted = extractFromHtml(html, testCase.url);

    for (const [field, expectation] of Object.entries(testCase.expected)) {
      assert.ok(
        FIELDS.includes(field),
        `${file}: unknown expectation "${field}". Allowed: ${FIELDS.join(", ")}`
      );
      assertField(field, extracted[field], expectation, extracted);
    }
  });
}

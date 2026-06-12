// Live extraction tests — the suite you review to confirm the extractor
// produces the right values for each supported site.
//
// These run OFFLINE against committed HTML snapshots in
// test/integration/snapshots/, which a GitHub Actions job keeps fresh
// (refreshed daily, and again before the live tests run on a push to main —
// see test/integration/refresh-snapshots.js and .github/workflows/).
// Asserting against a recently-cached copy of the real page makes the suite
// deterministic and runnable anywhere (no network), while still reflecting
// each site's current markup.
//
// Each JSON file in test/integration/cases/ describes one scenario:
//
//   {
//     "description": "Meetup event page is parseable",
//     "url":         "https://www.meetup.com/<group>/events/<id>/",
//     "_calendarUrl": "https://calendar.google.com/calendar/render?...", <- informational only,
//                                                                            not validated; the
//                                                                            full URL buildCalendarUrl
//                                                                            produces for this case,
//                                                                            for reviewers to eyeball
//     "expected": {
//       "title":    "Exact Title",                  <- string: exact match
//       "start":    "2026-06-25T18:00:00-04:00",    <- string: exact match
//       "location": { "includes": "Library" },      <- substring(s)
//       "description": { "nonEmpty": true },         <- just has to be there
//       "multipleEvents": false,                     <- boolean: exact match
//       "dates":    "20260625T220000Z/20260626T010000Z" <- the Calendar URL's dates= param
//     }
//   }
//
// `dates` is derived from the extracted start/end via background.js's
// formatDatesParam(), so it doubles as integration coverage for the
// URL-building logic against real-world date/timezone formats.
//
// Use exact strings when the value is known and stable; use matchers
// ({ "includes": [...] }, { "matches": "regex" }, { "nonEmpty": true })
// otherwise. Every field is optional — assert what matters.
//
// To cover a new website or platform: add a case file pointing at a real
// event page, then record its first snapshot with
// `node test/integration/refresh-snapshots.js` (on a machine with internet)
// or let CI record it on the next run. No runner changes needed.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { extractFromHtml } = require("../harness");

const CASES_DIR = path.join(__dirname, "cases");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const MANIFEST_PATH = path.join(SNAPSHOTS_DIR, "manifest.json");
const FIELDS = ["title", "start", "end", "location", "description", "multipleEvents", "dates"];

// background.js registers a chrome listener at load time; stub just enough
// and evaluate it as global code so its function declarations land on
// globalThis.
function loadFormatDatesParam() {
  const sandbox = { chrome: { action: { onClicked: { addListener() {} } } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "..", "background.js"), "utf8"), sandbox);
  return sandbox.formatDatesParam;
}

const formatDatesParam = loadFormatDatesParam();

// Warn (don't fail) when a snapshot is older than this — a silently broken
// refresh pipeline then shows up in the test output instead of going unnoticed.
const STALE_WARNING_HOURS = 48;

const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) : {};

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
  const name = path.basename(file, ".json");
  const testCase = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));

  test(`${testCase.description || file} — ${testCase.url}`, (t) => {
    assert.ok(testCase.url, `${file}: "url" is required`);
    assert.ok(
      testCase.expected && Object.keys(testCase.expected).length > 0,
      `${file}: "expected" must list at least one field`
    );

    const snapshotPath = path.join(SNAPSHOTS_DIR, `${name}.html`);
    assert.ok(
      fs.existsSync(snapshotPath),
      `Missing snapshot for "${name}". Record it with: node test/integration/refresh-snapshots.js`
    );

    const entry = manifest[name];
    if (entry && entry.fetchedAt) {
      const ageHours = (Date.now() - Date.parse(entry.fetchedAt)) / 3_600_000;
      if (ageHours > STALE_WARNING_HOURS) {
        t.diagnostic(
          `snapshot for "${name}" is ${Math.round(ageHours)}h old (fetched ${entry.fetchedAt}) — refresh pipeline may be broken`
        );
      }
    }

    const html = fs.readFileSync(snapshotPath, "utf8");
    const extracted = extractFromHtml(html, testCase.url);
    extracted.dates = formatDatesParam(extracted.start, extracted.end);

    for (const [field, expectation] of Object.entries(testCase.expected)) {
      assert.ok(
        FIELDS.includes(field),
        `${file}: unknown expectation "${field}". Allowed: ${FIELDS.join(", ")}`
      );
      assertField(field, extracted[field], expectation, extracted);
    }
  });
}

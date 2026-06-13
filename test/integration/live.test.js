// Live extraction tests — the suite you review to confirm the extractor
// produces the right values for each supported site.
//
// These run OFFLINE against committed cached HTML files in
// data/, which a GitHub Actions job keeps fresh
// (refreshed daily, and again before the live tests run on a push to main —
// see test/integration/refresh-cache.js and .github/workflows/).
// Asserting against a recently-cached copy of the real page makes the suite
// deterministic and runnable anywhere (no network), while still reflecting
// each site's current markup.
//
// Each JSON file in test/integration/cases/ describes one scenario. The
// extractor always returns a list of events, so `expected` is just that list:
//
//   {
//     "description": "Meetup event page is parseable",
//     "url":         "https://www.meetup.com/<group>/events/<id>/",
//     "expected": {
//       "events": [
//         {
//           "title":    "Exact Title",
//           "start":    "2026-06-25T18:00:00-04:00",
//           "end":      "2026-06-25T21:00:00-04:00",
//           "location": "Brooklyn Public Library, 10 Grand Army Plaza, Brooklyn, NY",
//           "ctz":      "America/New_York",          <- the Calendar URL's ctz= param, or null
//           "dates":    "20260625T220000Z/20260626T010000Z",
//           "details":  "[https://...](https://.../)\n\n...full description..."
//         }
//       ]
//     }
//   }
//
// `expected.events` must be the *complete*, exact array the extractor + URL
// builder produce. Each event is deep-equal compared against:
//   { title, start, end, location, ctz, dates, details }
// There are no substring/regex/prefix matchers: every field must be present
// and match exactly, including the full text of `details`.
// This catches any drift — in extraction, date math, or URL composition —
// however small, and the array length pins down how many events were found
// (one for an ordinary page, several for a listing/series page). When a
// cache refresh legitimately changes a page, update `expected` to match.
//
// Per event: `dates` is derived from start/end via background.js's
// formatDatesParam(); `details` is what background.js's buildCalendarUrl()
// puts in the `details=` param (a link back to the source page followed by
// the description). `ctz` is the timezone a site extractor pinned the event
// to (e.g. "GB" for edfringe.com), or null.
//
// To cover a new website or platform: add a case file pointing at a real
// event page, then record its first cached HTML file with
// `node test/integration/refresh-cache.js` (on a machine with internet)
// or let CI record it on the next run. Run the suite once to see the actual
// extracted values in the failure output, then copy them into `expected`.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { extractFromHtml } = require("../harness");

const CASES_DIR = path.join(__dirname, "cases");
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const URLS_PATH = path.join(DATA_DIR, "urlsToCacheLocally.json");

// Evaluate background.js as global code so its function declarations land
// on the sandbox.
function loadBackgroundFns() {
  const sandbox = { URL, URLSearchParams };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "..", "background.js"), "utf8"), sandbox);
  return { formatDatesParam: sandbox.formatDatesParam, buildCalendarUrl: sandbox.buildCalendarUrl };
}

const { formatDatesParam, buildCalendarUrl } = loadBackgroundFns();

// Warn (don't fail) when a cached HTML file is older than this — a silently
// broken refresh pipeline then shows up in the test output instead of going
// unnoticed.
const STALE_WARNING_HOURS = 48;

const cacheIndex = fs.existsSync(URLS_PATH) ? JSON.parse(fs.readFileSync(URLS_PATH, "utf8")) : {};

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
      testCase.expected && Array.isArray(testCase.expected.events) && testCase.expected.events.length,
      `${file}: "expected.events" must be a non-empty array`
    );

    const cachedHtmlPath = path.join(DATA_DIR, `${name}.html`);
    assert.ok(
      fs.existsSync(cachedHtmlPath),
      `Missing cached HTML for "${name}". Record it with: node test/integration/refresh-cache.js`
    );

    const entry = cacheIndex[name];
    if (entry && entry.fetchedAt) {
      const ageHours = (Date.now() - Date.parse(entry.fetchedAt)) / 3_600_000;
      if (ageHours > STALE_WARNING_HOURS) {
        t.diagnostic(
          `cached HTML for "${name}" is ${Math.round(ageHours)}h old (fetched ${entry.fetchedAt}) — refresh pipeline may be broken`
        );
      }
    }

    const html = fs.readFileSync(cachedHtmlPath, "utf8");
    const extracted = extractFromHtml(html, testCase.url);

    // Build each event exactly as background.js would when opening the
    // Calendar template, so cases assert on the final dates/details/URL.
    // Spread into a Node-realm array first: extractFromHtml returns a
    // jsdom-realm array, and deepEqual rejects a cross-realm array even when
    // its contents match.
    const events = [...(extracted.events || [])].map((e) => {
      const tab = { url: testCase.url, title: e.title, index: 0 };
      const calendarUrl = buildCalendarUrl(e, tab);
      return {
        title: e.title,
        start: e.start,
        end: e.end || null,
        location: e.location,
        ctz: e.ctz || null,
        dates: formatDatesParam(e.start, e.end),
        details: new URL(calendarUrl).searchParams.get("details"),
      };
    });

    assert.deepEqual({ events }, testCase.expected, `${file}: extracted events do not match "expected" exactly`);
  });
}

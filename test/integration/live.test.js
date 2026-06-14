// Live extraction tests — the suite you review to confirm the extractor
// produces the right values for each supported site.
//
// These run OFFLINE against committed cached HTML files in
// data/, recorded from each site by data/refresh-cache.js (see also
// .github/workflows/refresh-cache.yml). Asserting against a cached copy of the
// real page makes the suite deterministic and runnable anywhere (no network),
// while still reflecting each site's current markup.
//
// Each JSON file in test/integration/cases/ describes one scenario. The
// extractor always returns a list of events, so `expected` is just that list:
//
//   {
//     "description": "Meetup event page is parseable",
//     "expected": {
//       "events": [
//         {
//           "title":    "Exact Title",
//           "start":    "2026-06-25T18:00:00-04:00",
//           "end":      "2026-06-25T21:00:00-04:00",
//           "location": "Brooklyn Public Library, 10 Grand Army Plaza, Brooklyn, NY",
//           "ctz":      "America/New_York",          <- the Calendar URL's ctz= param, or null
//           "details":  "[https://...](https://.../)\n\n...full description..."
//         }
//       ]
//     }
//   }
//
// The scenario's source URL lives alongside the cached HTML, in
// data/<name>.url (the single source of truth — refresh-cache.js fetches it,
// and the suite loads the HTML into a DOM at that URL so hostname-based site
// detection behaves as in Chrome). It is NOT repeated in the case file.
//
// `expected.events` must be the *complete*, exact array the extractor
// produces. Each event is deep-equal compared against:
//   { title, start, end, location, ctz, details }
// There are no substring/regex/prefix matchers: every field must be present
// and match exactly, including the full text of `details`.
// This catches any drift — in extraction or in how `details` is composed —
// however small, and the array length pins down how many events were found
// (one for an ordinary page, several for a listing/series page). When a
// cache refresh legitimately changes a page, update `expected` to match.
//
// Per event: `details` is what pipeline/build-calendar-url.js's
// buildCalendarUrl() puts in the `details=` param (a link back to the source
// page followed by the description). `ctz` is the timezone a site extractor
// pinned the event to
// (e.g. "GB" for edfringe.com), or null.
//
// To cover a new website or platform: add a data/<name>.url with the event
// page URL and a case file (test/integration/cases/<name>.json) with its
// `expected`, then record the cached HTML with `node data/refresh-cache.js`
// (on a machine with internet) or let CI record it on the next run. Run the
// suite once to see the actual extracted values in the failure output, then
// copy them into `expected`.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { extractFromHtml } = require("../harness");

const CASES_DIR = path.join(__dirname, "cases");
const DATA_DIR = path.join(__dirname, "..", "..", "data");

// Evaluate build-calendar-url.js as global code so its function declarations
// land on the sandbox.
function loadCalendarUrlFns() {
  const sandbox = { URL, URLSearchParams };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "..", "pipeline", "build-calendar-url.js"), "utf8"),
    sandbox
  );
  return { buildCalendarUrl: sandbox.buildCalendarUrl };
}

const { buildCalendarUrl } = loadCalendarUrlFns();

const caseFiles = fs
  .readdirSync(CASES_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

assert.ok(caseFiles.length > 0, `No test cases found in ${CASES_DIR}`);

for (const file of caseFiles) {
  const name = path.basename(file, ".json");
  const testCase = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));
  const urlPath = path.join(DATA_DIR, `${name}.url`);
  const url = fs.existsSync(urlPath) ? fs.readFileSync(urlPath, "utf8").trim() : "";

  test(`${testCase.description || file} — ${url}`, () => {
    assert.ok(url, `Missing source URL for "${name}". Add it to data/${name}.url`);
    assert.ok(
      testCase.expected && Array.isArray(testCase.expected.events) && testCase.expected.events.length,
      `${file}: "expected.events" must be a non-empty array`
    );

    const cachedHtmlPath = path.join(DATA_DIR, `${name}.html`);
    assert.ok(
      fs.existsSync(cachedHtmlPath) && fs.statSync(cachedHtmlPath).size > 0,
      `Missing cached HTML for "${name}". Record it with: node data/refresh-cache.js`
    );

    const html = fs.readFileSync(cachedHtmlPath, "utf8");
    const extracted = extractFromHtml(html, url);

    // Build each event exactly as the popup would when opening the Calendar
    // template, so cases assert on the final dates/details/URL.
    // Spread into a Node-realm array first: extractFromHtml returns a
    // jsdom-realm array, and deepEqual rejects a cross-realm array even when
    // its contents match.
    const events = [...(extracted.events || [])].map((e) => {
      const tab = { url, title: e.title, index: 0 };
      const calendarUrl = buildCalendarUrl(e, tab);
      return {
        title: e.title,
        start: e.start,
        end: e.end || null,
        location: e.location,
        ctz: e.ctz || null,
        details: new URL(calendarUrl).searchParams.get("details"),
      };
    });

    assert.deepEqual({ events }, testCase.expected, `${file}: extracted events do not match "expected" exactly`);
  });
}

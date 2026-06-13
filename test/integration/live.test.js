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
//     "expected": {
//       "title":          "Exact Title",
//       "start":          "2026-06-25T18:00:00-04:00",
//       "end":            "2026-06-25T21:00:00-04:00",
//       "location":       "Brooklyn Public Library, 10 Grand Army Plaza, Brooklyn, NY",
//       "multipleEvents": false,
//       "dates":          "20260625T220000Z/20260626T010000Z",
//       "details":        "[https://www.meetup.com/.../events/123](https://www.meetup.com/.../events/123/)\n\n...full description...",
//       "calendarUrl":    "https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...",
//       "eventCount":     23,                        <- total events found on the page
//       "ctz":            "GB"                       <- the Calendar URL's ctz= param, or null if absent
//     }
//   }
//
// `expected` must be the *complete*, exact object the extractor + URL
// builder produce — it is deep-equal compared against:
//   { title, start, end, location, multipleEvents, dates, details, calendarUrl, eventCount, ctz }
// (see below). There are no substring/regex/prefix matchers: every field
// must be present and match exactly, including the full text of `details`
// and `calendarUrl`. This catches any drift — in extraction, date math, or
// URL composition — however small. When a snapshot refresh legitimately
// changes a page's content, update `expected` to match the new exact values.
//
// `dates` is derived from the extracted start/end via background.js's
// formatDatesParam(), so it doubles as integration coverage for the
// URL-building logic against real-world date/timezone formats.
//
// `details` is the final Calendar template "details" field, built from the
// extraction result via background.js's buildCalendarUrl() — a link back to
// the source page (on meetup.com, the canonical URL linking to the original,
// tracked URL) followed by the page's description, truncated to
// MAX_DETAILS_LENGTH. There is no separate "description" field: `details` is
// the one place the description shows up, exactly as it will appear in the
// generated Calendar event.
//
// `calendarUrl` is the complete URL background.js opens, i.e. the full
// return value of buildCalendarUrl() (which embeds `details` and `dates`
// among other params). It's the end-to-end check: if this matches, the
// extension produces exactly this Calendar template for this page.
//
// `eventCount` is the total number of events/performances the extractor
// found on the page (see extractors/main.js); `ctz` is the timezone a site
// extractor pinned the event to (e.g. "GB" for edfringe.com), or null when
// no extractor set one.
//
// To cover a new website or platform: add a case file pointing at a real
// event page, then record its first snapshot with
// `node test/integration/refresh-snapshots.js` (on a machine with internet)
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
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const MANIFEST_PATH = path.join(SNAPSHOTS_DIR, "manifest.json");
const FIELDS = [
  "title",
  "start",
  "end",
  "location",
  "multipleEvents",
  "dates",
  "details",
  "calendarUrl",
  "eventCount",
  "ctz",
];

// Evaluate background.js as global code so its function declarations land
// on the sandbox.
function loadBackgroundFns() {
  const sandbox = { URL, URLSearchParams };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "..", "background.js"), "utf8"), sandbox);
  return { formatDatesParam: sandbox.formatDatesParam, buildCalendarUrl: sandbox.buildCalendarUrl };
}

const { formatDatesParam, buildCalendarUrl } = loadBackgroundFns();

// Warn (don't fail) when a snapshot is older than this — a silently broken
// refresh pipeline then shows up in the test output instead of going unnoticed.
const STALE_WARNING_HOURS = 48;

const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) : {};

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
    assert.ok(testCase.expected, `${file}: "expected" is required`);
    for (const field of Object.keys(testCase.expected)) {
      assert.ok(FIELDS.includes(field), `${file}: unknown expected field "${field}". Allowed: ${FIELDS.join(", ")}`);
    }
    for (const field of FIELDS) {
      assert.ok(field in testCase.expected, `${file}: "expected" is missing required field "${field}"`);
    }

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
    const dates = formatDatesParam(extracted.start, extracted.end);

    // Run the same details-composition logic background.js uses when it
    // opens the Calendar template, so cases assert on the final "details"
    // field (link back to the source + description) rather than the raw,
    // pre-composition "description".
    const calendarUrl = buildCalendarUrl(extracted, { url: testCase.url, title: extracted.title, index: 0 });
    const details = new URL(calendarUrl).searchParams.get("details");

    const actual = {
      title: extracted.title,
      start: extracted.start,
      end: extracted.end,
      location: extracted.location,
      multipleEvents: extracted.multipleEvents,
      dates,
      details,
      calendarUrl,
      eventCount: extracted.eventCount,
      ctz: extracted.ctz || null,
    };

    assert.deepEqual(actual, testCase.expected, `${file}: extracted result does not match "expected" exactly`);
  });
}

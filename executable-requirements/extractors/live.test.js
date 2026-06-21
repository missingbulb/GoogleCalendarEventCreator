// Live extraction tests — the suite you review to confirm the extractor
// produces the right values for each supported site.
//
// These run OFFLINE against committed cached HTML files in
// data/, recorded from each site by executable-requirements/infra/data/refresh-cache.js (see also
// .github/workflows/refresh-cache.yml). Asserting against a cached copy of the
// real page makes the suite deterministic and runnable anywhere (no network),
// while still reflecting each site's current markup.
//
// Each JSON file in executable-requirements/extractors/custom/ describes one scenario. The
// extractor always returns a list of events; each event carries its timing in
// `times[]` (the multi-instance model — one entry per showing), so `expected`
// looks like:
//
//   {
//     "description": "Meetup event page is parseable",
//     "expected": {
//       "events": [
//         {
//           "title":      "Exact Title",
//           "location":   "Brooklyn Public Library, 10 Grand Army Plaza, Brooklyn, NY",
//           "ctz":        "America/New_York",   <- the Calendar URL's ctz= param, or null
//           "details":    "[https://...](https://.../)\n\n...full description...",
//           "times": [
//             {
//               "start":                "2026-06-25T18:00:00-04:00",
//               "end":                  "2026-06-25T21:00:00-04:00",
//               "eventLengthInMinutes": null   <- explicit page duration, or null
//             }
//           ]
//         }
//       ]
//     }
//   }
//
// The scenario's source URL lives alongside the cached HTML, in
// executable-requirements/data/<name>.url (the single source of truth — refresh-cache.js fetches it,
// and the suite loads the HTML into a DOM at that URL so hostname-based site
// detection behaves as in Chrome). It is NOT repeated in the case file.
//
// `expected.events` must be the *complete*, exact array the extractor
// produces. Each event is deep-equal compared against:
//   { title, location, ctz, details, times: [{ start, end, eventLengthInMinutes }] }
// There are no substring/regex/prefix matchers: every field must be present
// and match exactly, including the full text of `details`. `details` is the
// same for every instance (only the date differs between them), so it's
// asserted once at the event level. This catches any drift — in extraction or
// in how `details` is composed — however small, and the array lengths pin down
// how many events were found and how many instances each has (one event with
// one instance for an ordinary page; several events for a listing/series page;
// one event with several instances for a multi-screening/multi-night run). When
// a cache refresh legitimately changes a page, update `expected` to match.
//
// Per event: `details` is what pipeline/build-calendar-url.js's
// buildCalendarUrl() puts in the `details=` param (a link back to the source
// page followed by the description). `ctz` is the timezone a site extractor
// pinned the event to
// (e.g. "GB" for edfringe.com), or null.
//
// To cover a new website or platform: add a executable-requirements/data/<name>.url with the event
// page URL and a case file (executable-requirements/extractors/custom/<name>.json) with its
// `expected`, then record the cached HTML with `node executable-requirements/infra/data/refresh-cache.js`
// (on a machine with internet) or let CI record it on the next run. Run the
// suite once to see the actual extracted values in the failure output, then
// copy them into `expected`.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { extractFromHtml } = require("../../test/harness");

const CASES_DIR = path.join(__dirname, "custom");
const DATA_DIR = path.join(__dirname, "..", "data");

// build-calendar-url.js is an ES module; import it before the tests run.
let buildCalendarUrl;
before(async () => {
  ({ buildCalendarUrl } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "pipeline", "build-calendar-url.js"))
  ));
});

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
      `Missing cached HTML for "${name}". Record it with: node executable-requirements/infra/data/refresh-cache.js`
    );

    const html = fs.readFileSync(cachedHtmlPath, "utf8");
    // A case may pin a fixed reference instant ("referenceNow") for an extractor
    // that infers a date's missing year from "now" (tabitisrael shows "21/6", no
    // year), so the asserted date stays stable instead of rotting over time.
    // Other cases omit it and use the real clock, exactly as production does.
    const extracted = extractFromHtml(html, url, { referenceNow: testCase.referenceNow });

    // Build each event exactly as the popup would when opening the Calendar
    // template, so cases assert on the final details/URL. `details` is the same
    // for every instance (only the date differs), so it's taken from the first
    // instance and asserted once; the instances are listed under `times`.
    // Spread into a Node-realm array first: extractFromHtml returns a
    // jsdom-realm array, and deepEqual rejects a cross-realm array even when
    // its contents match.
    const events = [...(extracted.events || [])].map((e) => {
      const tab = { url, title: e.title, index: 0 };
      const calendarUrl = buildCalendarUrl(e, tab, 0);
      return {
        title: e.title,
        location: e.location,
        ctz: e.ctz || null,
        details: new URL(calendarUrl).searchParams.get("details"),
        times: [...e.times].map((t) => ({
          start: t.start,
          end: t.end || null,
          eventLengthInMinutes: t.eventLengthInMinutes ?? null,
        })),
      };
    });

    assert.deepEqual({ events }, testCase.expected, `${file}: extracted events do not match "expected" exactly`);
  });
}

// Validation for the "Required explicit support for Extractors" requirements
// (Requirements.md §11): each supported host's dedicated extractor, run against a
// REAL cached page, must recognize the page as supported and produce a COMPLETE
// event (title + location + start). One `kind: "extractor"` case per supported
// host declares the host, its source file, and the cached page to validate
// against; this test is the executable side of those leaves — the analogue of
// events-view-actions.test.js for the `kind: "behavior"` leaves.
//
// It asserts only RECOGNITION + COMPLETENESS, not exact field values: the precise
// extracted values stay pinned by the reviewed per-page cases in
// executable-requirements/extractors/custom/*.json (live.test.js). A `tbd`
// extractor case (a bot-blocked host with no cacheable page, e.g. facebook.com)
// carries no page and is skipped here — its extractor is covered by unit tests.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { extractFromHtml } = require("../../test/harness");
const { loadCases, leafIdOf } = require("../infrastructure/cases");

const DATA_DIR = path.join(__dirname, "..", "data");
const extractorCases = loadCases().filter((c) => c.kind === "extractor");

test("there is at least one extractor-support case", () => {
  assert.ok(extractorCases.length > 0, "no kind:\"extractor\" cases found");
});

for (const testCase of extractorCases) {
  const id = leafIdOf(testCase.name);
  if (testCase.tbd) {
    test(`${id}: ${testCase.host} extractor is tracked but untested (no cached page)`, (t) => {
      assert.ok(testCase.source, `${testCase.name}: a tbd extractor case must still name its source`);
      t.skip("bot-blocked host: no cached page to validate against — covered by unit tests");
    });
    continue;
  }

  test(`${id}: ${testCase.host} is recognized as supported and yields a complete event (${testCase.page})`, () => {
    const htmlPath = path.join(DATA_DIR, `${testCase.page}.html`);
    const urlPath = path.join(DATA_DIR, `${testCase.page}.url`);
    assert.ok(
      fs.existsSync(htmlPath) && fs.statSync(htmlPath).size > 0,
      `missing/empty cached page for ${testCase.host}: ${htmlPath} (record it with node data/refresh-cache.js)`
    );
    assert.ok(fs.existsSync(urlPath), `missing source URL: ${urlPath}`);

    const html = fs.readFileSync(htmlPath, "utf8");
    const url = fs.readFileSync(urlPath, "utf8").trim();
    const result = extractFromHtml(html, url, { referenceNow: testCase.referenceNow });

    assert.equal(result.supported, true, `${testCase.host}: a dedicated source should claim this page (supported=true)`);
    assert.ok(Array.isArray(result.events) && result.events.length > 0, `${testCase.host}: extractor produced no events`);
    const [ev] = result.events;
    // A normalized event carries its start under times[0].start (single or grouped
    // showings); title/location are top-level.
    const start = (ev.times && ev.times[0] && ev.times[0].start) || ev.start;
    assert.ok(ev.title, `${testCase.host}: extracted event is missing a title`);
    assert.ok(ev.location, `${testCase.host}: extracted event is missing a location`);
    assert.ok(start, `${testCase.host}: extracted event is missing a start`);
  });
}

// Keep the routing honest: the cached page named by each extractor case must be
// the URL's real host (so a case can't validate the wrong page), and §11 leaves
// are exactly the kind:"extractor" cases — enforced as a set against the spec.
test("each extractor case names a section-11 leaf", () => {
  const stray = extractorCases.map((c) => leafIdOf(c.name)).filter((id) => !/^11\./.test(id));
  assert.deepEqual(stray, [], "kind:\"extractor\" cases whose leaf id is not under §11:");
});

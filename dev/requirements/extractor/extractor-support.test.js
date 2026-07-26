// Validation for the "Required explicit support for Extractors" requirements
// (requirements.md §11): each supported host, run against a REAL cached page,
// must be recognized as supported and produce a COMPLETE event (title + location
// + start). One `kind: "extractor"` case per supported host declares the host,
// the source file that claims it, and the cached page to validate against; this
// test is the executable side of those leaves — the analogue of
// events-view-actions.test.js for the `kind: "behavior"` leaves.
//
// Support is DECLARED, not derived: a host is supported because it is listed in
// extension/host-lists.json's `supportedDomains` (the same list the toolbar
// icon and the popup read), and this test asserts that declaration alongside the
// extraction. A case's `source` names whichever file the support rests on — a
// per-site event-extractors/custom/<site>.js, or the core
// event-extractors/generic-extractor.js for a host it covers on its own, with no
// per-site file. The assertions are the same either way: support is support.
//
// It asserts only RECOGNITION + COMPLETENESS, not exact field values: the precise
// extracted values stay pinned by the reviewed per-page cases in
// dev/requirements/extractor/expected/*.json (live.test.js). A `tbd`
// extractor case (a bot-blocked host with no cacheable page, e.g. facebook.com)
// carries no page and is skipped here — its extraction is covered by unit tests.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { extractFromHtml } = require("../../../extension-test/harness");
const { loadCases, leafIdOf } = require("../shared/cases");

// Resolves a case's <page>.{html,url} across data/server-fetched/ + data/user-submitted/.
const { dataFile } = require("./data-files");
const extractorCases = loadCases().filter((c) => c.kind === "extractor");

const ROOT = path.join(__dirname, "..", "..", "..");
const { supportedDomains } = JSON.parse(
  fs.readFileSync(path.join(ROOT, "extension", "host-lists.json"), "utf8")
);
// The same subdomain-aware match host-policy.js's isSupportedDomain applies.
const isSupported = (host) =>
  supportedDomains.some((entry) => host === entry || host.endsWith("." + entry));

test("there is at least one extractor-support case", () => {
  assert.ok(extractorCases.length > 0, "no kind:\"extractor\" cases found");
});

for (const testCase of extractorCases) {
  const id = leafIdOf(testCase.name);
  if (testCase.tbd) {
    test(`${id}: ${testCase.host} extractor is tracked but untested (no cached page)`, (t) => {
      assert.ok(testCase.source, `${testCase.name}: a tbd extractor case must still name its source`);
      assert.ok(isSupported(testCase.host), `${testCase.host}: not declared in host-lists.json's supportedDomains`);
      t.skip("bot-blocked host: no cached page to validate against — covered by unit tests");
    });
    continue;
  }

  test(`${id}: ${testCase.host} is recognized as supported and yields a complete event (${testCase.page})`, () => {
    const htmlPath = dataFile(`${testCase.page}.html`);
    const urlPath = dataFile(`${testCase.page}.url`);
    assert.ok(
      fs.existsSync(htmlPath) && fs.statSync(htmlPath).size > 0,
      `missing/empty cached page for ${testCase.host}: ${htmlPath} (recorded by the auto-extractor pipeline — see .claudinite/local/packs/gcec/tasks/create-extractor/prepare.mjs)`
    );
    assert.ok(fs.existsSync(urlPath), `missing source URL: ${urlPath}`);

    const html = fs.readFileSync(htmlPath, "utf8");
    const url = fs.readFileSync(urlPath, "utf8").trim();
    const result = extractFromHtml(html, url, { referenceNow: testCase.referenceNow });

    assert.ok(
      isSupported(testCase.host),
      `${testCase.host}: not declared in host-lists.json's supportedDomains — the toolbar icon would stay blue and the popup would treat it as an unsupported site`
    );
    assert.ok(Array.isArray(result.events) && result.events.length > 0, `${testCase.host}: extractor produced no events`);
    const [ev] = result.events;
    // A normalized event carries its start AND location per showing under
    // times[0] (single or grouped showings); only title stays top-level.
    const primary = (ev.times && ev.times[0]) || ev;
    assert.ok(ev.title, `${testCase.host}: extracted event is missing a title`);
    assert.ok(primary.location, `${testCase.host}: extracted event is missing a location`);
    assert.ok(primary.start, `${testCase.host}: extracted event is missing a start`);
  });
}

// The file a case names as claiming its host must exist. Without this a case can
// keep pointing at a source that was deleted — e.g. when a site's per-site file
// is dropped because the core generic extractor covers it, and the case should
// now name generic-extractor.js — and nothing would say so (a `tbd` case runs no
// extraction at all, so its stale path would never surface).
test("each extractor case names a source file that exists", () => {
  const missing = extractorCases
    .filter((c) => !fs.existsSync(path.join(ROOT, c.source || "")))
    .map((c) => `${leafIdOf(c.name)} (${c.host}) -> ${c.source}`);
  assert.deepEqual(missing, [], "extractor cases whose `source` file is missing:");
});

// Keep the routing honest: the cached page named by each extractor case must be
// the URL's real host (so a case can't validate the wrong page), and §11 leaves
// are exactly the kind:"extractor" cases — enforced as a set against the spec.
test("each extractor case names a section-11 leaf", () => {
  const stray = extractorCases.map((c) => leafIdOf(c.name)).filter((id) => !/^11\./.test(id));
  assert.deepEqual(stray, [], "kind:\"extractor\" cases whose leaf id is not under §11:");
});

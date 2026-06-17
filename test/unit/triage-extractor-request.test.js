// Offline unit tests for the auto-extractor pre-flight triage
// (tools/new-extractors-creation/triage-extractor-request.js): the workflow step that closes a request
// whose host is already on config.js's fallback allow/denylist, before spending
// an agent run. Lists are injected so the cases don't depend on the shipped
// (empty) config; the host-matching itself is covered in popup-content.test.js.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { firstUrl, runTriage } = require("../../tools/new-extractors-creation/triage-extractor-request");

// A GitHub issue-form body renders each field under a "### <label>" heading.
const bodyWith = (url) => `### URL\n\n${url}\n\n### Name\n\n_No response_\n`;

test("firstUrl extracts the first http(s) URL from issue-form body text", () => {
  assert.equal(firstUrl(bodyWith("https://example.com/e/1")), "https://example.com/e/1");
  assert.equal(firstUrl("no url here"), "");
  assert.equal(firstUrl(""), "");
  assert.equal(firstUrl(undefined), "");
});

test("a denylisted host is triaged (agent skipped), with a denylist message", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["news.example"] };
  const res = await runTriage({ body: bodyWith("https://www.news.example/article/42") }, lists);
  assert.equal(res.triaged, true);
  assert.equal(res.listing, "deny");
  assert.equal(res.host, "news.example"); // www stripped
  assert.match(res.message, /denylist/i);
});

test("an allowlisted host is triaged, with an allowlist message", async () => {
  const lists = { sourceFallbackAllowlist: ["good.example"], sourceFallbackDenylist: [] };
  const res = await runTriage({ body: bodyWith("https://good.example/events/9") }, lists);
  assert.equal(res.triaged, true);
  assert.equal(res.listing, "allow");
  assert.match(res.message, /allowlist/i);
});

test("an unlisted host is NOT triaged — the agent proceeds", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [] };
  const res = await runTriage({ body: bodyWith("https://unknown.example/e/1") }, lists);
  assert.equal(res.triaged, false);
  assert.equal(res.listing, "none");
  assert.equal(res.message, "");
});

test("the result carries the deterministic slug/caseName the workflow needs", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [] };
  const res = await runTriage({ body: bodyWith("https://www.unknown.example/events/9") }, lists);
  assert.equal(res.url, "https://www.unknown.example/events/9");
  assert.equal(res.host, "unknown.example");
  assert.equal(res.slug, "unknown");
  assert.equal(res.caseName, "unknown");
});

test("falls back to the URL in the title when the body has none", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["bad.example"] };
  const res = await runTriage(
    { body: "_No response_", title: "Event source request - https://bad.example/e/2" },
    lists
  );
  assert.equal(res.triaged, true);
  assert.equal(res.listing, "deny");
});

test("no URL at all: not triaged (the agent handles the missing-URL case)", async () => {
  const res = await runTriage({ body: "please add support", title: "support please" }, {
    sourceFallbackAllowlist: ["x.example"],
    sourceFallbackDenylist: ["y.example"],
  });
  assert.equal(res.triaged, false);
  assert.equal(res.host, "");
});

test("the shipped config triages its seeded hosts (meetup.com allow, cnn.com deny)", async () => {
  // No injected lists -> classifyHost reads the real config.js.
  assert.equal((await runTriage({ body: bodyWith("https://www.meetup.com/g/events/1/") })).listing, "allow");
  assert.equal((await runTriage({ body: bodyWith("https://cnn.com/2026/01/01/some-article") })).listing, "deny");
  assert.equal((await runTriage({ body: bodyWith("https://unlisted.example/e/3") })).triaged, false);
});

// --- Already-supported hosts -------------------------------------------------

test("a host with a dedicated source is triaged (agent skipped), reason 'supported'", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [], supportedDomains: ["covered.example"] };
  const res = await runTriage({ body: bodyWith("https://covered.example/e/1") }, lists);
  assert.equal(res.triaged, true);
  assert.equal(res.reason, "supported");
  assert.match(res.message, /dedicated extractor/i);
});

test("the supported check is subdomain-aware (www and sub stripped/covered)", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [], supportedDomains: ["covered.example"] };
  assert.equal((await runTriage({ body: bodyWith("https://www.covered.example/e/1") }, lists)).reason, "supported");
  assert.equal((await runTriage({ body: bodyWith("https://sub.covered.example/e/1") }, lists)).reason, "supported");
});

test("the shipped config marks a host that has a source as supported (eventbrite.com)", async () => {
  // No injected lists -> isSupportedDomain reads the real config.js list, which
  // is kept in sync with the sources by test/unit/supported-domains.test.js.
  const res = await runTriage({ body: bodyWith("https://www.eventbrite.com/e/some-event-123") });
  assert.equal(res.triaged, true);
  assert.equal(res.reason, "supported");
});

// --- Concurrent duplicate requests ------------------------------------------

const dupLists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [], supportedDomains: [] };

test("a newer request for a host with an earlier OPEN request is closed as a duplicate", async () => {
  const openRequests = [{ number: 10, body: bodyWith("https://dup.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/2"), number: 11 }, dupLists, openRequests);
  assert.equal(res.triaged, true);
  assert.equal(res.reason, "duplicate");
  assert.equal(res.duplicateOf, 10);
  assert.match(res.message, /duplicate of #10/i);
});

test("the earliest (lowest-numbered) request proceeds — it's the elder", async () => {
  // Same pair, but now WE are #10 and the peer #11 is newer: we proceed and #11
  // defers to us. This is the tie-break that lets exactly one of two
  // near-simultaneous requests run the agent.
  const openRequests = [{ number: 11, body: bodyWith("https://dup.example/e/2") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/1"), number: 10 }, dupLists, openRequests);
  assert.equal(res.triaged, false);
  assert.equal(res.reason, "");
});

test("the lowest of three same-host requests wins; the others defer to it", async () => {
  const all = [
    { number: 10, body: bodyWith("https://dup.example/a") },
    { number: 11, body: bodyWith("https://dup.example/b") },
    { number: 12, body: bodyWith("https://dup.example/c") },
  ];
  const triageOne = (number) =>
    runTriage({ body: bodyWith("https://dup.example/x"), number }, dupLists, all.filter((r) => r.number !== number));
  assert.equal((await triageOne(10)).reason, ""); // elder proceeds
  assert.equal((await triageOne(11)).duplicateOf, 10); // defers to 10
  assert.equal((await triageOne(12)).duplicateOf, 10); // defers to 10
});

test("the current issue listed among the open requests isn't a self-duplicate", async () => {
  // gh issue list returns ALL open requests, including the current one; it must
  // be excluded by number so a lone request never closes itself.
  const openRequests = [{ number: 12, body: bodyWith("https://solo.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://solo.example/e/1"), number: 12 }, dupLists, openRequests);
  assert.equal(res.triaged, false);
});

test("an open request for a DIFFERENT host doesn't trigger a duplicate", async () => {
  const openRequests = [{ number: 5, body: bodyWith("https://other.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://mine.example/e/2"), number: 6 }, dupLists, openRequests);
  assert.equal(res.triaged, false);
});

test("without the current issue number the duplicate check fails open (proceeds)", async () => {
  const openRequests = [{ number: 1, body: bodyWith("https://dup.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/9") }, dupLists, openRequests);
  assert.equal(res.triaged, false);
});

test("a settled listing wins over a duplicate (denylist beats the dup check)", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["dup.example"], supportedDomains: [] };
  const openRequests = [{ number: 1, body: bodyWith("https://dup.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/2"), number: 9 }, lists, openRequests);
  assert.equal(res.reason, "deny");
});

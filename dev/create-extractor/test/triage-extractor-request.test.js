// Offline unit tests for the auto-extractor pre-flight triage
// (triage-extractor-request.js): the workflow step that closes a request
// whose host is already on config.js's fallback allow/denylist, before spending
// an agent run. Lists are injected so the cases don't depend on the shipped
// (empty) config; the host-matching itself is covered in fallback-policy.test.js.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { firstUrl, runTriage } = require("../triage-extractor-request");

// A GitHub issue-form body renders each field under a "### <label>" heading.
const bodyWith = (url) => `### URL\n\n${url}\n\n### Name\n\n_No response_\n`;

test("firstUrl extracts the first http(s) URL from issue-form body text", () => {
  assert.equal(firstUrl(bodyWith("https://example.com/e/1")), "https://example.com/e/1");
  assert.equal(firstUrl("no url here"), "");
  assert.equal(firstUrl(""), "");
  assert.equal(firstUrl(undefined), "");
});

test("a denylisted host is closed (agent skipped), with a denylist message", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["news.example"] };
  const res = await runTriage({ body: bodyWith("https://www.news.example/article/42") }, lists);
  assert.equal(res.skipAgent, true);
  assert.equal(res.listing, "deny");
  assert.equal(res.host, "news.example"); // www stripped
  assert.match(res.message, /denylist/i);
});

test("an allowlisted host is closed, with an allowlist message", async () => {
  const lists = { sourceFallbackAllowlist: ["good.example"], sourceFallbackDenylist: [] };
  const res = await runTriage({ body: bodyWith("https://good.example/events/9") }, lists);
  assert.equal(res.skipAgent, true);
  assert.equal(res.listing, "allow");
  assert.match(res.message, /allowlist/i);
});

test("an unlisted, unsupported host PROCEEDS in new-source mode", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [] };
  const res = await runTriage({ body: bodyWith("https://unknown.example/e/1") }, lists);
  assert.equal(res.skipAgent, false);
  assert.equal(res.mode, "new");
  assert.equal(res.listing, "none");
  assert.equal(res.message, "");
});

test("the result carries the deterministic new-mode names the workflow needs", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [] };
  const res = await runTriage({ body: bodyWith("https://www.unknown.example/events/9"), number: 7 }, lists);
  assert.equal(res.url, "https://www.unknown.example/events/9");
  assert.equal(res.host, "unknown.example");
  assert.equal(res.slug, "unknown");
  assert.equal(res.mode, "new");
  assert.equal(res.sourceBase, "unknown");
  assert.equal(res.caseName, "unknown"); // new mode: caseName == slug
  assert.equal(res.branch, "claude/extractor/unknown");
  assert.equal(res.sourcePath, "extension/event-extractors/custom/unknown.js");
  assert.equal(res.casePath, "dev/requirements/extractor/expected/unknown.json");
});

test("falls back to the URL in the title when the body has none", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["bad.example"] };
  const res = await runTriage(
    { body: "_No response_", title: "Event source request - https://bad.example/e/2" },
    lists
  );
  assert.equal(res.skipAgent, true);
  assert.equal(res.listing, "deny");
});

test("no URL at all: not triaged (the agent handles the missing-URL case)", async () => {
  const res = await runTriage({ body: "please add support", title: "support please" }, {
    sourceFallbackAllowlist: ["x.example"],
    sourceFallbackDenylist: ["y.example"],
  });
  assert.equal(res.skipAgent, false);
  assert.equal(res.host, "");
});

test("the shipped config triages its seeded hosts (meetup.com allow, cnn.com deny)", async () => {
  // No injected lists -> classifyHost reads the real config.js.
  assert.equal((await runTriage({ body: bodyWith("https://www.meetup.com/g/events/1/") })).listing, "allow");
  assert.equal((await runTriage({ body: bodyWith("https://cnn.com/2026/01/01/some-article") })).listing, "deny");
  assert.equal((await runTriage({ body: bodyWith("https://unlisted.example/e/3") })).skipAgent, false);
});

// --- Already-supported hosts: proceed in SUPPORTED mode (add a case) ----------
// "supported" is decided by whether a real source's matches() accepts the host
// (resolve-source), not an injected list, so these use real supported hosts.

test("a host with a dedicated source PROCEEDS in supported mode (not closed)", async () => {
  const res = await runTriage({ body: bodyWith("https://www.eventbrite.com/e/some-event-123"), number: 451 });
  assert.equal(res.skipAgent, false); // no longer closed — it adds a case
  assert.equal(res.reason, "supported");
  assert.equal(res.mode, "supported");
  assert.equal(res.message, ""); // no closing comment in supported mode
});

test("supported mode keys the case/branch on the EXISTING source file, not the slug", async () => {
  // cinema.co.il (slug "cinema") is served by telavivcinematheque.js — the case
  // and branch must follow the real source file + issue number, uniquely.
  const res = await runTriage({ body: bodyWith("https://www.cinema.co.il/event/1"), number: 451 });
  assert.equal(res.reason, "supported");
  assert.equal(res.sourceBase, "telavivcinematheque");
  assert.equal(res.sourcePath, "extension/event-extractors/custom/telavivcinematheque.js");
  assert.equal(res.caseName, "telavivcinematheque-451");
  assert.equal(res.casePath, "dev/requirements/extractor/expected/telavivcinematheque-451.json");
  assert.equal(res.branch, "claude/extractor/telavivcinematheque-451");
});

test("the supported check is subdomain-aware (www and sub both resolve)", async () => {
  assert.equal((await runTriage({ body: bodyWith("https://www.eventbrite.com/e/x-1"), number: 1 })).reason, "supported");
  assert.equal((await runTriage({ body: bodyWith("https://sub.eventbrite.com/e/x-1"), number: 1 })).reason, "supported");
});

test("a supported host beats the deny/allow lists (it adds a case regardless)", async () => {
  // Even if someone listed a supported host, having a real source wins.
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["eventbrite.com"] };
  const res = await runTriage({ body: bodyWith("https://www.eventbrite.com/e/x-1"), number: 5 }, lists);
  assert.equal(res.reason, "supported");
  assert.equal(res.skipAgent, false);
});

// --- Concurrent duplicate requests ------------------------------------------

const dupLists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: [], supportedDomains: [] };

test("a newer request for a host with an earlier OPEN request is deferred as a sample", async () => {
  const openRequests = [{ number: 10, body: bodyWith("https://dup.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/2"), number: 11 }, dupLists, openRequests);
  assert.equal(res.skipAgent, true);
  assert.equal(res.reason, "sample");
  assert.equal(res.duplicateOf, 10);
  // The new event page is folded into the leader, not discarded.
  assert.match(res.message, /#10/);
  assert.match(res.message, /additional sample/i);
  assert.equal(res.url, "https://dup.example/e/2"); // the URL the workflow attaches
});

test("the earliest (lowest-numbered) request proceeds — it's the elder", async () => {
  // Same pair, but now WE are #10 and the peer #11 is newer: we proceed and #11
  // defers to us. This is the tie-break that lets exactly one of two
  // near-simultaneous requests run the agent.
  const openRequests = [{ number: 11, body: bodyWith("https://dup.example/e/2") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/1"), number: 10 }, dupLists, openRequests);
  assert.equal(res.skipAgent, false);
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
  assert.equal(res.skipAgent, false);
});

test("an open request for a DIFFERENT host doesn't trigger a duplicate", async () => {
  const openRequests = [{ number: 5, body: bodyWith("https://other.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://mine.example/e/2"), number: 6 }, dupLists, openRequests);
  assert.equal(res.skipAgent, false);
});

test("without the current issue number the duplicate check fails open (proceeds)", async () => {
  const openRequests = [{ number: 1, body: bodyWith("https://dup.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/9") }, dupLists, openRequests);
  assert.equal(res.skipAgent, false);
});

test("a settled listing wins over a sample (denylist beats the dup check)", async () => {
  const lists = { sourceFallbackAllowlist: [], sourceFallbackDenylist: ["dup.example"], supportedDomains: [] };
  const openRequests = [{ number: 1, body: bodyWith("https://dup.example/e/1") }];
  const res = await runTriage({ body: bodyWith("https://dup.example/e/2"), number: 9 }, lists, openRequests);
  assert.equal(res.reason, "deny");
});

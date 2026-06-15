// Offline unit tests for the auto-extractor pre-flight triage
// (tools/triage-extractor-request.js): the workflow step that closes a request
// whose host is already on config.js's fallback allow/denylist, before spending
// an agent run. Lists are injected so the cases don't depend on the shipped
// (empty) config; the host-matching itself is covered in popup-content.test.js.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { firstUrl, runTriage } = require("../../tools/triage-extractor-request");

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

test("with the shipped (empty) config, no host is triaged", async () => {
  const res = await runTriage({ body: bodyWith("https://anything.example/e/1") }); // default lists
  assert.equal(res.triaged, false);
});

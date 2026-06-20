// Offline unit tests for tools/new-extractors-creation/resolve-source.js: the
// host → existing-source-file lookup the auto-implement-extractor "supported"
// mode uses to add a fresh integration case to a host's already-shipped source.
// The point of the resolver is that the file name is NOT the slug, so these
// assert the real sources map a host to the right FILE via their own matches().
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hostOf, resolveSourceBaseName } = require("../../tools/new-extractors-creation/resolve-source");

test("hostOf strips scheme/www and accepts a bare host", () => {
  assert.equal(hostOf("https://www.cinema.co.il/x/"), "cinema.co.il");
  assert.equal(hostOf("cinema.co.il"), "cinema.co.il");
  assert.equal(hostOf("www.eventbrite.com"), "eventbrite.com");
  assert.equal(hostOf(""), "");
  assert.equal(hostOf("not a host"), "");
});

test("a host whose source file name is NOT its slug resolves to the real file", () => {
  // The whole reason the resolver exists: cinema.co.il (slug "cinema") is served
  // by telavivcinematheque.js, so deriving the path from the slug would be wrong.
  assert.equal(resolveSourceBaseName("https://www.cinema.co.il/event/1"), "telavivcinematheque");
});

test("hosts whose file name matches their slug still resolve", () => {
  assert.equal(resolveSourceBaseName("https://www.eventbrite.com/e/x-123"), "eventbrite");
  assert.equal(resolveSourceBaseName("https://www.meetup.com/g/events/1/"), "meetup");
});

test("a subdomain of a supported host resolves to the same source", () => {
  assert.equal(resolveSourceBaseName("https://sub.eventbrite.com/e/x-123"), "eventbrite");
});

test("an unsupported host resolves to '' (no source owns it)", () => {
  assert.equal(resolveSourceBaseName("https://no-such-host.example/e/1"), "");
  assert.equal(resolveSourceBaseName(""), "");
});

test("the resolved file actually exists on disk", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const base = resolveSourceBaseName("https://www.cinema.co.il/event/1");
  assert.ok(fs.existsSync(path.join(__dirname, "..", "..", "pipeline", "sources", `${base}.js`)));
});

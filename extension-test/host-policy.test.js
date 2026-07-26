// Contract for host-policy.js — the host classifier for the core generic
// extractor, used by the popup (popup.js's chooseContent) and the auto-extractor
// triage. Two exports:
//   - isPresentableEvent — a scraped scraped event is only worth showing
//     when it carries all three main fields (title, location AND a start time);
//   - classifyHost — "deny" / "allow" / "none" for a host against the unsupported-host
//     allow/deny lists, apex- and subdomain-aware.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// host-policy.js is an ES module; import it before the tests run.
let classifyHost, isSupportedDomain, isPresentableEvent;
before(async () => {
  ({ classifyHost, isSupportedDomain, isPresentableEvent } = await import(
    pathToFileURL(path.join(__dirname, "..", "extension", "host-policy.js"))
  ));
});

// A complete scraped event (presentable); and one missing a location (not).
const FULL = { title: "Some Show", location: "The Venue", start: "2026-07-01T20:00:00" };
const NO_LOCATION = { title: "Some Show", start: "2026-07-01T20:00:00" };

// --- isPresentableEvent: all three main fields required ---

test("a scraped event needs title, location AND start to be presentable", () => {
  assert.equal(isPresentableEvent(FULL), true);
  assert.equal(isPresentableEvent(NO_LOCATION), false); // no location
  assert.equal(isPresentableEvent({ title: "T", location: "L" }), false); // no start
  assert.equal(isPresentableEvent({ location: "L", start: "2026-07-01" }), false); // no title
  assert.equal(isPresentableEvent(undefined), false);
});

// --- classifyHost: against injected lists ---

const LISTS = { unsupportedAllowlist: ["good.example"], unsupportedDenylist: ["bad.example"] };

test("classifyHost matches a host, its www, and its subdomains", () => {
  assert.equal(classifyHost("https://bad.example/x", LISTS), "deny");
  assert.equal(classifyHost("https://www.bad.example/x", LISTS), "deny");
  assert.equal(classifyHost("https://sub.bad.example/x", LISTS), "deny");
  assert.equal(classifyHost("https://good.example/x", LISTS), "allow");
  assert.equal(classifyHost("https://other.example/x", LISTS), "none");
});

test("classifyHost does not match a near-miss host", () => {
  assert.equal(classifyHost("https://notbad.example/x", LISTS), "none");
  assert.equal(classifyHost("https://bad.example.evil.com/x", LISTS), "none");
});

test("classifyHost: deny wins when a host is on both lists", () => {
  const both = { unsupportedAllowlist: ["x.example"], unsupportedDenylist: ["x.example"] };
  assert.equal(classifyHost("https://x.example/", both), "deny");
});

test("classifyHost: an unparseable URL is unclassified (none)", () => {
  assert.equal(classifyHost("chrome://extensions", LISTS), "none");
  assert.equal(classifyHost("", LISTS), "none");
});

test("classifyHost uses the shipped config by default (meetup.com allow, cnn.com deny)", () => {
  assert.equal(classifyHost("https://www.meetup.com/some-group/events/123/"), "allow");
  assert.equal(classifyHost("https://cnn.com/2026/01/01/some-article"), "deny");
  assert.equal(classifyHost("https://unlisted.example/e/1"), "none");
});

// --- isSupportedDomain -------------------------------------------------------
// THE answer to "do we support this host". It is load-bearing in two places that
// must agree: the popup reads it to pick its render state, and the toolbar
// service worker colors the icon from the very same `supportedDomains` list. It
// is NOT derived from the extractors — a host we support may have a per-site
// source under event-extractors/custom/, or none at all where the core generic
// extractor already reads its pages correctly.
const SUPPORTED = { supportedDomains: ["example.com"] };

test("isSupportedDomain matches a host, its www, and its subdomains", () => {
  assert.equal(isSupportedDomain("https://example.com/e/1", SUPPORTED), true);
  assert.equal(isSupportedDomain("https://www.example.com/e/1", SUPPORTED), true);
  assert.equal(isSupportedDomain("https://tickets.example.com/e/1", SUPPORTED), true);
});

test("isSupportedDomain does not match a near-miss host or an unparseable URL", () => {
  assert.equal(isSupportedDomain("https://notexample.com/e/1", SUPPORTED), false);
  assert.equal(isSupportedDomain("https://example.com.evil.test/e/1", SUPPORTED), false);
  assert.equal(isSupportedDomain("chrome://extensions", SUPPORTED), false);
});

test("isSupportedDomain answers for a host we support with NO per-site extractor", () => {
  // stubhub.com has no event-extractors/custom/ file — the core generic extractor
  // reads it — and it is supported all the same, straight off the shipped list.
  assert.equal(isSupportedDomain("https://www.stubhub.com/event/154321/"), true);
  // …exactly as for a host that does have one.
  assert.equal(isSupportedDomain("https://www.meetup.com/g/events/1/"), true);
  assert.equal(isSupportedDomain("https://unlisted.example/e/1"), false);
});

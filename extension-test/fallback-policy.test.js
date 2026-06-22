// Contract for fallback-policy.js — the classifier for the generic FALLBACK
// extractor, used by the popup (popup.js's chooseContent) and the auto-extractor
// triage. Two exports:
//   - isPresentableFallbackEvent — a scraped fallback event is only worth showing
//     when it carries all three main fields (title, location AND a start time);
//   - classifyHost — "deny" / "allow" / "none" for a host against the fallback
//     allow/deny lists, apex- and subdomain-aware.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// fallback-policy.js is an ES module; import it before the tests run.
let classifyHost, isPresentableFallbackEvent;
before(async () => {
  ({ classifyHost, isPresentableFallbackEvent } = await import(
    pathToFileURL(path.join(__dirname, "..", "extension", "fallback-policy.js"))
  ));
});

// A complete fallback event (presentable); and one missing a location (not).
const FULL = { title: "Some Show", location: "The Venue", start: "2026-07-01T20:00:00" };
const NO_LOCATION = { title: "Some Show", start: "2026-07-01T20:00:00" };

// --- isPresentableFallbackEvent: all three main fields required ---

test("a fallback event needs title, location AND start to be presentable", () => {
  assert.equal(isPresentableFallbackEvent(FULL), true);
  assert.equal(isPresentableFallbackEvent(NO_LOCATION), false); // no location
  assert.equal(isPresentableFallbackEvent({ title: "T", location: "L" }), false); // no start
  assert.equal(isPresentableFallbackEvent({ location: "L", start: "2026-07-01" }), false); // no title
  assert.equal(isPresentableFallbackEvent(undefined), false);
});

// --- classifyHost: against injected lists ---

const LISTS = { sourceFallbackAllowlist: ["good.example"], sourceFallbackDenylist: ["bad.example"] };

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
  const both = { sourceFallbackAllowlist: ["x.example"], sourceFallbackDenylist: ["x.example"] };
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

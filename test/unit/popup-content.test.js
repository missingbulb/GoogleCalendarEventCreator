// Contract for popup.js's chooseContent() — the single decision behind what the
// popup renders — plus the host classifier (classifyHost) and presentability
// gate (isPresentableFallbackEvent) it leans on.
//
// The popup renders three things off chooseContent's { events, request,
// policyLink }: event buttons, a "request support" button (seeded with an
// event), and a quiet "Disagree?" link to the public policy doc. The five
// states (issue #192):
//
//   1 supported host                        -> events only
//   2 unsupported, no presentable fallback  -> policy link only
//   3 unsupported, presentable, allowlisted -> events only (no support ask)
//   4 unsupported, presentable, denylisted  -> policy link only (event suppressed)
//   5 unsupported, presentable, unlisted    -> events + request button
//
// This supersedes the strict #101 rule that an unsupported host must NEVER
// surface a scraped event: #192 deliberately shows a *complete* fallback event
// (title + location + start) on an unsupported host. What still holds from #101
// is that `supported` (which colors the toolbar icon) is untouched — we never
// relabel such a host "supported"; the icon stays blue while the popup, which
// alone runs extraction, may show the event.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// Both are ES modules. chooseContent lives in the popup controller (popup.js),
// whose init() only runs when a real `document` exists, so importing it in Node
// is side-effect-free; the shared host classifier and presentability gate live
// in fallback-policy.js.
let chooseContent, classifyHost, isPresentableFallbackEvent;
before(async () => {
  ({ chooseContent } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "ui", "popup.js"))
  ));
  ({ classifyHost, isPresentableFallbackEvent } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "fallback-policy.js"))
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

test("classifyHost defaults to the shipped config — with empty lists, every host is unlisted", () => {
  assert.equal(classifyHost("https://anything.example/"), "none");
});

// --- chooseContent: the five states ---

test("State 1 — supported host: events only, no request, no policy link", () => {
  const view = chooseContent({ events: [FULL], supported: true }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 1 — supported host with no events: empty events, no extras", () => {
  const view = chooseContent({ events: [], supported: true }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 2 — unsupported, nothing presentable (no location): policy link only", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: false }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, true);
});

test("State 2 — unsupported, no events at all: policy link only", () => {
  const view = chooseContent({ events: [], supported: false }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.policyLink, true);
});

test("State 3 — unsupported, presentable, allowlisted: events only, NO request", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "allow");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 4 — unsupported, presentable, denylisted: event suppressed, policy link", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "deny");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, true);
});

test("State 5 — unsupported, presentable, unlisted: events AND a request button seeded with the event", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
  assert.equal(view.policyLink, false);
});

test("only presentable fallback events are shown; incomplete ones are dropped", () => {
  const view = chooseContent({ events: [NO_LOCATION, FULL], supported: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
});

test("a failed injection (restricted page, no result) shows the policy link", () => {
  const view = chooseContent({}, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, true);
});

test("chooseContent defaults listing to 'none' when omitted", () => {
  const view = chooseContent({ events: [FULL], supported: false }); // -> State 4
  assert.equal(view.request, FULL);
  assert.deepEqual(view.events, [FULL]);
});

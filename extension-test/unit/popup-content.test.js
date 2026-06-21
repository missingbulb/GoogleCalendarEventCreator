// Contract for popup.js's chooseContent() — the single decision behind what the
// popup renders — plus the host classifier (classifyHost) and presentability
// gate (isPresentableFallbackEvent) it leans on.
//
// The popup renders three things off chooseContent's { events, request,
// policyLink }: event buttons, a "request support" button (seeded with an
// event), and a quiet "Disagree?" link to the public policy doc. The five
// states, in the order they're decided (issue #192):
//
//   1  supported host                    -> events only
//   1b supported host, dedicated source   -> the generic fallback's events +
//      found nothing (#456)                  a "Suggest Correction" request link
//   2  denylisted host                   -> "No events found" (no link, no prompt)
//   3  not denylisted, nothing complete  -> "No events found" + Disagree? link
//   4  complete event, allowlisted       -> events only (no support ask)
//   5  complete event, on neither list   -> events + request button
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
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "ui", "popup.js"))
  ));
  ({ classifyHost, isPresentableFallbackEvent } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "fallback-policy.js"))
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

// --- State 1b: supported host whose dedicated source found nothing (#456) ---
// The orchestrator (assemble-events.js) sets `fallback: true` when a SUPPORTED
// host's dedicated source returned no events and it therefore ran the generic
// extractor. The popup shows the fallback's complete events WITH the "Suggest
// Correction" link (the dedicated source missed them — a correction is exactly
// what we want), regardless of the host's allow/deny listing.

test("State 1b — supported host, dedicated source empty, fallback found a complete event: events AND a request link", () => {
  const view = chooseContent({ events: [FULL], supported: true, fallback: true }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
  assert.equal(view.policyLink, false);
});

test("State 1b — the correction link shows even on an allowlisted supported host", () => {
  // meetup.com is both supported AND allowlisted; a dedicated miss is still a
  // defect worth reporting, so the request link shows regardless of listing.
  const view = chooseContent({ events: [FULL], supported: true, fallback: true }, "allow");
  assert.equal(view.request, FULL);
});

test("State 1b — fallback found only an incomplete event: bare empty state, no link", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: true, fallback: true }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false); // a supported host isn't disputing policy
});

test("State 1 — a supported host's OWN events (fallback false) get no correction link", () => {
  const view = chooseContent({ events: [FULL], supported: true, fallback: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 2 — denylisted host: 'No events found' with NO link or prompt, even with a complete event", () => {
  // The denylist decision holds regardless of what the fallback scraped.
  const view = chooseContent({ events: [FULL], supported: false }, "deny");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false); // no "Disagree?" — the call was deliberate
});

test("State 2 — denylisted host with nothing scraped: still no link or prompt", () => {
  const view = chooseContent({ events: [], supported: false }, "deny");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 3 — not denylisted, nothing complete (no location): policy link", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: false }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, true);
});

test("State 3 — allowlisted but nothing complete: still the policy link (allow only matters once an event is found)", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: false }, "allow");
  assert.equal(view.events.length, 0);
  assert.equal(view.policyLink, true);
});

test("State 3 — not denylisted, no events at all: policy link", () => {
  const view = chooseContent({ events: [], supported: false }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.policyLink, true);
});

test("State 4 — complete event, allowlisted: events only, NO request", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "allow");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 5 — complete event, on neither list: events AND a request button seeded with the event", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
  assert.equal(view.policyLink, false);
});

test("only complete fallback events are shown; incomplete ones are dropped", () => {
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
  const view = chooseContent({ events: [FULL], supported: false }); // -> State 5
  assert.equal(view.request, FULL);
  assert.deepEqual(view.events, [FULL]);
});

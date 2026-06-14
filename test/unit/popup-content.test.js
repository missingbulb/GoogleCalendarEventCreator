// Regression test for issue #101: the popup and the toolbar icon must agree.
// popup.js's chooseContent() is the single decider for what the popup renders,
// driven by the injected result's `supported` flag (set by assemble-events.js
// from the same GCal.isSupportedHost check that colors the icon). On an
// unsupported host it must NEVER return event buttons — even when the
// generic/JSON-LD layers scraped an event off the page — only the
// "request this source" flow. On a supported host it surfaces the events.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// popup.js is an ES module; import chooseContent before the tests run. Its
// controller only runs when a real `document` exists, so importing it in Node
// is side-effect-free.
let chooseContent;
before(async () => {
  ({ chooseContent } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "ui", "popup.js"))
  ));
});

const SCRAPED = { title: "Some Show", start: "2026-07-01T20:00:00" };

test("supported host with events surfaces them", () => {
  const view = chooseContent({ events: [SCRAPED], supported: true });
  assert.equal(view.mode, "events");
  assert.deepEqual(view.events, [SCRAPED]);
});

test("supported host with no events still shows the events view (empty)", () => {
  const view = chooseContent({ events: [], supported: true });
  assert.equal(view.mode, "events");
  assert.equal(view.events.length, 0);
});

test("unsupported host never surfaces scraped events — only the request flow", () => {
  // The reported bug: an unsupported event site (no badge) where the
  // generic/JSON-LD layers returned an event, which used to render a button.
  const view = chooseContent({ events: [SCRAPED], supported: false });
  assert.equal(view.mode, "request");
  assert.equal(view.prefill, SCRAPED); // seeds the request form, not a button
});

test("unsupported host with nothing scraped also shows the request flow", () => {
  const view = chooseContent({ events: [], supported: false });
  assert.equal(view.mode, "request");
  assert.equal(view.prefill, undefined);
});

test("a failed injection (restricted page, no result) shows the request flow", () => {
  const view = chooseContent({});
  assert.equal(view.mode, "request");
  assert.equal(view.prefill, undefined);
});

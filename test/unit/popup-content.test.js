// Regression test for issue #101: the popup and the toolbar icon must agree.
// popup.js's chooseContent() is the single decider for what the popup renders,
// derived from the same GCal.isSupportedHost check that colors the icon. On an
// unsupported host it must NEVER return event buttons — even when the
// generic/JSON-LD layers scraped an event off the page — only the
// "request this source" flow. On a supported host it surfaces the events.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Load the real site-hosts.js (defines GCal.isSupportedHost) and popup.js into
// one sandbox. popup.js's top-level IIFE throws (no document/chrome here) but
// is caught by its own .catch(), leaving chooseContent() on the sandbox.
function loadChooseContent() {
  const sandbox = { URL, console: { error() {} } };
  vm.createContext(sandbox);
  for (const file of ["extractors/site-hosts.js", "popup.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8"), sandbox);
  }
  return sandbox.chooseContent;
}

const chooseContent = loadChooseContent();

const SCRAPED = { events: [{ title: "Some Show", start: "2026-07-01T20:00:00" }] };

test("supported host with events surfaces them", () => {
  const view = chooseContent("https://www.meetup.com/g/events/123/", SCRAPED);
  assert.equal(view.mode, "events");
  assert.deepEqual(view.events, SCRAPED.events);
});

test("supported host with no events still shows the events view (empty)", () => {
  const view = chooseContent("https://www.meetup.com/g/events/123/", { events: [] });
  assert.equal(view.mode, "events");
  assert.equal(view.events.length, 0);
});

test("unsupported host never surfaces scraped events — only the request flow", () => {
  // The reported bug: an unsupported event site (red border) where the
  // generic/JSON-LD layers returned an event, which used to render a button.
  const view = chooseContent("https://www.songkick.com/concerts/123456-some-artist", SCRAPED);
  assert.equal(view.mode, "request");
  assert.equal(view.prefill, SCRAPED.events[0]); // seeds the request form, not a button
});

test("unsupported host with nothing scraped also shows the request flow", () => {
  const view = chooseContent("https://www.blog.example/article", { events: [] });
  assert.equal(view.mode, "request");
  assert.equal(view.prefill, undefined);
});

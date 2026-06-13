// Offline unit tests for background.js's source-request URL building: the
// prefilled GitHub "new issue" link the popup opens on an unsupported page
// (popup.js's makeSourceRequestButton).
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Evaluate background.js as global code so its function declarations land on
// globalThis.
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "..", "..", "background.js"), "utf8"));
const { buildSourceRequestUrl } = globalThis;

const PREFILL = {
  url: "https://example.com/events/picnic",
  name: "Summer Picnic",
  start: "2026-06-25T18:00:00",
  end: "",
  timezone: "America/New_York",
  location: "Prospect Park",
  description: "Bring food.",
};

test("opens the repo's GitHub new-issue page", () => {
  const u = new URL(buildSourceRequestUrl(PREFILL));
  assert.equal(u.origin + u.pathname, "https://github.com/missingbulb/GoogleCalendarEventCreator/issues/new");
});

test("prefills the issue title with the page URL", () => {
  const title = new URL(buildSourceRequestUrl(PREFILL)).searchParams.get("title");
  assert.equal(title, `New event source request - ${PREFILL.url}`);
});

test("prefills the body with the request and every event field", () => {
  const body = new URL(buildSourceRequestUrl(PREFILL)).searchParams.get("body");
  assert.match(body, new RegExp(`Please add this as a new source: ${PREFILL.url.replace(/[.\/]/g, "\\$&")}`));
  assert.match(body, /write an integration test that asserts the following values/);
  assert.match(body, /- URL: https:\/\/example\.com\/events\/picnic/);
  assert.match(body, /- Name: Summer Picnic/);
  assert.match(body, /- Start time: 2026-06-25T18:00:00/);
  assert.match(body, /- Timezone: America\/New_York/);
  assert.match(body, /- Location: Prospect Park/);
  assert.match(body, /- Description: Bring food\./);
});

test("marks unknown fields rather than dropping them, so the user can fill them in", () => {
  const body = new URL(buildSourceRequestUrl(PREFILL)).searchParams.get("body");
  // PREFILL.end is empty.
  assert.match(body, /- End time: \(unknown — please fill in\)/);
});

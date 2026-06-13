// Offline unit tests for background.js's source-request URL building: the
// prefilled GitHub issue-form link the popup opens on an unsupported page
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

test("opens the repo's issue form, labeled new-source", () => {
  const u = new URL(buildSourceRequestUrl(PREFILL));
  assert.equal(u.origin + u.pathname, "https://github.com/missingbulb/GoogleCalendarEventCreator/issues/new");
  assert.equal(u.searchParams.get("template"), "new-source-request.yml");
  assert.equal(u.searchParams.get("labels"), "new-source");
});

test("prefills the issue title with the page URL", () => {
  const title = new URL(buildSourceRequestUrl(PREFILL)).searchParams.get("title");
  assert.equal(title, `New event source request - ${PREFILL.url}`);
});

test("prefills each form field from the matching prefill value", () => {
  const p = new URL(buildSourceRequestUrl(PREFILL)).searchParams;
  assert.equal(p.get("url"), PREFILL.url);
  assert.equal(p.get("name"), PREFILL.name);
  assert.equal(p.get("start"), PREFILL.start);
  assert.equal(p.get("timezone"), PREFILL.timezone);
  assert.equal(p.get("location"), PREFILL.location);
  assert.equal(p.get("description"), PREFILL.description);
});

test("omits empty fields so the user fills them in on the form", () => {
  // PREFILL.end is empty.
  assert.equal(new URL(buildSourceRequestUrl(PREFILL)).searchParams.has("end"), false);
});

test("the prefilled field ids match the template's field ids", () => {
  const template = fs.readFileSync(
    path.join(__dirname, "..", "..", ".github", "ISSUE_TEMPLATE", "new-source-request.yml"),
    "utf8"
  );
  const templateIds = [...template.matchAll(/^\s*id:\s*(\S+)/gm)].map((m) => m[1]);
  const PARAM_KEYS = ["url", "name", "start", "end", "timezone", "location", "description"];
  assert.deepEqual(templateIds, PARAM_KEYS);
});

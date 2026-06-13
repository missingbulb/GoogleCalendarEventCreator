// Offline unit tests for background.js's source-request form URL building:
// the embedded, prefilled Google Form link the popup shows on an unsupported
// page (popup.js's showSourceRequestForm).
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Evaluate background.js as global code so its declarations (including the
// mutable SOURCE_REQUEST_FORM config) land on globalThis.
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

test("returns an empty string until the form is configured (no baseUrl)", () => {
  SOURCE_REQUEST_FORM.baseUrl = "";
  assert.equal(buildSourceRequestUrl(PREFILL), "");
});

test("builds an embedded, prefilled Google Form URL", () => {
  SOURCE_REQUEST_FORM.baseUrl = "https://docs.google.com/forms/d/e/FORM/viewform";
  SOURCE_REQUEST_FORM.entries = {
    url: "entry.1",
    name: "entry.2",
    start: "entry.3",
    end: "entry.4",
    timezone: "entry.5",
    location: "entry.6",
    description: "entry.7",
  };

  const u = new URL(buildSourceRequestUrl(PREFILL));
  assert.equal(u.origin + u.pathname, "https://docs.google.com/forms/d/e/FORM/viewform");
  assert.equal(u.searchParams.get("embedded"), "true");
  assert.equal(u.searchParams.get("entry.1"), PREFILL.url);
  assert.equal(u.searchParams.get("entry.2"), PREFILL.name);
  assert.equal(u.searchParams.get("entry.3"), PREFILL.start);
  assert.equal(u.searchParams.get("entry.5"), PREFILL.timezone);
  assert.equal(u.searchParams.get("entry.6"), PREFILL.location);
  // Empty values are omitted rather than sent as blank params...
  assert.equal(u.searchParams.has("entry.4"), false);
  // ...and so are fields whose entry id hasn't been mapped yet.
  SOURCE_REQUEST_FORM.entries.location = "";
  assert.equal(new URL(buildSourceRequestUrl(PREFILL)).searchParams.has("entry.6"), false);
});

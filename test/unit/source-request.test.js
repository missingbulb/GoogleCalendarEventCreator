// Offline unit tests for the source-request URL building: the prefilled GitHub
// issue-form link the popup opens on an unsupported page (the
// ui/views/source-request-view.js makeSourceRequestLink flow).
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// source-request-view.js is an ES module; import it before the tests run.
let buildSourceRequestUrl, buildPolicyDocUrl, sourceRequestPrefill;
before(async () => {
  ({ buildSourceRequestUrl, buildPolicyDocUrl, sourceRequestPrefill } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "ui", "views", "source-request-view.js"))
  ));
});

const PREFILL = {
  url: "https://example.com/events/picnic",
  name: "Summer Picnic",
  start: "2026-06-25T18:00:00",
  end: "",
  timezone: "America/New_York",
  location: "Prospect Park",
  description: "Bring food.",
};

test("opens the repo's issue form, labeled extractor-request", () => {
  const u = new URL(buildSourceRequestUrl(PREFILL));
  assert.equal(u.origin + u.pathname, "https://github.com/missingbulb/GoogleCalendarEventCreator/issues/new");
  assert.equal(u.searchParams.get("template"), "extractor-request.yml");
  assert.equal(u.searchParams.get("labels"), "extractor-request");
});

test("prefills the issue title with the page's apex domain, not the full URL", () => {
  const title = new URL(buildSourceRequestUrl(PREFILL)).searchParams.get("title");
  // PREFILL.url is https://example.com/events/picnic -> apex example.com.
  assert.equal(title, "Event source request - example.com");
});

test("strips subdomains and tracking params from the title down to the apex domain", () => {
  const url = "https://dash.datadoghq.com/?utm_source=events&_gl=1*16jytk3";
  const title = new URL(buildSourceRequestUrl({ ...PREFILL, url })).searchParams.get("title");
  assert.equal(title, "Event source request - datadoghq.com");
});

test("keeps a compound public suffix in the apex domain", () => {
  const url = "https://events.company.co.uk/whats-on";
  const title = new URL(buildSourceRequestUrl({ ...PREFILL, url })).searchParams.get("title");
  assert.equal(title, "Event source request - company.co.uk");
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
    path.join(__dirname, "..", "..", ".github", "ISSUE_TEMPLATE", "extractor-request.yml"),
    "utf8"
  );
  const templateIds = [...template.matchAll(/^\s*id:\s*(\S+)/gm)].map((m) => m[1]);
  const PARAM_KEYS = ["url", "name", "start", "end", "timezone", "location", "description"];
  assert.deepEqual(templateIds, PARAM_KEYS);
});

// The prefill seeds the timezone from the fallback event's ctz, but falls back
// to the user's current zone when the fallback found none (so the form opens
// with a sensible guess instead of a blank timezone).
test("prefills the timezone from the extracted event's ctz", () => {
  const p = sourceRequestPrefill(
    { url: "https://example.com/e", title: "T" },
    { ctz: "Europe/Paris" }
  );
  assert.equal(p.timezone, "Europe/Paris");
});

test("defaults the timezone to the user's current zone when the fallback found none", () => {
  const here = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  // No ctz on the event, and an event-less page, both default to the runtime zone.
  assert.equal(sourceRequestPrefill({ url: "https://example.com/e" }, {}).timezone, here);
  assert.equal(sourceRequestPrefill({ url: "https://example.com/e" }, null).timezone, here);
});

// The "Disagree?" policy link (makePolicyLink) opens the public policy doc.
// (Hostname/path asserted without repeating the repo slug literal — that string
// is single-sourced; see test/uber/shared_constants/repo-slug.json.)
test("the policy-doc link points at a markdown doc in this repo on github.com", () => {
  const u = new URL(buildPolicyDocUrl());
  assert.equal(u.hostname, "github.com");
  assert.ok(u.pathname.endsWith("/extraction-policy.md"), `unexpected policy path: ${u.pathname}`);
});

test("the policy doc the link points at actually exists on disk (the link can't rot)", () => {
  // .../blob/<branch>/<repo-relative-path>
  const m = new URL(buildPolicyDocUrl()).pathname.match(/\/blob\/[^/]+\/(.+)$/);
  assert.ok(m, "policy URL must be a /blob/<branch>/<path> link");
  const docPath = path.join(__dirname, "..", "..", m[1]);
  assert.ok(fs.existsSync(docPath), `policy doc missing on disk: ${m[1]}`);
});

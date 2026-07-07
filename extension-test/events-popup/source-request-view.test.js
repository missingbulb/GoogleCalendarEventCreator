// Offline unit tests for the source-request URL building: the prefilled GitHub
// issue-form link the popup opens on an unsupported page (the
// events-popup/source-request-view.js makeSourceRequestLink flow).
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// source-request-view.js is an ES module; import it before the tests run.
let buildSourceRequestUrl, buildIssueUrl, sourceRequestPrefill, POLICY_EXPLANATION;
before(async () => {
  ({ buildSourceRequestUrl, buildIssueUrl, sourceRequestPrefill, POLICY_EXPLANATION } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "events-popup", "source-request-view.js"))
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

// The compound-suffix rule is country-independent: a generic registry label
// (co/com/gov/ac/...) under any two-letter ccTLD keeps three labels, so these
// all resolve without naming a single country in the code.
test("keeps a compound public suffix in the apex domain (co.uk)", () => {
  const url = "https://events.company.co.uk/whats-on";
  const title = new URL(buildSourceRequestUrl({ ...PREFILL, url })).searchParams.get("title");
  assert.equal(title, "Event source request - company.co.uk");
});

test("keeps a gov.il compound suffix without a country-specific list", () => {
  const url = "https://visit.tel-aviv.gov.il/Pages/EventLocation.aspx?ItemId=2173";
  const title = new URL(buildSourceRequestUrl({ ...PREFILL, url })).searchParams.get("title");
  assert.equal(title, "Event source request - tel-aviv.gov.il");
});

test("keeps a com.au compound suffix (same generic rule, different country)", () => {
  const url = "https://tickets.somevenue.com.au/show/42";
  const title = new URL(buildSourceRequestUrl({ ...PREFILL, url })).searchParams.get("title");
  assert.equal(title, "Event source request - somevenue.com.au");
});

test("treats a two-letter ccTLD used as a plain gTLD as a normal apex (dice.fm)", () => {
  const url = "https://dice.fm/event/abc-some-show-tickets";
  const title = new URL(buildSourceRequestUrl({ ...PREFILL, url })).searchParams.get("title");
  assert.equal(title, "Event source request - dice.fm");
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

// Parse the template's fields into { type, id } records (type precedes id in
// each "- type:" block).
function templateFields() {
  const template = fs.readFileSync(
    path.join(__dirname, "..", "..", ".github", "ISSUE_TEMPLATE", "extractor-request.yml"),
    "utf8"
  );
  return template
    .split(/^\s*-\s*type:\s*/m)
    .slice(1)
    .map((block) => {
      const type = block.split("\n")[0].trim();
      const id = (block.match(/^\s*id:\s*(\S+)/m) || [])[1];
      return { type, id, block };
    });
}

test("the prefilled field ids match the template's prefillable field ids", () => {
  // input/textarea/dropdown fields accept a URL-prefilled value (a checkboxes
  // field would not); each such id must be a prefill key and vice versa.
  const prefillableIds = templateFields()
    .filter((f) => ["input", "textarea", "dropdown"].includes(f.type))
    .map((f) => f.id)
    .sort();
  const PARAM_KEYS = [
    "url", "name", "start", "end", "timezone", "location", "description", "event-count",
    "wait-selector",
  ].sort();
  assert.deepEqual(prefillableIds, PARAM_KEYS);
});

test("prefills the wait-selector, and omits it from the URL when empty", () => {
  // Seeded with the selector the popup derived from the live page (#603).
  assert.equal(sourceRequestPrefill(PREFILL, {}, 1, "#eventDescription")["wait-selector"], "#eventDescription");
  // Absent/empty -> "" in the prefill, and buildSourceRequestUrl drops empty keys.
  assert.equal(sourceRequestPrefill(PREFILL, {}, 1)["wait-selector"], "");
  const params = new URL(buildSourceRequestUrl(sourceRequestPrefill(PREFILL, {}, 1))).searchParams;
  assert.equal(params.has("wait-selector"), false);
  const seeded = new URL(
    buildSourceRequestUrl(sourceRequestPrefill(PREFILL, {}, 1, "#eventDescription"))
  ).searchParams;
  assert.equal(seeded.get("wait-selector"), "#eventDescription");
});

test("the event-count field is a prefillable text input defaulting to 1", () => {
  const field = templateFields().find((f) => f.id === "event-count");
  // GitHub only prefills text fields, so this must be an `input` (a dropdown's
  // query-param prefill is silently ignored).
  assert.equal(field.type, "input");
  const value = (field.block.match(/^\s*value:\s*"([^"]*)"/m) || [])[1];
  assert.equal(value, "1");
});

test("prefills the detected event count, defaulting to 1", () => {
  assert.equal(sourceRequestPrefill(PREFILL, {}, 1)["event-count"], "1");
  assert.equal(sourceRequestPrefill(PREFILL, {}, 3)["event-count"], "3");
  // Never below 1 — the link only appears once a complete event was found.
  assert.equal(sourceRequestPrefill(PREFILL, {}, 0)["event-count"], "1");
  // Defaults to 1 when no count is given.
  assert.equal(sourceRequestPrefill(PREFILL, {})["event-count"], "1");
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

// The inline explanation's "open an issue" link opens a blank issue on this repo.
// (Hostname/path asserted without repeating the repo slug literal — that string is
// single-sourced; see dev/procedures/test/uber/shared_constants/repo-slug.json.)
test("the \"open an issue\" link points at a blank new-issue form in this repo on github.com", () => {
  const u = new URL(buildIssueUrl());
  assert.equal(u.hostname, "github.com");
  assert.ok(u.pathname.endsWith("/issues/new"), `unexpected issue path: ${u.pathname}`);
  assert.equal(u.search, "", "a blank issue — no template/labels, unlike the source-request form");
});

// Drift guard: the popup renders POLICY_EXPLANATION inline (buildPolicyPanel), and
// the public extraction-policy.md doc must say the same thing. Assert the doc still
// carries the heading, every paragraph the popup shows, and the same issue link —
// so the popup copy and the doc can't diverge (and, implicitly, that the doc still
// exists). extraction-policy.md is the single reviewed source of these words.
test("extraction-policy.md stays in sync with the popup's inline explanation", () => {
  const md = fs.readFileSync(path.join(__dirname, "..", "..", "extraction-policy.md"), "utf8");
  const heading = md.match(/^#\s+(.+)$/m);
  assert.ok(heading, "extraction-policy.md must have an H1 heading");
  assert.equal(heading[1].trim(), POLICY_EXPLANATION.heading, "the doc H1 drifted from the popup heading");

  const link = md.match(/\[([^\]]+)\]\(([^)]+)\)/);
  assert.ok(link, "extraction-policy.md must carry a markdown link");
  assert.equal(link[1], POLICY_EXPLANATION.issueLinkText, "the doc link text drifted from the popup CTA");
  assert.equal(link[2], buildIssueUrl(), "the doc link URL drifted from the popup's issue URL");

  // The doc as plain text (heading line dropped, links reduced to their text,
  // whitespace collapsed) must contain every paragraph the popup shows.
  const plain = md
    .replace(/^#\s+.+$/m, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  for (const para of POLICY_EXPLANATION.paragraphs) {
    assert.ok(plain.includes(para), `extraction-policy.md is missing the popup paragraph:\n  "${para}"`);
  }
});

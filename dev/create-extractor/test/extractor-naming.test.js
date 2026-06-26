// Unit tests for dev/create-extractor/extractor-naming.js — the deterministic slug/caseName
// the auto-implement-extractor workflow derives from an event URL (so the
// branch + cache files can be created before the agent runs). Pure host logic,
// no I/O.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hostname, slugFor, matchesRegexFor, namesFor } = require("../extractor-naming");

test("slugFor strips www + a single TLD", () => {
  assert.equal(slugFor("https://www.axs.com/event/123"), "axs");
  assert.equal(slugFor("https://seatgeek.com/concert-tickets"), "seatgeek");
  assert.equal(slugFor("https://dice.fm/event/abc"), "dice");
  assert.equal(slugFor("https://www.livenation.de/muse-tickets"), "livenation");
});

test("slugFor keeps the subdomain but drops a compound public suffix", () => {
  assert.equal(slugFor("https://visit.tel-aviv.gov.il/Pages/x?ItemId=1"), "visit-tel-aviv");
  assert.equal(slugFor("https://events.datadoghq.com/events/x/"), "events-datadoghq");
  assert.equal(slugFor("https://dash.datadoghq.com/?utm=1"), "dash-datadoghq");
});

test("slugFor sanitizes to filesystem-/branch-safe characters", () => {
  // No leading/trailing/doubled hyphens, lowercase only.
  assert.match(slugFor("https://Foo_Bar.example.com/x"), /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.equal(slugFor("https://foo_bar.example.com/x"), "foo-bar-example");
});

test("a host with no name in front of the TLD degrades gracefully", () => {
  assert.equal(slugFor("https://example.com"), "example");
});

test("an unparseable URL yields empty names (the workflow stops on empty)", () => {
  assert.equal(slugFor("not a url"), "");
  assert.equal(hostname("not a url"), "");
  assert.deepEqual(namesFor("not a url"), { host: "", slug: "", caseName: "", matchesRegex: "" });
});

test("matchesRegexFor escapes dots and covers host + subdomains", () => {
  assert.equal(matchesRegexFor("https://www.axs.com/event/1"), "/(^|\\.)axs\\.com$/");
  assert.equal(
    matchesRegexFor("https://visit.tel-aviv.gov.il/x?ItemId=1"),
    "/(^|\\.)visit\\.tel-aviv\\.gov\\.il$/"
  );
  // The produced literal, evaluated, must accept the bare host and a subdomain
  // and reject the parent — and accept the supportedDomains entry (= the host).
  const re = eval(matchesRegexFor("https://www.axs.com/e")); // eslint-disable-line no-eval
  assert.ok(re.test("axs.com"));
  assert.ok(re.test("tickets.axs.com"));
  assert.ok(!re.test("notaxs.com"));
});

test("namesFor returns host + slug + caseName + matchesRegex", () => {
  assert.deepEqual(namesFor("https://www.stubhub.com/shlomo-artzi-tickets/performer/1512500"), {
    host: "stubhub.com",
    slug: "stubhub",
    caseName: "stubhub",
    matchesRegex: "/(^|\\.)stubhub\\.com$/",
  });
});

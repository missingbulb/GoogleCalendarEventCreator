// Unit tests for helpers/derive-timezone.js — GCal.deriveCtz, the
// corroborating-hints timezone derivation the unsupported-site extractor uses
// (#674). Each case builds a small synthetic page (deriveCtz reads inline
// scripts, JSON-LD, metas, and <html lang>) and calls GCal.deriveCtz inside its
// realm with the extracted start/end values that would accompany it. The
// end-to-end behavior (events actually gaining a ctz and localizing to it) is
// pinned in ../extraction.test.js; these tests pin the acceptance rules —
// especially the refusals, since a wrong ctz is worse than none.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..", "..", "..");
const EXT = path.join(ROOT, "extension"); // the extension root; load-order entries are relative to it
const FILES = JSON.parse(
  readFileSync(path.join(EXT, "event-extractors/load-order.generated.json"), "utf8")
).map((file) => readFileSync(path.join(EXT, file), "utf8"));

function inPage(html, expr) {
  const dom = new JSDOM(html, { url: "https://www.example.com/e/1", runScripts: "outside-only" });
  try {
    for (const src of FILES) dom.window.eval(src);
    return dom.window.eval(expr);
  } finally {
    dom.window.close();
  }
}

function deriveCtz(html, values) {
  return inPage(html, `GCal.deriveCtz(${JSON.stringify(values || [])})`);
}

// A JSON-LD event block stating a venue country (the string form).
function ldEvent(country, extra = "") {
  return `
    <script type="application/ld+json">
    { "@type": "Event", "name": "Show", ${extra}
      "location": { "@type": "Place", "name": "Venue",
                    "address": { "addressLocality": "Town", "addressCountry": ${JSON.stringify(country)} } } }
    </script>`;
}

test("stated zone + matching declared offset is accepted", () => {
  const html = `<script>self.state = {"timezone":"Asia/Jerusalem"};</script>`;
  assert.equal(deriveCtz(html, ["2026-07-07T20:00:00+03:00"]), "Asia/Jerusalem");
});

test("stated zone contradicted by the declared offset is refused (never half-trusted)", () => {
  // Jerusalem is +02:00 in January; a page declaring +05:00 disagrees with its
  // own stated zone, so NOTHING is derived — not the stated zone, no fallback.
  const html = `<script>self.state = {"timezone":"Asia/Jerusalem"};</script>`;
  assert.equal(deriveCtz(html, ["2026-01-15T20:00:00+05:00"]), "");
});

test("stated zone with no second hint is refused", () => {
  const html = `<script>self.state = {"timezone":"Asia/Jerusalem"};</script>`;
  assert.equal(deriveCtz(html, ["2026-07-07T20:00:00"]), ""); // floating start: no offset hint
});

test("conflicting stated zones (a cross-venue listing) yield no stated hint", () => {
  // seatgeek-style: several venues' zones in one page's scripts. Even though
  // the first one matches the offset, the page as a whole names no single zone.
  const html = `
    <script>self.a = {"timezone":"America/New_York"};</script>
    <script>self.b = {"timezone":"America/Chicago"};</script>`;
  assert.equal(deriveCtz(html, ["2026-06-25T18:00:00-04:00"]), "");
});

test("a JSON-escaped stated zone (stringified state blobs) is found", () => {
  // dice.fm-style: the zone lives inside a JSON string, so its quotes are
  // escaped. December Rome is +01:00, corroborating it.
  const html = `<script>self.__NEXT_DATA__ = "{\\"event\\":{\\"timezone\\":\\"Europe/Rome\\"}}";</script>`;
  assert.equal(deriveCtz(html, ["2026-12-07T21:00:00+01:00"]), "Europe/Rome");
});

test("stated zone + agreeing venue country is accepted when times are floating", () => {
  // bandsintown-style: floating JSON-LD times, but the page states both the
  // zone and the country containing it.
  const html = `<script>self.state = {"timezone":"Asia/Jerusalem"};</script>` + ldEvent("Israel");
  assert.equal(deriveCtz(html, ["2026-06-17T21:00:00"]), "Asia/Jerusalem");
});

test("venue country + a uniquely matching declared offset picks the zone", () => {
  // dash.datadoghq-style: no stated zone, but US + -04:00 in June is Eastern
  // time and nothing else.
  assert.equal(deriveCtz(ldEvent("US"), ["2026-06-09T08:00:00-04:00"]), "America/New_York");
});

test("venue country + an ambiguous declared offset is refused", () => {
  // A US summer -07:00 is Phoenix (no DST) or Pacific (DST) — two candidates,
  // so no zone is derived.
  assert.equal(deriveCtz(ldEvent("US"), ["2026-06-09T08:00:00-07:00"]), "");
});

test("offsets spanning a DST flip still resolve to the one zone matching both", () => {
  // A listing carrying +02:00 (January) and +03:00 (July) dates is exactly what
  // Israel's single zone produces — per-pair matching, not raw-offset unanimity.
  assert.equal(
    deriveCtz(ldEvent("IL"), ["2026-01-10T20:00:00+02:00", "2026-07-10T20:00:00+03:00"]),
    "Asia/Jerusalem"
  );
});

test("single-zone venue country + agreeing page language is accepted for floating/UTC times", () => {
  // eventer.co.il-style: JSON-LD says IL, the page is in Hebrew, and the only
  // time is a UTC-serialized instant (which is deliberately NOT an offset hint).
  const html = `<html lang="he"><body>${ldEvent("IL")}</body></html>`;
  assert.equal(deriveCtz(html, ["2026-07-09T16:30:00.000Z"]), "Asia/Jerusalem");
});

test("venue country alone is refused when the page locale doesn't corroborate it", () => {
  // stubhub-style: address says Israel, but the page is en-US boilerplate and
  // the times are floating — one hint only, so nothing is derived.
  const html = `<html lang="en-US"><body>${ldEvent("Israel")}</body></html>`;
  assert.equal(deriveCtz(html, ["2026-07-04T20:30:00"]), "");
});

test("a multi-zone country is never derived from locale agreement alone", () => {
  // US + en-US agree, but with no offset there's no way to pick among the US
  // zones — and locale must never do it.
  const html = `<html lang="en-US"><body>${ldEvent("US")}</body></html>`;
  assert.equal(deriveCtz(html, ["2026-07-04T20:30:00"]), "");
});

test("events in different countries (an international tour listing) yield no country hint", () => {
  // livenation-style, including the Country-object addressCountry shape.
  const html =
    ldEvent({ "@type": "Country", name: "Germany" }) + ldEvent({ "@type": "Country", name: "France" });
  assert.equal(deriveCtz(html, ["2026-07-06T20:00:00+02:00"]), ""); // +02:00 fits both — still refused
});

test("a UTC-serialized 'Z' is not an offset hint", () => {
  // The country is stated, but Z says nothing about the venue and no locale
  // corroborates — refused. (Contrast with the eventer-style case above.)
  assert.equal(deriveCtz(ldEvent("IL"), ["2026-07-09T16:30:00.000Z"]), "");
});

test("the og country meta corroborates like a JSON-LD country, names normalize to codes", () => {
  const html = `
    <meta property="og:country-name" content="Germany">
    <script type="application/ld+json">
    { "@type": "Event", "name": "Show", "startDate": "2026-08-01T20:00:00+02:00" }
    </script>`;
  assert.equal(deriveCtz(html, ["2026-08-01T20:00:00+02:00"]), "Europe/Berlin");
});

test("geo.region's country part + the page language corroborate a single-zone country", () => {
  const html = `<html lang="he"><head><meta name="geo.region" content="IL-TA"></head></html>`;
  assert.equal(deriveCtz(html, ["2026-07-09T20:00:00"]), "Asia/Jerusalem");
});

test("an unknown or absent country derives nothing", () => {
  assert.equal(deriveCtz(ldEvent("Atlantis"), ["2026-06-09T08:00:00-04:00"]), "");
  assert.equal(deriveCtz("<h1>Show</h1>", ["2026-06-09T08:00:00-04:00"]), "");
});

test("COUNTRY_TIMEZONES holds only valid, Intl-resolvable zones under alpha-2 keys", () => {
  // The table is data; a typo'd zone would silently never match. Validate every
  // entry against the extension's own VALID_TIMEZONES *and* the Intl runtime
  // that the offset checks depend on.
  const table = JSON.parse(inPage("", "JSON.stringify(GCal.COUNTRY_TIMEZONES)"));
  const invalid = inPage(
    "",
    "Object.values(GCal.COUNTRY_TIMEZONES).flat().filter((z) => !GCal.isValidTimezone(z)).join(', ')"
  );
  assert.equal(invalid, "");
  for (const [code, zones] of Object.entries(table)) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.ok(zones.length >= 1, `${code} lists no zones`);
    for (const z of zones) new Intl.DateTimeFormat("en-US", { timeZone: z }); // throws on an unknown zone
  }
});

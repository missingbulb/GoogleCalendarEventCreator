// Offline unit tests for the popup's pure display helpers in
// ui/views/events-view.js: the date-chip and the "when" line. These used to be
// exercised only indirectly through the UI snapshot renderer; now the snapshots
// render a static gallery, so the formatting logic is pinned down here instead.
//
// Assertions avoid baking in a specific locale's exact strings (e.g. "8 PM" vs
// "20:00"): they check the LOGIC — round hours drop minutes, non-round keep
// them, ranges join with an en dash, all-day/no-date are labeled — which holds
// regardless of where the tests run.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let formatWhen, summarize, dateChip, instanceLabel;
before(async () => {
  ({ formatWhen, summarize, dateChip, instanceLabel } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "ui", "views", "events-view.js"))
  ));
});

// Floating (offset-free) times parse as local, so these are deterministic
// everywhere; only the locale's formatting differs, which the checks avoid.
const ROUND = "2026-06-17T20:00:00";
const ODD = "2026-06-17T20:30:00";

test("formatWhen: no start is labeled, not blank", () => {
  assert.equal(formatWhen(""), "No date found");
});

test("formatWhen: a date with no time is an all-day label", () => {
  assert.equal(formatWhen("2026-06-17"), "All day");
});

test("formatWhen: a round hour drops the :00 minutes", () => {
  assert.ok(!formatWhen(ROUND).includes(":"), `expected no minutes in ${formatWhen(ROUND)}`);
});

test("formatWhen: a non-round time keeps its minutes", () => {
  assert.ok(formatWhen(ODD).includes("30"), `expected minutes in ${formatWhen(ODD)}`);
});

test("formatWhen: a start+end renders a range joined by an en dash", () => {
  const text = formatWhen(ROUND, "2026-06-17T22:00:00");
  assert.ok(text.includes("–"), `expected a range in ${text}`);
});

test("formatWhen: an end that isn't after the start is ignored (single time)", () => {
  assert.equal(formatWhen(ROUND, "2026-06-17T19:00:00"), formatWhen(ROUND));
});

test("summarize: appends the location after the time with a separator", () => {
  const text = summarize({ start: ROUND, location: "Blue Door Hall" });
  assert.ok(text.includes("Blue Door Hall"));
  assert.ok(text.includes("·"));
});

test("summarize: with no location is just the time line", () => {
  assert.equal(summarize({ start: ROUND }), formatWhen(ROUND));
});

test("dateChip: returns an uppercase short month and the day of month", () => {
  const chip = dateChip(ROUND);
  assert.match(chip.month, /^[A-Z]+$/);
  assert.equal(chip.day, "17");
});

test("dateChip: no usable date yields null (button then shows no chip)", () => {
  assert.equal(dateChip(""), null);
});

test("summarize: eventLengthInMinutes with no end shows a time range", () => {
  const text = summarize({ start: ROUND, eventLengthInMinutes: 90 });
  assert.ok(text.includes("–"), `expected a range in "${text}"`);
});

test("summarize: eventLengthInMinutes is ignored for all-day events", () => {
  const text = summarize({ start: "2026-06-17", eventLengthInMinutes: 90 });
  assert.equal(text, "All day");
});

test("summarize: reads the first instance of a multi-instance (times[]) event", () => {
  const event = { location: "Hall", times: [{ start: ROUND }, { start: "2026-06-18T20:00:00" }] };
  assert.equal(summarize(event), summarize({ start: ROUND, location: "Hall" }));
});

// --- instanceLabel: the small button text inside a grouped multi-instance card.
// When the card spans several dates (multiDate=true), the date leads so the
// buttons distinguish themselves by day; when every instance shares one date
// (multiDate=false), the date is in the icon, so the button shows just the time.

test("instanceLabel (same date): shows just the time, not the date", () => {
  const label = instanceLabel({ start: ODD }, false);
  assert.ok(label.includes("30"), `expected a time in "${label}"`);
  assert.ok(!/jun|17/i.test(label), `did not expect a date in "${label}"`);
});

test("instanceLabel (same date): a timed instance with an end shows a range", () => {
  const label = instanceLabel({ start: ROUND, end: "2026-06-17T22:00:00" }, false);
  assert.ok(label.includes("–"), `expected a range in "${label}"`);
});

test("instanceLabel (multi date): leads with the date and appends the time", () => {
  const label = instanceLabel({ start: ODD }, true);
  assert.ok(/17/.test(label), `expected the day-of-month in "${label}"`);
  assert.ok(label.includes("30"), `expected the time appended in "${label}"`);
});

test("instanceLabel (multi date): an all-day instance shows just the date", () => {
  const label = instanceLabel({ start: "2026-06-17" }, true);
  assert.ok(/17/.test(label), `expected the day-of-month in "${label}"`);
  assert.ok(!/:|AM|PM/i.test(label), `did not expect a time in "${label}"`);
});

test("instanceLabel (same date): an all-day instance is labeled All day", () => {
  assert.equal(instanceLabel({ start: "2026-06-17" }, false), "All day");
});

test("instanceLabel: an instance with no start is labeled, not blank", () => {
  assert.equal(instanceLabel({ start: "" }, false), "TBD");
});

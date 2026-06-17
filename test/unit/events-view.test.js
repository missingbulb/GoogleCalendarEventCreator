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

let formatWhen, summarize, dateChip, sameDayLabel, toCards;
let monthRangeChip, formatDateRange;
before(async () => {
  ({
    formatWhen,
    summarize,
    dateChip,
    sameDayLabel,
    toCards,
    monthRangeChip,
    formatDateRange,
  } = await import(pathToFileURL(path.join(__dirname, "..", "..", "ui", "views", "events-view.js"))));
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

test("dateChip: an off-year date carries its year, the current year omits it", () => {
  assert.equal(dateChip("2026-06-17T20:00:00", 2026).year, undefined);
  assert.equal(dateChip("2025-06-17T20:00:00", 2026).year, "2025"); // past
  assert.equal(dateChip("2027-06-17T20:00:00", 2026).year, "2027"); // future
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

// --- sameDayLabel: the button text inside a same-day card. The icon carries the
// date, so the button shows just the time (a range when there's an end).

test("sameDayLabel: shows just the time, not the date", () => {
  const label = sameDayLabel({ start: ODD });
  assert.ok(label.includes("30"), `expected a time in "${label}"`);
  assert.ok(!/jun|17/i.test(label), `did not expect a date in "${label}"`);
});

test("sameDayLabel: a timed instance with an end shows a range", () => {
  const label = sameDayLabel({ start: ROUND, end: "2026-06-17T22:00:00" });
  assert.ok(label.includes("–"), `expected a range in "${label}"`);
});

test("sameDayLabel: an all-day instance is labeled All day", () => {
  assert.equal(sameDayLabel({ start: "2026-06-17" }), "All day");
});

// --- monthRangeChip / dayOfMonthLabel / formatDateRange: the month/multi-day
// card's display helpers (the chip and the day-button/when text).

const inst = (start) => ({ t: { start } });

test("monthRangeChip: month over the spanned day-range (short hyphen, fixed-width chip)", () => {
  const chip = monthRangeChip([inst("2026-06-14T19:00:00"), inst("2026-06-25T19:00:00")]);
  assert.match(chip.month, /^[A-Z]+$/);
  assert.equal(chip.day, "14-25");
});

test("monthRangeChip: a single shared day is just that day (no range)", () => {
  assert.equal(monthRangeChip([inst("2026-06-14T19:00:00")]).day, "14");
});

test("monthRangeChip: ranges by day-of-month, smallest to largest, not list order", () => {
  const chip = monthRangeChip([inst("2026-06-25T19:00:00"), inst("2026-06-05T19:00:00")]);
  assert.equal(chip.day, "5-25");
});

test("monthRangeChip: no usable date yields null", () => {
  assert.equal(monthRangeChip([inst(""), inst(undefined)]), null);
});

test("monthRangeChip: an off-year range carries its year, the current year omits it", () => {
  const here = [inst("2026-06-14T19:00:00"), inst("2026-06-25T19:00:00")];
  const there = [inst("2027-06-14T19:00:00"), inst("2027-06-25T19:00:00")];
  assert.equal(monthRangeChip(here, 2026).year, undefined);
  assert.equal(monthRangeChip(there, 2026).year, "2027");
});

test("formatDateRange: 'Mon d – d' across days, no time", () => {
  const text = formatDateRange("2026-06-05T19:00:00", "2026-06-07T19:00:00");
  assert.match(text, /^[A-Za-z]+ 5 – 7$/);
  assert.ok(!/:|PM|AM/i.test(text), `expected no time in "${text}"`);
});

test("formatDateRange: a single day shows just that day", () => {
  assert.match(formatDateRange("2026-06-05T19:00:00", "2026-06-05T19:00:00"), /^[A-Za-z]+ 5$/);
});

// --- toCards: instances grouped BY MONTH (see events-view.js's header). A month
// with one day keeps the single/same-day behavior; scattered single-time days in
// a month fold into one "month" card; a run of consecutive single-time days
// becomes a "multiDay" card.

const card = (events) => toCards(events);
const ev = (title, times) => ({ title, location: "Hall", ctz: "", times });

test("toCards: a single-occurrence event is one 'single' card", () => {
  const cards = card([ev("Talk", [{ start: ROUND }])]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "single");
});

test("toCards: scattered single-time days in a month fold into one 'month' card", () => {
  // Jun 5 / Jun 14 / Jun 25 + Jul 1 -> a June month card (3 days) + a July single.
  const cards = card([
    ev("Series", [
      { start: "2026-06-05T19:00:00" },
      { start: "2026-06-14T19:00:00" },
      { start: "2026-06-25T19:00:00" },
      { start: "2026-07-01T19:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month", "single"]);
  assert.equal(cards[0].instances.length, 3);
  assert.deepEqual(
    cards[0].instances.map((it) => it.t.start.slice(0, 10)),
    ["2026-06-05", "2026-06-14", "2026-06-25"]
  );
});

test("toCards: a run of consecutive single-time days is one 'multiDay' card", () => {
  // Jun 5,6,7 (consecutive) + Jun 14,25 -> a multi-day card + a month card.
  const cards = card([
    ev("Fest", [
      { start: "2026-06-05T19:00:00" },
      { start: "2026-06-06T19:00:00" },
      { start: "2026-06-07T19:00:00" },
      { start: "2026-06-14T19:00:00" },
      { start: "2026-06-25T19:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["multiDay", "month"]);
  assert.deepEqual(
    cards[0].instances.map((it) => it.t.start.slice(0, 10)),
    ["2026-06-05", "2026-06-06", "2026-06-07"]
  );
  assert.deepEqual(cards[1].instances.map((it) => it.t.start.slice(0, 10)), ["2026-06-14", "2026-06-25"]);
});

test("toCards: two consecutive single-time days are already a multi-day card", () => {
  const cards = card([
    ev("Run", [{ start: "2026-06-05T19:00:00" }, { start: "2026-06-06T19:00:00" }]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["multiDay"]);
  assert.equal(cards[0].instances.length, 2);
});

test("toCards: different months never merge — each month is its own card(s)", () => {
  // One day in each of three months -> three single cards (each month a lone day).
  const cards = card([
    ev("Tour", [
      { start: "2026-06-10T21:00:00" },
      { start: "2026-07-11T21:00:00" },
      { start: "2026-08-12T21:00:00" },
    ]),
  ]);
  assert.equal(cards.length, 3);
  assert.ok(cards.every((c) => c.kind === "single"));
});

test("toCards: the same month in different years stays separate", () => {
  const cards = card([
    ev("Annual", [{ start: "2026-06-05T19:00:00" }, { start: "2027-06-06T19:00:00" }]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["single", "single"]);
});

test("toCards: a one-day month with two times is still a same-day card", () => {
  // Jun 10 8PM / Jun 10 9PM / Jul 9PM -> same-day (Jun 10) + single (Jul).
  const cards = card([
    ev("Fest", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-10T21:00:00" },
      { start: "2026-07-11T21:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["sameDay", "single"]);
  assert.equal(cards[0].instances.length, 2);
});

test("toCards: a same-day day inside a multi-day month is its own card, scattered days fold", () => {
  // Jun 10 / Jun 11 x2 / Jun 12 -> month card (10,12) + same-day card (11).
  const cards = card([
    ev("Series", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-11T21:00:00" },
      { start: "2026-06-11T23:00:00" },
      { start: "2026-06-12T23:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month", "sameDay"]);
  assert.deepEqual(cards[0].instances.map((it) => it.t.start.slice(0, 10)), ["2026-06-10", "2026-06-12"]);
  assert.equal(cards[1].instances.length, 2);
});

test("toCards: instances keep their original times[] index (for the right URL)", () => {
  const cards = card([
    ev("Fest", [
      { start: "2026-06-11T21:00:00" }, // index 0, but later in time
      { start: "2026-06-10T20:00:00" }, // index 1
      { start: "2026-06-10T21:00:00" }, // index 2
    ]),
  ]);
  const sameDay = cards.find((c) => c.kind === "sameDay");
  assert.deepEqual(
    sameDay.instances.map((it) => it.i).sort(),
    [1, 2],
    "the Jun 10 card carries the original indices 1 and 2"
  );
});

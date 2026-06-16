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
before(async () => {
  ({ formatWhen, summarize, dateChip, sameDayLabel, toCards } = await import(
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

// --- toCards: instances split into cards STRICTLY by date (one card per day).

const card = (events) => toCards(events);
const ev = (title, times) => ({ title, location: "Hall", ctz: "", times });

test("toCards: a single-occurrence event is one 'single' card", () => {
  const cards = card([ev("Talk", [{ start: ROUND }])]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "single");
});

test("toCards: different days, one time each -> one single card per day (no '?' card)", () => {
  // Jun 10 9PM / Jun 11 9PM / Jun 12 9PM -> three single cards, one per day.
  const cards = card([
    ev("Run", [
      { start: "2026-06-10T21:00:00" },
      { start: "2026-06-11T21:00:00" },
      { start: "2026-06-12T21:00:00" },
    ]),
  ]);
  assert.equal(cards.length, 3);
  assert.ok(cards.every((c) => c.kind === "single"));
});

test("toCards: different months, one time each -> three single cards too (still by date)", () => {
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

test("toCards: a day with two times -> a same-day card for that day", () => {
  // Jun 10 8PM / Jun 10 9PM / Jun 11 9PM -> same-day card (Jun 10) + single (Jun 11).
  const cards = card([
    ev("Fest", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-10T21:00:00" },
      { start: "2026-06-11T21:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["sameDay", "single"]);
  assert.equal(cards[0].instances.length, 2);
});

test("toCards: the four-instance example splits into single / same-day / single, ordered by date", () => {
  // Jun 10 8PM / Jun 11 9PM / Jun 11 11PM / Jun 12 11PM.
  const cards = card([
    ev("Series", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-11T21:00:00" },
      { start: "2026-06-11T23:00:00" },
      { start: "2026-06-12T23:00:00" },
    ]),
  ]);
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map((c) => c.kind), ["single", "sameDay", "single"]);
  // The middle (Jun 11) card holds both of that day's times; the others one each.
  assert.deepEqual(cards.map((c) => c.instances.length), [1, 2, 1]);
});

test("toCards: no card spans several days, so cards never jump ahead of a later one", () => {
  // Each card is one day -> the card order is exactly the date order.
  const cards = card([
    ev("Series", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-11T21:00:00" },
      { start: "2026-06-11T23:00:00" },
      { start: "2026-06-12T23:00:00" },
    ]),
  ]);
  const cardDays = cards.map((c) => c.instances[0].t.start.slice(0, 10));
  assert.deepEqual(cardDays, ["2026-06-10", "2026-06-11", "2026-06-12"]);
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

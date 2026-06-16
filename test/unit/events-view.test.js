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

let formatWhen, summarize, dateChip, sameDayLabel, multiDateLabel, toCards;
before(async () => {
  ({ formatWhen, summarize, dateChip, sameDayLabel, multiDateLabel, toCards } = await import(
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

// --- sameDayLabel / multiDateLabel: the button text inside a grouped card.
// A same-day card's icon carries the date, so its buttons show just the time;
// a multi-date card's icon carries the month, so its buttons lead with the
// ordinal day and append the time.

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

test("multiDateLabel: leads with the ordinal day and appends the time", () => {
  const label = multiDateLabel({ start: ODD });
  assert.match(label, /^17th,/, `expected an ordinal day in "${label}"`);
  assert.ok(label.includes("30"), `expected the time appended in "${label}"`);
});

test("multiDateLabel: an all-day instance shows just the ordinal day", () => {
  const label = multiDateLabel({ start: "2026-06-17" });
  assert.equal(label, "17th");
});

test("multiDateLabel: ordinal suffixes are correct (1st, 2nd, 3rd, 21st)", () => {
  assert.equal(multiDateLabel({ start: "2026-06-01" }), "1st");
  assert.equal(multiDateLabel({ start: "2026-06-02" }), "2nd");
  assert.equal(multiDateLabel({ start: "2026-06-03" }), "3rd");
  assert.equal(multiDateLabel({ start: "2026-06-21" }), "21st");
});

// --- toCards: the date aggregation that turns events into cards.

const card = (events) => toCards(events);
const ev = (title, times) => ({ title, location: "Hall", ctz: "", times });

test("toCards: a single-occurrence event is one 'single' card", () => {
  const cards = card([ev("Talk", [{ start: ROUND }])]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "single");
});

test("toCards: same month, different days, one time each -> ONE multi-date card", () => {
  // Jun 10 9PM / Jun 11 9PM / Jun 12 9PM.
  const cards = card([
    ev("Run", [
      { start: "2026-06-10T21:00:00" },
      { start: "2026-06-11T21:00:00" },
      { start: "2026-06-12T21:00:00" },
    ]),
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, "multiDate");
  assert.equal(cards[0].instances.length, 3);
});

test("toCards: different months -> THREE plain single cards", () => {
  // Jun 10 9PM / Jul 11 9PM / Aug 12 9PM.
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

test("toCards: a day with two times + another day with one -> a same-day card + a single card", () => {
  // Jun 10 8PM / Jun 10 9PM / Jun 11 9PM.
  const cards = card([
    ev("Fest", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-10T21:00:00" },
      { start: "2026-06-11T21:00:00" },
    ]),
  ]);
  assert.equal(cards.length, 2);
  // Ordered by earliest instance: the Jun 10 same-day card first.
  assert.equal(cards[0].kind, "sameDay");
  assert.equal(cards[0].instances.length, 2);
  assert.equal(cards[1].kind, "single");
  assert.equal(cards[1].instances.length, 1);
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

test("toCards: a multi-time day and other single days in the same month split correctly", () => {
  // Jun 10 (two times) + Jun 11 + Jun 12 -> same-day card (Jun 10) + multi-date card (11,12).
  const cards = card([
    ev("Mix", [
      { start: "2026-06-10T18:00:00" },
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-11T20:00:00" },
      { start: "2026-06-12T20:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["sameDay", "multiDate"]);
  assert.equal(cards[1].instances.length, 2);
});

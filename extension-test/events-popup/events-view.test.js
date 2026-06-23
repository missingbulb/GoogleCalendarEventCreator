// Offline unit tests for the popup's pure display helpers in
// events-popup/events-view.js: the date-chip and the "when" line. These used to be
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
let commonTime, showPerDayTimes, groupHeaderTime;
before(async () => {
  ({
    formatWhen,
    summarize,
    dateChip,
    sameDayLabel,
    toCards,
    commonTime,
    showPerDayTimes,
    groupHeaderTime,
  } = await import(pathToFileURL(path.join(__dirname, "..", "..", "extension", "events-popup", "events-view.js"))));
});

// Floating (offset-free) times parse as local, so these are deterministic
// everywhere; only the locale's formatting differs, which the checks avoid.
const ROUND = "2026-06-17T20:00:00";
const ODD = "2026-06-17T20:30:00";
// A fixed reference "now" so the corner-pill (past / future-year) assertions are
// deterministic regardless of the real clock.
const NOW = new Date(2026, 5, 22, 12, 0, 0); // 2026-06-22

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

// --- Offset/Z starts show the WALL-CLOCK time as written on the page, not
// re-zoned to the runtime's timezone (presentation-only floatLocal). Each check
// compares the offset/Z value to its floating equivalent, so it holds in any
// runtime timezone and locale.

test("formatWhen: a +01:00 offset is dropped, showing the literal clock time", () => {
  assert.equal(formatWhen("2026-12-07T21:00:00+01:00"), formatWhen("2026-12-07T21:00:00"));
});

test("formatWhen: a trailing Z is dropped, showing the literal clock time", () => {
  assert.equal(formatWhen("2026-12-07T21:00:00Z"), formatWhen("2026-12-07T21:00:00"));
});

test("formatWhen: an offset end is also shown as its literal clock time", () => {
  assert.equal(
    formatWhen("2026-12-07T21:00:00+01:00", "2026-12-07T23:00:00+01:00"),
    formatWhen("2026-12-07T21:00:00", "2026-12-07T23:00:00")
  );
});

test("dateChip: an offset that would shift the UTC day still shows the page's day", () => {
  // 00:30 +02:00 is the previous day in UTC; the chip must read the written day.
  assert.deepEqual(
    dateChip("2026-12-07T00:30:00+02:00", NOW),
    dateChip("2026-12-07T00:30:00", NOW)
  );
});

test("sameDayLabel: an offset start shows the literal clock time", () => {
  assert.equal(
    sameDayLabel({ start: "2026-12-07T21:00:00+01:00" }),
    sameDayLabel({ start: "2026-12-07T21:00:00" })
  );
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

test("dateChip: a past date shows `past`, a future year shows its `year`, the current period neither", () => {
  // now = 2026-06-22
  assert.equal(dateChip("2025-06-17T20:00:00", NOW).past, true); // a prior year is past
  assert.equal(dateChip("2026-06-17T20:00:00", NOW).past, true); // earlier THIS year is now past too
  const current = dateChip("2026-06-30T20:00:00", NOW); // later this year: no pill
  assert.equal(current.past, undefined);
  assert.equal(current.year, undefined);
  const future = dateChip("2027-06-17T20:00:00", NOW); // a future year: green year pill, not past
  assert.equal(future.past, undefined);
  assert.equal(future.year, "2027");
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

const inst = (start) => ({ t: { start } });

// --- commonTime: the time a group card's sessions all share, shown in the
// header above the icons — only when every instance resolves to the same time.

test("commonTime: scattered dates that all share one start time return that time", () => {
  const time = commonTime([inst("2026-06-05T19:00:00"), inst("2026-06-25T19:00:00")]);
  assert.equal(time, sameDayLabel({ start: "2026-06-05T19:00:00" }));
});

test("commonTime: sessions with different times share none ('')", () => {
  assert.equal(commonTime([inst("2026-06-05T19:00:00"), inst("2026-06-25T20:00:00")]), "");
});

test("commonTime: a shared start AND end returns the full range", () => {
  const times = [
    { t: { start: "2026-06-05T19:00:00", end: "2026-06-05T21:00:00" } },
    { t: { start: "2026-06-25T19:00:00", end: "2026-06-25T21:00:00" } },
  ];
  assert.ok(commonTime(times).includes("–"), `expected a range in "${commonTime(times)}"`);
});

// --- groupHeaderTime: the time-label that leads a grouped card's header — the
// shared time (commonTime), else "All day" when EVERY showing is all-day, else ""
// (mixed, or differing times). #441: all-day grouped cards show "All day · loc".

test("groupHeaderTime: a shared start time leads the header (not 'All day')", () => {
  const label = groupHeaderTime([inst("2026-08-05T19:00:00"), inst("2026-08-25T19:00:00")]);
  assert.equal(label, sameDayLabel({ start: "2026-08-05T19:00:00" }));
  assert.notEqual(label, "All day");
});

test("groupHeaderTime: every showing all-day yields 'All day'", () => {
  assert.equal(groupHeaderTime([inst("2026-08-05"), inst("2026-08-14"), inst("2026-08-25")]), "All day");
});

test("groupHeaderTime: a mix of timed and all-day showings yields '' (no single label)", () => {
  assert.equal(groupHeaderTime([inst("2026-08-05T19:00:00"), inst("2026-08-14")]), "");
});

test("groupHeaderTime: all timed but differing times yields '' (each chip carries its own)", () => {
  assert.equal(groupHeaderTime([inst("2026-08-05T18:00:00"), inst("2026-08-14T20:00:00")]), "");
});

test("commonTime: a same start but differing end is not common ('')", () => {
  const times = [
    { t: { start: "2026-06-05T19:00:00", end: "2026-06-05T21:00:00" } },
    { t: { start: "2026-06-25T19:00:00", end: "2026-06-25T22:00:00" } },
  ];
  assert.equal(commonTime(times), "");
});

test("commonTime: any all-day or dateless instance yields no common time ('')", () => {
  assert.equal(commonTime([inst("2026-06-05T19:00:00"), inst("2026-06-17")]), "");
  assert.equal(commonTime([inst("2026-06-05T19:00:00"), inst("")]), "");
});

// --- showPerDayTimes: whether a month card's days carry different times that
// each deserve a per-day time chip (vs. a shared time in the header, or all-day).

test("showPerDayTimes: differing timed sessions -> true (each day shows its time)", () => {
  assert.equal(showPerDayTimes([inst("2026-07-05T18:00:00"), inst("2026-07-25T20:00:00")]), true);
});

test("showPerDayTimes: one shared time -> false (the header carries it instead)", () => {
  assert.equal(showPerDayTimes([inst("2026-06-05T19:00:00"), inst("2026-06-25T19:00:00")]), false);
});

test("showPerDayTimes: a mix of timed and all-day showings -> true (each chip shows its own label so they differ)", () => {
  assert.equal(showPerDayTimes([inst("2026-08-05T18:00:00"), inst("2026-08-25")]), true);
});

test("showPerDayTimes: all all-day showings -> false (plain day chips, 'All day' header)", () => {
  assert.equal(showPerDayTimes([inst("2026-08-05"), inst("2026-08-25")]), false);
});

// --- toCards: instances grouped BY MONTH (see events-view.js's header). A month
// with one showing is a "single" card; a month with two or more once-per-date
// showings is one "month" card holding each as its own button. A date carrying MORE
// showings than the month's regular (modal) per-date count is peeled into its OWN
// card and breaks the surrounding run (#509). Instances are NEVER merged — a card
// built from X instances exposes X buttons.

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

test("toCards: consecutive single-time days are NOT merged — one 'month' card, a button per day (#330)", () => {
  // Jun 5,6,7 (consecutive) + Jun 14,25 -> a single month card holding all five
  // days as their own buttons, never collapsed into a multi-day span.
  const cards = card([
    ev("Fest", [
      { start: "2026-06-05T19:00:00" },
      { start: "2026-06-06T19:00:00" },
      { start: "2026-06-07T19:00:00" },
      { start: "2026-06-14T19:00:00" },
      { start: "2026-06-25T19:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month"]);
  assert.deepEqual(
    cards[0].instances.map((it) => it.t.start.slice(0, 10)),
    ["2026-06-05", "2026-06-06", "2026-06-07", "2026-06-14", "2026-06-25"]
  );
});

test("toCards: two consecutive single-time days are a 'month' card with both days (#330)", () => {
  const cards = card([
    ev("Run", [{ start: "2026-06-05T19:00:00" }, { start: "2026-06-06T19:00:00" }]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month"]);
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

test("toCards: a one-day month with two times is one 'month' card with both times", () => {
  // Jun 10 8PM / Jun 10 9PM / Jul 9PM -> a June month card (both times) + Jul single.
  const cards = card([
    ev("Fest", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-10T21:00:00" },
      { start: "2026-07-11T21:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month", "single"]);
  assert.equal(cards[0].instances.length, 2);
});

test("toCards: a day with more showings than the regular count is peeled into its own card, breaking the run (#509)", () => {
  // Jun 10 / Jun 11 x2 / Jun 12 -> the busy day (Jun 11) is its OWN card, splitting
  // the regular run into Jun 10 (before) and Jun 12 (after): single · month · single.
  const cards = card([
    ev("Series", [
      { start: "2026-06-10T20:00:00" },
      { start: "2026-06-11T21:00:00" },
      { start: "2026-06-11T23:00:00" },
      { start: "2026-06-12T23:00:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["single", "month", "single"]);
  assert.deepEqual(cards[0].instances.map((it) => it.t.start.slice(0, 10)), ["2026-06-10"]);
  assert.deepEqual(
    cards[1].instances.map((it) => it.t.start.slice(0, 10)),
    ["2026-06-11", "2026-06-11"],
    "the anomaly card holds exactly the busy date's showings"
  );
  assert.deepEqual(cards[2].instances.map((it) => it.t.start.slice(0, 10)), ["2026-06-12"]);
});

test("toCards: a longer regular run resumes after the anomaly as a fresh card (#509)", () => {
  // Aug 3,4,5 (run) / Aug 6 x2 (busy) / Aug 7 (run) -> month · month · single.
  const cards = card([
    ev("Daily", [
      { start: "2026-08-03T13:55:00" },
      { start: "2026-08-04T13:55:00" },
      { start: "2026-08-05T13:55:00" },
      { start: "2026-08-06T13:55:00" },
      { start: "2026-08-06T16:00:00" },
      { start: "2026-08-07T13:55:00" },
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month", "month", "single"]);
  assert.deepEqual(cards[0].instances.map((it) => it.t.start.slice(0, 10)), ["2026-08-03", "2026-08-04", "2026-08-05"]);
  assert.equal(cards[1].instances.length, 2); // the busy Aug 6
  assert.deepEqual(cards[2].instances.map((it) => it.t.start.slice(0, 10)), ["2026-08-07"]);
});

test("toCards: instances keep their original times[] index across the split (for the right URL)", () => {
  // Jun 10 x2 (busy) / Jun 11 (run) -> a 'month' anomaly card (indices 1,2) + a
  // 'single' run card (index 0); every original index is preserved on the right card.
  const cards = card([
    ev("Fest", [
      { start: "2026-06-11T21:00:00" }, // index 0
      { start: "2026-06-10T20:00:00" }, // index 1
      { start: "2026-06-10T21:00:00" }, // index 2
    ]),
  ]);
  assert.deepEqual(cards.map((c) => c.kind), ["month", "single"]);
  assert.deepEqual(cards[0].instances.map((it) => it.i).sort(), [1, 2]);
  assert.deepEqual(cards[1].instances.map((it) => it.i), [0]);
});

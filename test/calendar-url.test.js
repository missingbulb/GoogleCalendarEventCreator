// Offline unit tests for background.js's Google Calendar URL building:
// the `dates` parameter formats and the composition of the `details` field.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// background.js registers a chrome listener at load time; stub just enough
// and evaluate it as global code so its function declarations land on
// globalThis.
function loadBackground() {
  globalThis.chrome = { action: { onClicked: { addListener() {} } } };
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8"));
  return {
    buildCalendarUrl: globalThis.buildCalendarUrl,
    formatDatesParam: globalThis.formatDatesParam,
  };
}

const { buildCalendarUrl, formatDatesParam } = loadBackground();
const TAB = { title: "Tab Title", url: "https://www.meetup.com/group/events/123/", index: 0 };

function paramsOf(url) {
  return new URL(url).searchParams;
}

test("details starts with the original event page URL, then the description", () => {
  const url = buildCalendarUrl({ title: "Picnic", description: "Bring food." }, TAB);
  assert.equal(paramsOf(url).get("details"), `${TAB.url}\n\nBring food.`);
});

test("details is just the URL when the page had no description", () => {
  const url = buildCalendarUrl({ title: "Picnic" }, TAB);
  assert.equal(paramsOf(url).get("details"), TAB.url);
});

test("multiple-events note comes after the URL, before the description", () => {
  const url = buildCalendarUrl({ title: "Fair", description: "Art.", multipleEvents: true }, TAB);
  assert.equal(
    paramsOf(url).get("details"),
    `${TAB.url}\n\n(First of several events found on this page.)\n\nArt.`
  );
});

test("falls back to the tab title when no title was extracted", () => {
  const url = buildCalendarUrl({}, TAB);
  assert.equal(paramsOf(url).get("text"), "Tab Title");
});

test("dates: floating local time gets a 2-hour default duration", () => {
  assert.deepEqual(formatDatesParam("2026-06-14T19:00:00", ""), {
    dates: "20260614T190000/20260614T210000",
  });
});

test("dates: explicit offset keeps the page's wall-clock time and sets ctz", () => {
  assert.deepEqual(formatDatesParam("2026-06-14T19:00:00-04:00", "2026-06-14T21:00:00-04:00"), {
    dates: "20260614T190000/20260614T210000",
    ctz: "Etc/GMT+4",
  });
});

test("dates: a positive offset maps to the corresponding negative Etc/GMT zone", () => {
  assert.deepEqual(formatDatesParam("2026-06-14T19:00:00+03:00", "2026-06-14T21:00:00+03:00"), {
    dates: "20260614T190000/20260614T210000",
    ctz: "Etc/GMT-3",
  });
});

test("dates: a Z offset maps to ctz=UTC", () => {
  assert.deepEqual(formatDatesParam("2026-06-14T19:00:00Z", "2026-06-14T21:00:00Z"), {
    dates: "20260614T190000/20260614T210000",
    ctz: "UTC",
  });
});

test("dates: start and end with different offsets are both expressed in the start's offset", () => {
  assert.deepEqual(formatDatesParam("2026-07-21T13:30:00Z", "2026-07-22T18:30:00-04:00"), {
    dates: "20260721T133000/20260722T223000",
    ctz: "UTC",
  });
});

test("dates: a fractional-hour offset falls back to an exact UTC instant", () => {
  assert.deepEqual(formatDatesParam("2026-06-14T19:00:00+05:30", "2026-06-14T21:00:00+05:30"), {
    dates: "20260614T133000Z/20260614T153000Z",
  });
});

test("dates: date-only becomes an all-day event (exclusive end)", () => {
  assert.deepEqual(formatDatesParam("2026-06-14", ""), { dates: "20260614/20260615" });
});

test("dates: an end before the start is ignored in favor of the default duration", () => {
  assert.deepEqual(formatDatesParam("2026-06-14T19:00:00", "2026-06-14T18:00:00"), {
    dates: "20260614T190000/20260614T210000",
  });
});

test("dates: omitted entirely when no start was found", () => {
  assert.deepEqual(formatDatesParam("", ""), {});
  const url = buildCalendarUrl({ title: "No date" }, TAB);
  assert.equal(paramsOf(url).get("dates"), null);
  assert.equal(paramsOf(url).get("ctz"), null);
});

test("buildCalendarUrl sets ctz alongside dates for an explicit-offset event", () => {
  const url = buildCalendarUrl({ title: "Talk", start: "2026-06-14T19:00:00-04:00" }, TAB);
  assert.equal(paramsOf(url).get("dates"), "20260614T190000/20260614T210000");
  assert.equal(paramsOf(url).get("ctz"), "Etc/GMT+4");
});

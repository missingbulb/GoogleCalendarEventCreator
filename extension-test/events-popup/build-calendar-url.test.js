// Offline unit tests for events-popup/build-calendar-url.js's Google Calendar URL
// building: the `dates` parameter formats and the composition of the `details`
// field.
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// build-calendar-url.js is an ES module; import it before the tests run.
let buildCalendarUrl, formatDatesParam;
before(async () => {
  ({ buildCalendarUrl, formatDatesParam } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "events-popup", "build-calendar-url.js"))
  ));
});
const TAB = { title: "Tab Title", url: "https://example.com/events/picnic", index: 0 };

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

test("meetup.com: details strips tracking params from the link itself", () => {
  const meetupTab = {
    title: "Tab Title",
    url:
      "https://www.meetup.com/claude-israel-user-group/events/315103877/?recId=ee49b341-1deb-4b50-9954-9a4fcc28bf03" +
      "&recSource=ml-popular-events-nearby-offline&searchId=f541f7ee-b297-426b-b188-08d0bd38f4f6&eventOrigin=find_page%24inPerson",
    index: 0,
  };
  const url = buildCalendarUrl({ title: "Meetup", description: "Come hang out." }, meetupTab);
  const canonical = "https://www.meetup.com/claude-israel-user-group/events/315103877";
  assert.equal(paramsOf(url).get("details"), `${canonical}\n\nCome hang out.`);
});

test("markdown links in the description become HTML anchors (kept verbatim)", () => {
  const description = "See [Fusion VC](https://x.com/?utm_source=luma) and [B](https://y.com)";
  const url = buildCalendarUrl({ title: "Talk", description }, TAB);
  const details = paramsOf(url).get("details");
  assert.ok(details.includes('<a href="https://x.com/?utm_source=luma">Fusion VC</a>'));
  assert.ok(details.includes('<a href="https://y.com">B</a>'));
});

test("a markdown link with a dangerous scheme is left literal, not turned into an <a>", () => {
  // The description is page-controlled. A javascript:/data:/vbscript: URL must
  // never become an <a href> in the HTML-rendered Calendar details — keep the
  // raw markdown text instead, so no dangerous-scheme anchor is emitted.
  const description =
    "click [here](javascript:alert(1)) or [there](data:text/html,<b>x</b>) or [x](vbscript:msgbox)";
  const url = buildCalendarUrl({ title: "Talk", description }, TAB);
  const details = paramsOf(url).get("details");
  assert.ok(!details.includes("<a href"), "no anchor emitted for a dangerous scheme");
  assert.ok(details.includes("[here](javascript:alert(1))"), "javascript: link kept literal");
  assert.ok(details.includes("[there](data:text/html,<b>x</b>)"), "data: link kept literal");
  assert.ok(details.includes("[x](vbscript:msgbox)"), "vbscript: link kept literal");
});

test("a mailto: link in the description still becomes an HTML anchor", () => {
  const url = buildCalendarUrl({ title: "Talk", description: "email [us](mailto:a@b.com)" }, TAB);
  assert.ok(paramsOf(url).get("details").includes('<a href="mailto:a@b.com">us</a>'));
});

test("bold markdown in the description becomes <b> (Calendar renders details as HTML)", () => {
  const url = buildCalendarUrl({ title: "Talk", description: "Featuring **Jane Doe** and **John**" }, TAB);
  assert.equal(paramsOf(url).get("details"), `${TAB.url}\n\nFeaturing <b>Jane Doe</b> and <b>John</b>`);
});

test("a stray/unmatched ** in the description is left untouched", () => {
  const url = buildCalendarUrl({ title: "Talk", description: "Price is 5 ** off today" }, TAB);
  assert.equal(paramsOf(url).get("details"), `${TAB.url}\n\nPrice is 5 ** off today`);
});

test("a bare/incomplete markdown link (no URL) is left untouched", () => {
  const url = buildCalendarUrl({ title: "Talk", description: "Sponsored by [Poalim Tech]" }, TAB);
  assert.equal(paramsOf(url).get("details"), `${TAB.url}\n\nSponsored by [Poalim Tech]`);
});

test("a short description is kept in full (no URL-length trimming)", () => {
  const description = "Bring food and friends.";
  const url = buildCalendarUrl({ title: "Picnic", description }, TAB);
  assert.equal(paramsOf(url).get("details"), `${TAB.url}\n\n${description}`);
});

test("a long description is trimmed so the whole URL fits the length cap", () => {
  const description = "x".repeat(6000);
  const url = buildCalendarUrl({ title: "Talk", description }, TAB);
  assert.ok(url.length <= 6000, `URL length ${url.length} exceeds the cap`);
  // only the trailing details field is shortened; the rest of the URL survives
  const details = paramsOf(url).get("details");
  assert.ok(details.startsWith(`${TAB.url}\n\n`), "details still begins with the source link");
  assert.ok(details.length < `${TAB.url}\n\n${description}`.length, "details was trimmed");
  // other fields are untouched
  assert.equal(paramsOf(url).get("text"), "Talk");
});

test("falls back to the tab title when no title was extracted", () => {
  const url = buildCalendarUrl({}, TAB);
  assert.equal(paramsOf(url).get("text"), "Tab Title");
});

test("dates: floating local time gets a 2-hour default duration", () => {
  assert.equal(formatDatesParam("2026-06-14T19:00:00", ""), "20260614T190000/20260614T210000");
});

test("dates: explicit offset is converted to exact UTC instants", () => {
  assert.equal(
    formatDatesParam("2026-06-14T19:00:00-04:00", "2026-06-14T21:00:00-04:00"),
    "20260614T230000Z/20260615T010000Z"
  );
});

test("dates: date-only becomes an all-day event (exclusive end)", () => {
  assert.equal(formatDatesParam("2026-06-14", ""), "20260614/20260615");
});

test("dates: an end before the start is ignored in favor of the default duration", () => {
  assert.equal(
    formatDatesParam("2026-06-14T19:00:00", "2026-06-14T18:00:00"),
    "20260614T190000/20260614T210000"
  );
});

test("ctz: passed through to the Calendar URL when the extractor sets it", () => {
  const url = buildCalendarUrl({ title: "Show", start: "2026-08-10T19:30:00", ctz: "GB" }, TAB);
  assert.equal(paramsOf(url).get("ctz"), "GB");
});

test("ctz: omitted when the extractor didn't set it", () => {
  const url = buildCalendarUrl({ title: "Show", start: "2026-08-10T19:30:00" }, TAB);
  assert.equal(paramsOf(url).get("ctz"), null);
});

test("dates: omitted entirely when no start was found", () => {
  assert.equal(formatDatesParam("", ""), "");
  const url = buildCalendarUrl({ title: "No date" }, TAB);
  assert.equal(paramsOf(url).get("dates"), null);
});

test("dates: eventLengthInMinutes used instead of default duration when end is missing", () => {
  assert.equal(formatDatesParam("2026-06-14T19:00:00", "", 90), "20260614T190000/20260614T203000");
});

test("dates: eventLengthInMinutes used instead of default duration when end is invalid", () => {
  assert.equal(formatDatesParam("2026-06-14T19:00:00", "bad", 45), "20260614T190000/20260614T194500");
});

test("dates: eventLengthInMinutes used instead of default duration when end is before start", () => {
  assert.equal(
    formatDatesParam("2026-06-14T19:00:00", "2026-06-14T18:00:00", 30),
    "20260614T190000/20260614T193000"
  );
});

test("dates: start derived from end minus eventLengthInMinutes when start is missing (floating)", () => {
  assert.equal(formatDatesParam("", "2026-06-14T21:00:00", 120), "20260614T190000/20260614T210000");
});

test("dates: start derived from end minus eventLengthInMinutes when start is missing (UTC offset)", () => {
  // end = 2026-06-14T21:00:00-04:00 = 2026-06-15T01:00:00Z; start = 01:00Z - 60min = 00:00Z
  assert.equal(
    formatDatesParam("", "2026-06-14T21:00:00-04:00", 60),
    "20260615T000000Z/20260615T010000Z"
  );
});

test("dates: omitted when both start and end are missing even with eventLengthInMinutes", () => {
  assert.equal(formatDatesParam("", "", 90), "");
});

test("dates: eventLengthInMinutes ignored for all-day events", () => {
  assert.equal(formatDatesParam("2026-06-14", "", 90), "20260614/20260615");
});

test("buildCalendarUrl: passes eventLengthInMinutes through to dates param", () => {
  const url = buildCalendarUrl(
    { title: "Workshop", start: "2026-06-14T10:00:00", eventLengthInMinutes: 90 },
    TAB
  );
  assert.equal(paramsOf(url).get("dates"), "20260614T100000/20260614T113000");
});

// --- Per-instance URL creation (the multi-instance times[] model) -----------
// A multi-instance event keeps its timing in times[]; buildCalendarUrl(event,
// tab, i) schedules the i-th instance. The `dates` param varies between instances,
// and so does `location` when an instance carries its own venue (a touring show);
// title/ctz/details come from the event and are identical.

// A film screened on three dates: an all-day showing, then two timed shows on a
// later day (the kind of set the Tel Aviv Cinematheque source produces).
const MULTI = {
  title: "Some Film",
  location: "Cinematheque",
  ctz: "Asia/Jerusalem",
  description: "A film.",
  times: [
    { start: "2026-06-18", end: null, eventLengthInMinutes: null },
    { start: "2026-06-19T16:30:00", end: null, eventLengthInMinutes: 90 },
    { start: "2026-06-19T20:30:00", end: "2026-06-19T22:30:00", eventLengthInMinutes: null },
  ],
};

test("instance 0: the all-day showing builds an all-day dates param", () => {
  assert.equal(paramsOf(buildCalendarUrl(MULTI, TAB, 0)).get("dates"), "20260618/20260619");
});

test("instance 1: the timed showing uses its own eventLengthInMinutes for the end", () => {
  assert.equal(paramsOf(buildCalendarUrl(MULTI, TAB, 1)).get("dates"), "20260619T163000/20260619T180000");
});

test("instance 2: the timed showing with an explicit end uses it", () => {
  assert.equal(paramsOf(buildCalendarUrl(MULTI, TAB, 2)).get("dates"), "20260619T203000/20260619T223000");
});

test("instance index defaults to the first instance", () => {
  assert.equal(
    paramsOf(buildCalendarUrl(MULTI, TAB)).get("dates"),
    paramsOf(buildCalendarUrl(MULTI, TAB, 0)).get("dates")
  );
});

test("every instance shares the event's non-time fields (only dates differ)", () => {
  const a = paramsOf(buildCalendarUrl(MULTI, TAB, 0));
  const b = paramsOf(buildCalendarUrl(MULTI, TAB, 2));
  for (const key of ["text", "ctz", "location", "details"]) assert.equal(a.get(key), b.get(key));
  assert.notEqual(a.get("dates"), b.get("dates"));
  assert.equal(a.get("ctz"), "Asia/Jerusalem");
});

test("an out-of-range instance index yields no dates param (no crash)", () => {
  // Defensive: selecting a non-existent instance falls back to the event's own
  // (absent) flat timing, so there's simply no date — never a throw.
  assert.equal(paramsOf(buildCalendarUrl(MULTI, TAB, 9)).get("dates"), null);
});

test("offset-bearing instances are each pinned to their own UTC instant", () => {
  const event = {
    title: "Tour",
    times: [
      { start: "2026-06-14T19:00:00-04:00", end: "2026-06-14T21:00:00-04:00" },
      { start: "2026-06-15T19:00:00-04:00", end: "2026-06-15T21:00:00-04:00" },
    ],
  };
  assert.equal(paramsOf(buildCalendarUrl(event, TAB, 0)).get("dates"), "20260614T230000Z/20260615T010000Z");
  assert.equal(paramsOf(buildCalendarUrl(event, TAB, 1)).get("dates"), "20260615T230000Z/20260616T010000Z");
});

// A touring show: each instance carries its OWN venue, so the location param is
// taken from the chosen instance (not the event level).
const TOUR = {
  title: "On Tour",
  location: "", // venues vary, so no event-level location
  times: [
    { start: "2026-09-04T20:00:00", location: "Paradiso, Amsterdam" },
    { start: "2026-09-11T20:00:00", location: "La Cigale, Paris" },
  ],
};

test("instance location: each instance's own venue fills the Calendar location param", () => {
  assert.equal(paramsOf(buildCalendarUrl(TOUR, TAB, 0)).get("location"), "Paradiso, Amsterdam");
  assert.equal(paramsOf(buildCalendarUrl(TOUR, TAB, 1)).get("location"), "La Cigale, Paris");
});

test("instance location: falls back to the event-level location when the instance has none", () => {
  const event = { title: "Series", location: "Town Hall", times: [{ start: "2026-09-04T20:00:00" }] };
  assert.equal(paramsOf(buildCalendarUrl(event, TAB, 0)).get("location"), "Town Hall");
});

test("instance location: an instance venue overrides the event-level location", () => {
  const event = {
    title: "Series",
    location: "Usual Hall",
    times: [{ start: "2026-09-04T20:00:00", location: "Special Annex" }],
  };
  assert.equal(paramsOf(buildCalendarUrl(event, TAB, 0)).get("location"), "Special Annex");
});

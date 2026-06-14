// Offline unit tests for pipeline/build-calendar-url.js's Google Calendar URL
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
    pathToFileURL(path.join(__dirname, "..", "..", "pipeline", "build-calendar-url.js"))
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
  assert.ok(url.length <= 4000, `URL length ${url.length} exceeds the cap`);
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

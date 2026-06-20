// The behavior change made on purpose: a single event's month is ONE card, even
// when one day has several showings. "Late Night Comedy Series" runs once on
// Jun 10, twice on Jun 11, and once on Jun 12 — all four showings sit in one
// unclickable June card (5.5) with no left icon (4.7), a button per showing
// (4.6). The two Jun 11 showings stay here as two buttons rather than peeling off
// into their own same-day card (4.5). Because the showings carry different times,
// each button is a TIME chip (date + time) so they're told apart (5.7.2): Jun 10
// and Jun 12 are single-time chips (5.3.1), and the two Jun 11 screenings carry a
// start AND end, so their buttons show the time RANGE (5.3.2). The showings are
// grouped by month (4.2). (Pressing a button to open that showing — 9.2 — is a
// behavior verified in test/unit/events-view-actions.test.js, not by this image.)
"use strict";

module.exports = {
  description:
    "One event's June showings in a single card: the day with two showings (Jun 11) keeps a button per showing next to the single-showing days (Jun 10, Jun 12) — never peeled into a separate card — with differing times making each button a date+time chip",
  requirements: {
    "4.2": "the four June showings group by month into one card",
    "4.5": "Jun 11's two showings stay as two buttons, not peeled into a separate card",
    "4.6": "the month card is a header over one button per showing",
    "4.7": "the grouped card has no single left calendar icon",
    "5.3.1": "Jun 10 and Jun 12 are single-time buttons showing just the time",
    "5.3.2": "Jun 11's two showings carry start+end, so their buttons show a time range",
    "5.5": "the grouped card is flat, not itself clickable, with no chevron",
    "5.7.2": "the showings' differing times make each button a date+time chip",
  },
  data: {
    supported: true,
    events: [
      {
        title: "Late Night Comedy Series",
        location: "The Stand, Tel Aviv",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-10T20:00:00", end: null },
          { start: "2026-06-11T18:00:00", end: "2026-06-11T20:00:00" },
          { start: "2026-06-11T21:00:00", end: "2026-06-11T23:00:00" },
          { start: "2026-06-12T18:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};

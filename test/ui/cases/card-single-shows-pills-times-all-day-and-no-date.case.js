// The single-card "feature" with all its variations in one image: a supported
// host (state 1 shows every event regardless of completeness, so the dateless one
// below renders). Five single cards, each earning its place by pinning different
// requirements; fed in shuffled order to prove cards sort chronologically.
//
//   E1 (2025, past)  — gray year pill (5.6.1); a long title that clamps to two
//                      lines + ellipsized location (5.8); a round-hour start whose
//                      :00 is dropped (6.1.1) shown as a start–end en-dash range
//                      (6.2.1); a UTC offset stripped to literal wall-clock (6.6).
//   E2 (2026, this year) — NO pill (5.6.3); a non-round time keeps its minutes (6.1.2).
//   E3 (2027, future) — green "upcoming" pill (5.6.2).
//   E6 (2026, this year) — an end not after its start is dropped, so just the
//                      single time shows (6.2.2).
//   E4 (all-day, multi-day) — a single instance spanning Sep 15–18 stays ONE
//                      single card, not split into buttons (4.8), and reads
//                      "All day" (6.3).
//   E5 (no date) — an unparseable/absent start shows no chip, just the title and
//                      "No date found" (6.4, 6.5).
//
// Because nothing overflows the height cap, there is no count label (8.3). Each
// card is one whole-surface click target with a trailing chevron (5.4). (The
// click itself — opening the template in an adjacent tab and closing the popup,
// 9.1/9.3 — is a behavior verified in test/unit/events-view-actions.test.js, not
// by this static image.)
"use strict";

module.exports = {
  description:
    "Single cards on a supported host: past→gray pill, this-year→no pill, future→green pill; round vs minute times, a start–end range, an all-day multi-day card, and a dateless card — all sorted chronologically with no count label",
  requirements: {
    "1.2": "events present, so the heading reads \"Add to Google Calendar\"",
    "4.1": "one card per event on the page",
    "4.4": "the single-showing and dateless cards are each a whole-card click target",
    "4.8": "E4 spans Sep 15–18 yet stays one single card, not split per day",
    "4.9": "the shuffled events render sorted chronologically",
    "5.1": "each card carries the calendar-chip \"addable event\" motif",
    "5.2": "the left indicator is a day chip (month banner over day-of-month)",
    "5.4": "a single card is elevated/tinted with a trailing \"›\" chevron",
    "5.6.1": "E1 (2025) is past → gray year pill",
    "5.6.2": "E3 (2027) is future → green year pill",
    "5.6.3": "E2 (this year) shows no pill",
    "5.8": "E1's long title clamps to two lines and its location ellipsizes",
    "6.1.1": "E3's round 9:00 hour drops its minutes (\"9 AM\")",
    "6.1.2": "E1's non-round 6:30 keeps its minutes",
    "6.2.1": "E1's start+end renders as an en-dash time range",
    "6.2.2": "E6's end equals its start, so it's dropped to a single time",
    "6.3": "E4 is date-only, so it reads \"All day\"",
    "6.4": "E5 has no parseable start, so it reads \"No date found\"",
    "6.5": "E5 shows no calendar chip (no usable date)",
    "6.6": "E1's -05:00 offset is shown as literal wall-clock, not re-zoned",
    "8.3": "the list fits unscrolled, so there is no count label",
  },
  data: {
    supported: true,
    // Deliberately out of chronological order — the render must sort them.
    events: [
      {
        title: "NYC Tech Mixer",
        start: "2026-06-25T18:30:00",
        location: "Devoción, Brooklyn",
      },
      {
        title: "Open Studios Festival",
        start: "2026-09-15",
        end: "2026-09-18",
        location: "Various venues, Brooklyn",
      },
      {
        title:
          "Brooklyn New Year's Eve Rooftop Bash with a Very Long Title That Wraps to Two Lines and Then Ellipsizes",
        start: "2025-12-31T21:00:00-05:00",
        end: "2026-01-01T01:00:00-05:00",
        location: "The Williamsburg Hotel Rooftop Bar, Brooklyn, New York",
      },
      {
        title: "Designers & Founders Summit",
        start: "2027-03-12T09:00:00",
        location: "Pioneer Works, Brooklyn",
      },
      {
        // End equals the start (not after it), so it's dropped: just "10 AM".
        title: "Neighborhood Office Hours",
        start: "2026-08-04T10:00:00",
        end: "2026-08-04T10:00:00",
        location: "Central Library, Grand Army Plaza",
      },
      {
        title: "Community Workshop (date to be announced)",
        location: "Central Library, Grand Army Plaza",
      },
    ],
  },
  listing: "none",
};

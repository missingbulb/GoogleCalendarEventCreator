// State 1 — supported host (a per-site source matched): show its events. A
// listing page yields several across different years, which exercises the year
// pill: a card in the current year (2026, the renderer's pinned reference)
// shows no year, while past (2025) and future (2027) cards get a year pill on
// top of the calendar icon.
//
// The Tech Mixer's times carry a UTC offset (-04:00, EDT) rather than a floating
// local time: its source didn't resolve a timezone, so the absolute offset
// survives to the card. The presentation-only floatLocal step in events-view.js
// strips it, so the card shows the page's wall-clock 6–9 PM, NOT the instant
// re-zoned to the renderer's timezone. The rendered pixels are therefore
// identical to the floating equivalent — and with MAX_DIFF_RATIO at 0, a
// regression that re-zoned it (e.g. 10 PM in UTC) would change them and fail.
"use strict";

module.exports = {
  description: "Supported host: events across past, current, and future years (off-year cards get a year pill); the current-year event's times carry a UTC offset shown as wall-clock",
  data: {
    supported: true,
    events: [
      {
        title: "Brooklyn New Year's Eve Bash 2025",
        start: "2025-12-31T21:00:00",
        end: "2026-01-01T01:00:00",
        location: "The Williamsburg Hotel Bar, Brooklyn",
      },
      {
        title: "NYC Tech Mixer 2026",
        start: "2026-06-25T18:00:00-04:00",
        end: "2026-06-25T21:00:00-04:00",
        location: "Devoción, Brooklyn",
      },
      {
        title: "Designers & Founders Summit 2027",
        start: "2027-03-12T09:00:00",
        location: "Pioneer Works, Brooklyn",
      },
    ],
  },
  listing: "none",
};

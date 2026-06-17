// THE year-pill feature, every variation in one image (single-occurrence cards).
// A card's left date chip carries a small year pill ONLY when its start year
// isn't the renderer's pinned current year (REFERENCE_YEAR = 2026): a PAST year
// gets a muted-gray pill, a FUTURE year a green "upcoming" pill, the current year
// none. One event per branch, so each earns its place — drop any and a pill state
// goes uncovered.
//
// Doubles as the single-card anatomy picture (left date chip + title over a muted
// "time · location" line + the trailing "tap to add" chevron) and the State-1
// frame (a supported host shows its events, no support link). The first title is
// long on purpose, to show a title wrapping to two lines.
"use strict";

module.exports = {
  description:
    "Off-year single cards get a year pill: a past year (2025) a gray pill, the current year (2026) none, a future year (2027) a green pill",
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
        title: "NYC Tech Mixer",
        start: "2026-06-25T18:00:00",
        end: "2026-06-25T21:00:00",
        location: "Devoción, Brooklyn",
      },
      {
        title: "Designers & Founders Summit",
        start: "2027-03-12T09:00:00",
        location: "Pioneer Works, Brooklyn",
      },
    ],
  },
  listing: "none",
};

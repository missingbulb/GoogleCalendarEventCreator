// A single day with three screenings of the same film: one same-day card whose
// icon is that date and whose buttons are the three times (the card itself isn't
// clickable — only the time buttons are).
module.exports = {
  description: "Same day, three screenings: one same-day card with a button per time",
  data: {
    supported: true,
    events: [
      {
        title: "The Left-Handed Girl",
        location: "Tel Aviv Cinematheque, רחוב הארבעה 5",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-19T13:00:00", end: null },
          { start: "2026-06-19T16:30:00", end: null },
          { start: "2026-06-19T20:00:00", end: null },
        ],
      },
    ],
  },
  listing: "none",
};

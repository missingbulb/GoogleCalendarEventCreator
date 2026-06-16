// A listing that mixes both card kinds: a plain single-occurrence event (the
// whole card clickable) alongside a multi-instance card (a film with two
// screenings on one day — only its inner time buttons are clickable). Shows how
// the two read together.
module.exports = {
  description: "A listing mixing a clickable single-occurrence card and an unclickable same-day card",
  data: {
    supported: true,
    events: [
      {
        title: "NYC Tech Mixer 2026",
        location: "The Williamsburg Hotel Bar, Brooklyn",
        times: [{ start: "2026-06-17T18:00:00", end: "2026-06-17T21:00:00" }],
      },
      {
        title: "Sophie Duker: Hot Beef Injection",
        location: "Pleasance Courtyard, Edinburgh",
        ctz: "GB",
        times: [
          { start: "2026-06-18T17:00:00", end: "2026-06-18T18:30:00" },
          { start: "2026-06-18T20:30:00", end: "2026-06-18T22:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};

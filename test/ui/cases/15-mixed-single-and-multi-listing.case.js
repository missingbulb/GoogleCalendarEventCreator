// A listing that mixes both card kinds: a plain single-occurrence event (a
// clickable card) alongside a multi-instance event (an unclickable card with a
// button per showing). Shows how the two read together in one list.
module.exports = {
  description: "A listing mixing a single-occurrence card and a multi-instance card",
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
          { start: "2026-06-18T20:30:00", end: "2026-06-18T22:00:00" },
          { start: "2026-06-19T20:30:00", end: "2026-06-19T22:00:00" },
          { start: "2026-06-20T20:30:00", end: "2026-06-20T22:00:00" },
        ],
      },
    ],
  },
  listing: "none",
};

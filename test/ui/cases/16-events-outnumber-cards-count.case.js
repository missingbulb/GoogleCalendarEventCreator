// The count cue counts EVENT INSTANCES, not cards: this list is 8 cards (all
// shown — well under the 31-card cap), but two of them are multi-instance, so it
// stands for more events than cards. Scrolled to the bottom, the list's last
// item reads "N events showing" with N = the total instances across every card,
// not the card count.
const { scrollToBottom } = require("../actions");

const single = (n, day) => ({
  title: `Community Meetup #${n}`,
  location: "Pioneer Works, Brooklyn",
  times: [{ start: `2026-06-${day}T18:00:00`, end: `2026-06-${day}T20:00:00` }],
});

module.exports = {
  description:
    "Count cue counts events, not cards: 8 cards (two multi-instance) -> more events than cards",
  data: {
    supported: true,
    events: [
      single(1, "10"),
      single(2, "11"),
      {
        title: "Sophie Duker: Hot Beef Injection",
        location: "Pleasance Courtyard, Edinburgh",
        ctz: "GB",
        times: [
          { start: "2026-06-12T20:30:00", end: "2026-06-12T22:00:00" },
          { start: "2026-06-13T20:30:00", end: "2026-06-13T22:00:00" },
          { start: "2026-06-14T20:30:00", end: "2026-06-14T22:00:00" },
        ],
      },
      single(3, "15"),
      single(4, "16"),
      {
        title: "The Left-Handed Girl (screenings)",
        location: "Tel Aviv Cinematheque",
        ctz: "Asia/Jerusalem",
        times: [
          { start: "2026-06-17", end: null },
          { start: "2026-06-19T16:30:00", end: null },
          { start: "2026-06-19T20:30:00", end: null },
        ],
      },
      single(5, "20"),
      single(6, "21"),
    ],
  },
  listing: "none",
  action: scrollToBottom,
};

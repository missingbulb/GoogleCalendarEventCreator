// The bottom count cue counts EVENT INSTANCES, not cards. The card cap is a layout
// limit, but the label sums showings — so a list with same-day cards reports MORE
// events than it has cards. Here six single-show meetups plus two films that each
// screen several times on ONE day (one same-day card each) make 8 cards but 13
// events; scrolled to the end, the list's last item reads "13 events showing" (no
// "show all" — every card is already shown, so the label is just a scroll cue).
// Doubles as the realistic mixed list: single cards interleaved with same-day cards.
"use strict";

const { scrollToBottom } = require("../actions");

const single = (n, day) => ({
  title: `Community Meetup #${n}`,
  location: "Pioneer Works, Brooklyn",
  times: [{ start: `2026-06-${day}T18:00:00`, end: `2026-06-${day}T20:00:00` }],
});

const screenings = (title, day, times) => ({
  title,
  location: "Tel Aviv Cinematheque",
  ctz: "Asia/Jerusalem",
  times: times.map((t) => ({ start: `2026-06-${day}T${t}:00`, end: null })),
});

module.exports = {
  description:
    "The count cue counts event instances, not cards: a mixed list of 8 cards (two of them same-day cards) holds 13 events, so the end reads '13 events showing'",
  data: {
    supported: true,
    events: [
      single(1, "10"),
      single(2, "11"),
      // Four screenings on Jun 12 -> one same-day card, four events.
      screenings("Poetry in the Bookstores", "12", ["11:00", "14:00", "17:00", "20:00"]),
      single(3, "13"),
      single(4, "15"),
      // Three screenings on Jun 16 -> one same-day card, three events.
      screenings("The Left-Handed Girl", "16", ["13:00", "16:30", "20:00"]),
      single(5, "18"),
      single(6, "19"),
    ],
  },
  listing: "none",
  action: scrollToBottom,
};

// Every card is shown but the list is taller than the cap, so the end carries a
// plain "N events showing" scroll cue — no "out of", no link (8.4) — and it counts
// EVENT INSTANCES, not cards (8.2): six single meetups plus two films that each
// screen four times on one day (a same-day card apiece) make 8 cards but 14
// instances, so the label reads "14 events showing". Scrolled to the bottom so the
// label (the list's last item, 8.1) is in view; at the bottom only the top fade
// shows (7.3).
"use strict";

const { scrollToBottom } = require("../actions");

const single = (n, day) => ({
  title: `Community Meetup #${n}`,
  start: `2026-06-${day}T18:00:00`,
  end: `2026-06-${day}T20:00:00`,
  location: "Pioneer Works, Brooklyn",
});

const screenings = (title, day, times) => ({
  title,
  location: "Tel Aviv Cinematheque",
  ctz: "Asia/Jerusalem",
  times: times.map((t) => ({ start: `2026-06-${day}T${t}:00`, end: null })),
});

module.exports = {
  description:
    "Eight cards (two of them same-day films of four screenings each) overflow the cap; scrolled to the bottom the end reads '14 events showing' — counting instances, not cards — with only the top edge faded",
  requirements: ["7.3", "8.1", "8.2", "8.4"],
  data: {
    supported: true,
    events: [
      single(1, "10"),
      single(2, "11"),
      single(3, "12"),
      screenings("Poetry in the Bookstores", "13", ["11:00", "14:00", "17:00", "20:00"]),
      single(4, "14"),
      single(5, "15"),
      screenings("The Left-Handed Girl", "16", ["13:00", "16:30", "18:00", "20:00"]),
      single(6, "17"),
    ],
  },
  listing: "none",
  action: scrollToBottom,
};
